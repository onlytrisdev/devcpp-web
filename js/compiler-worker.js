/**
 * Dev-C++ Web - Web Worker Compiler & WASI Execution Engine
 * Pure Client-side Clang & LLVM compiled to WebAssembly
 */

self.importScripts('../wasm/shared.js');

const DB_NAME = 'DevCPP_WasmCache_v1';
const STORE_NAME = 'wasm_files';

function openCacheDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedBuffer(key) {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function setCachedBuffer(key, buffer) {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(buffer, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

async function fetchWithProgress(url, name, onProgress) {
  const cached = await getCachedBuffer(name);
  if (cached) {
    if (onProgress) onProgress(name, 1, 1, true);
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || !total) {
    const buf = await response.arrayBuffer();
    await setCachedBuffer(name, buf);
    if (onProgress) onProgress(name, 1, 1, false);
    return buf;
  }

  const reader = response.body.getReader();
  let receivedLength = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (onProgress) onProgress(name, receivedLength, total, false);
  }

  const allChunks = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }

  const buffer = allChunks.buffer;
  await setCachedBuffer(name, buffer);
  return buffer;
}

let api = null;
let currentWasmModule = null;
let lastCapturedOutput = '';
let isInitialized = false;

// SharedArrayBuffer for real-time synchronous interactive STDIN I/O
let sharedBuffer = null;
let sharedControl = null;
let isInteractiveMode = true;
let isWaitingForInput = false;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function cleanProgramOutput(raw) {
  const plain = stripAnsi(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = plain.split('\n')
    .map(line => line.trimEnd())
    .filter(line => {
      const s = line.trim();
      if (s.startsWith('> ')) return false;
      if (/^\(\d+(\.\d+)?s(\/\d+(\.\d+)?s)?\)$/.test(s)) return false;
      return true;
    });
  return lines.join('\n').trim();
}

function parseDiagnostics(output, defaultFile = 'main.cpp') {
  const diagnostics = [];
  const lines = output.split('\n');
  const seenDiags = new Set();

  // Pattern: [filename]:[line]:[col]: [severity]: [message]
  const diagRegex = /^(?:<stdin>|([^:\r\n]+)):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.*)$/i;
  // Linker Pattern: wasm-ld: error: ...
  const linkerRegex = /^wasm-ld:\s*(error|warning):\s*(?:([a-zA-Z0-9_\-\.\/\\]+\.o):\s*)?(.*)$/i;
  const linkerRefRegex = />>>\s*referenced by\s+([^:\r\n]+):(\d+)(?::(\d+))?/i;

  let lastLinkerDiag = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const cleanLine = stripAnsi(rawLine).trim();
    if (!cleanLine) continue;

    // 1. Clang Compiler Diagnostics
    const match = cleanLine.match(diagRegex);
    if (match) {
      let file = match[1] || defaultFile;
      if (file === 'test.cc' || file === '<stdin>') file = defaultFile;
      // Normalize slashes and remove leading ./
      file = file.replace(/\\/g, '/').replace(/^\.\//, '');

      const line = Math.max(1, parseInt(match[2], 10) || 1);
      const col = Math.max(1, parseInt(match[3], 10) || 1);
      const rawSev = match[4].toLowerCase();
      const severity = (rawSev === 'warning') ? 'warning' : ((rawSev === 'note') ? 'note' : 'error');
      const message = match[5].trim();

      // Deduplicate identical errors (e.g. headers included across multiple units)
      const key = `${file}:${line}:${col}:${severity}:${message}`;
      if (!seenDiags.has(key)) {
        seenDiags.add(key);
        diagnostics.push({ file, line, col, severity, message, raw: rawLine });
      }
      continue;
    }

    // 2. wasm-ld Linker Diagnostics
    const linkMatch = cleanLine.match(linkerRegex);
    if (linkMatch) {
      let file = defaultFile;
      if (linkMatch[2]) {
        file = linkMatch[2].replace(/\.o$/, '.cpp').replace(/_/g, '/');
      }
      file = file.replace(/\\/g, '/').replace(/^\.\//, '');

      const diagObj = {
        file: file,
        line: 1,
        col: 1,
        severity: linkMatch[1].toLowerCase() === 'warning' ? 'warning' : 'error',
        message: linkMatch[3] ? linkMatch[3].trim() : cleanLine,
        raw: rawLine
      };
      diagnostics.push(diagObj);
      lastLinkerDiag = diagObj;
      continue;
    }

    // 3. Linker Reference Line (captures exact source line of undefined symbol)
    if (lastLinkerDiag) {
      const refMatch = cleanLine.match(linkerRefRegex);
      if (refMatch) {
        let refFile = refMatch[1].replace(/\\/g, '/').replace(/^\.\//, '');
        if (refFile.endsWith('.o')) refFile = refFile.replace(/\.o$/, '.cpp');
        lastLinkerDiag.file = refFile;
        lastLinkerDiag.line = Math.max(1, parseInt(refMatch[2], 10) || 1);
        lastLinkerDiag = null;
      }
    }
  }

  return diagnostics;
}

let isExecutingProgram = false;
let isInteractiveExecution = true;

const apiOptions = {
  async readBuffer(filename) {
    const name = filename.split('/').pop();
    const url = '../wasm/' + name;
    return await fetchWithProgress(url, name, (file, loaded, total, fromCache) => {
      self.postMessage({
        type: 'download_progress',
        file, loaded, total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 100,
        fromCache
      });
    });
  },

  async compileStreaming(filename) {
    const name = filename.split('/').pop();
    const url = '../wasm/' + name;
    const buf = await fetchWithProgress(url, name, (file, loaded, total, fromCache) => {
      self.postMessage({
        type: 'download_progress',
        file, loaded, total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 100,
        fromCache
      });
    });
    return WebAssembly.compile(buf);
  },

  hostWrite(s) {
    lastCapturedOutput += s;
    if (isExecutingProgram && isInteractiveExecution) {
      // True runtime program output (cout, printf) -> send to terminal
      // Filter out internal runner strings like '> test.wasm'
      const stripped = (s || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
      if (stripped.startsWith('> test.wasm') || stripped === 'test.wasm' || stripped === '>') return;
      self.postMessage({ type: 'stdout', text: s });
    } else if (!isExecutingProgram) {
      // Compiler/Linker build logs (clang, wasm-ld, sysroot) -> send to Compiler Log tab
      self.postMessage({ type: 'compiler_log', text: s });
    }
  },

  hostRead(memfs, fd, iovs, iovs_len, nread) {
    memfs.hostMem_.check();
    if (fd !== 0) return 0;

    if (!memfs.stdinBytes) {
      memfs.stdinBytes = new TextEncoder().encode(memfs.stdinStr || "");
      memfs.stdinBytesPos = 0;
    }

    // Check if stdin buffer has run out of bytes and interactive mode is enabled
    if (memfs.stdinBytesPos >= memfs.stdinBytes.length && memfs.isInteractive && sharedControl) {
      Atomics.store(sharedControl, 0, 0); // state 0 = waiting
      isWaitingForInput = true;
      self.postMessage({
        type: 'stdin_prompt',
        message: 'Program is waiting for input'
      });

      // Synchronously wait for main thread input (up to 10 min timeout)
      const waitRes = Atomics.wait(sharedControl, 0, 0, 600000);
      isWaitingForInput = false;
      const state = Atomics.load(sharedControl, 0);

      if (waitRes === 'ok' && state === 1) {
        const len = sharedControl[1];
        if (len > 0) {
          const localBytes = new Uint8Array(len);
          localBytes.set(new Uint8Array(sharedBuffer, 64, len));
          const newBytes = new Uint8Array(memfs.stdinBytes.length + localBytes.length);
          newBytes.set(memfs.stdinBytes);
          newBytes.set(localBytes, memfs.stdinBytes.length);
          memfs.stdinBytes = newBytes;
        }
        Atomics.store(sharedControl, 0, 0);
      } else if (state === 2) {
        // EOF / Abort
        Atomics.store(sharedControl, 0, 0);
      }
    }

    let size = 0;
    for (let i = 0; i < iovs_len; ++i) {
      const buf = memfs.hostMem_.read32(iovs);
      iovs += 4;
      const len = memfs.hostMem_.read32(iovs);
      iovs += 4;
      const lenToWrite = Math.min(len, (memfs.stdinBytes.length - memfs.stdinBytesPos));
      if (lenToWrite === 0) {
        break;
      }
      const dst = new Uint8Array(memfs.hostMem_.buffer, buf, lenToWrite);
      dst.set(memfs.stdinBytes.subarray(memfs.stdinBytesPos, memfs.stdinBytesPos + lenToWrite));
      size += lenToWrite;
      memfs.stdinBytesPos += lenToWrite;
      if (lenToWrite !== len) {
        break;
      }
    }
    memfs.hostMem_.write32(nread, size);
    return 0; // ESUCCESS
  },

  clang: 'clang',
  lld: 'lld',
  sysroot: 'sysroot.tar',
  memfs: 'memfs',
  showTiming: false
};

let currentObjectFiles = ['test.o'];

async function initCompiler() {
  if (isInitialized) return true;
  self.postMessage({ type: 'status', status: 'initializing', message: 'Khởi tạo môi trường WebAssembly Clang...' });
  try {
    api = new API(apiOptions);
    await api.ready;
    // Pre-warm clang and lld modules so first compile is instant
    self.postMessage({ type: 'status', status: 'initializing', message: 'Tải bộ biên dịch Clang...' });
    const clang = await api.getModule(api.clangFilename);
    self.postMessage({ type: 'status', status: 'initializing', message: 'Tải bộ liên kết LLD Linker...' });
    await api.getModule(api.lldFilename);

    // Precompile runtime helper object once for unbuffered stdout (real-time C/C++ console I/O)
    try {
      const runtimeCode = `#include <stdio.h>
extern "C" {
__attribute__((constructor)) void __devcpp_init_stdio(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
}
}
`;
      api.memfs.addFile('__devcpp_runtime.cc', runtimeCode);
      await api.run(clang, 'clang', '-cc1', '-emit-obj',
                    ...api.clangCommonArgs, '-O2', '-o', 'devcpp_runtime.o', '-x',
                    'c++', '__devcpp_runtime.cc');
      api.hasRuntimeObj = true;
    } catch (e) {
      console.warn('Failed to precompile devcpp_runtime.o:', e);
      api.hasRuntimeObj = false;
    }

    isInitialized = true;
    self.postMessage({ type: 'status', status: 'ready', message: 'Dev-C++ Compiler đã sẵn sàng!' });
    return true;
  } catch (err) {
    self.postMessage({ type: 'status', status: 'error', message: 'Lỗi khởi tạo: ' + err.message });
    throw err;
  }
}

function prepareMemFSDirectories(api, directories, filePaths) {
  const dirSet = new Set();

  if (Array.isArray(directories)) {
    for (const d of directories) {
      if (d && typeof d === 'string' && d !== '.') {
        dirSet.add(d.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''));
      }
    }
  }

  if (Array.isArray(filePaths)) {
    for (const p of filePaths) {
      const normalized = p.replace(/\\/g, '/').replace(/^\.\//, '');
      const parts = normalized.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirSet.add(parts.slice(0, i).join('/'));
      }
    }
  }

  const sortedDirs = Array.from(dirSet).sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    return depthA - depthB || a.localeCompare(b);
  });

  for (const dir of sortedDirs) {
    try {
      api.memfs.addDirectory(dir);
    } catch (e) {
      // Ignore if directory already exists
    }
  }

  return sortedDirs;
}

function buildIncludeArgs(directories) {
  const args = ['-I.'];
  if (Array.isArray(directories)) {
    for (const dir of directories) {
      if (dir && dir !== '.') {
        args.push(`-I${dir}`);
      }
    }
  }
  return args;
}

async function doCompile(optionsOrSource, optLevelArg = '2', filesArg = null) {
  if (!isInitialized) await initCompiler();
  lastCapturedOutput = '';
  self.postMessage({ type: 'status', status: 'compiling', message: 'Đang biên dịch C/C++...' });
  const start = performance.now();
  currentObjectFiles = [];

  // Parse arguments (supports both new options object and legacy arguments)
  let source = '';
  let filesData = null;
  let explicitDirs = [];
  let mainFile = 'main.cpp';
  let optLevel = '2';

  if (typeof optionsOrSource === 'object' && optionsOrSource !== null && !Array.isArray(optionsOrSource)) {
    source = optionsOrSource.source || '';
    filesData = optionsOrSource.files;
    explicitDirs = optionsOrSource.directories || [];
    mainFile = optionsOrSource.mainFile || 'main.cpp';
    optLevel = optionsOrSource.optLevel || '2';
  } else {
    source = typeof optionsOrSource === 'string' ? optionsOrSource : '';
    optLevel = optLevelArg || '2';
    filesData = filesArg;
  }

  try {
    const clang = await api.getModule(api.clangFilename);

    // 1. Normalize files into Array<{ path, content, isUnit }>
    const normalizedFiles = [];
    if (Array.isArray(filesData)) {
      for (const f of filesData) {
        if (!f || !f.path) continue;
        const normPath = f.path.replace(/\\/g, '/').replace(/^\.\//, '');
        normalizedFiles.push({
          path: normPath,
          content: f.content !== undefined ? f.content : '',
          isUnit: f.isUnit !== false
        });
      }
    } else if (filesData && typeof filesData === 'object') {
      for (const p in filesData) {
        const normPath = p.replace(/\\/g, '/').replace(/^\.\//, '');
        const isHeader = /\.(h|hpp|hxx|inl)$/i.test(normPath);
        normalizedFiles.push({
          path: normPath,
          content: filesData[p] || '',
          isUnit: !isHeader
        });
      }
    }

    // Ensure mainFile or active buffer is in normalizedFiles if source is provided
    if (source) {
      const existing = normalizedFiles.find(f => f.path === mainFile);
      if (existing) {
        existing.content = source;
      } else {
        normalizedFiles.unshift({ path: mainFile, content: source, isUnit: true });
      }
    }

    // If completely empty, fallback
    if (normalizedFiles.length === 0) {
      normalizedFiles.push({ path: 'main.cpp', content: source || '', isUnit: true });
    }

    // 2. Prepare MemFS directories
    const filePaths = normalizedFiles.map(f => f.path);
    const sortedDirs = prepareMemFSDirectories(api, explicitDirs, filePaths);

    // 3. Write all files to MemFS (headers + sources)
    for (const f of normalizedFiles) {
      api.memfs.addFile(f.path, f.content);
    }

    // 4. Construct include arguments (-I. -I${dir})
    const includeArgs = buildIncludeArgs(sortedDirs);

    // 5. Identify compilable units (.cpp, .c, .cc, .cxx with isUnit !== false)
    const unitsToCompile = normalizedFiles.filter(f => {
      if (!f.isUnit) return false;
      return /\.(cpp|cc|cxx|c)$/i.test(f.path);
    });

    // If no compilable unit was marked, fallback to mainFile
    if (unitsToCompile.length === 0) {
      const fallback = normalizedFiles.find(f => f.path === mainFile) || normalizedFiles[0];
      if (fallback) unitsToCompile.push(fallback);
    }

    // 6. Compile each unit to a separate .o object in MemFS root
    const objectFiles = [];
    let compileFailed = false;

    for (const unit of unitsToCompile) {
      const isC = /\.c$/i.test(unit.path);
      const lang = isC ? 'c' : 'c++';
      const objName = unit.path.replace(/\.[^.]+$/, '.o').replace(/[\/\\]/g, '_');

      try {
        await api.run(
          clang, 'clang', '-cc1', '-emit-obj',
          ...api.clangCommonArgs,
          ...includeArgs,
          `-O${optLevel}`,
          '-o', objName,
          '-x', lang,
          unit.path
        );

        if (!objectFiles.includes(objName)) {
          objectFiles.push(objName);
        }
      } catch (err) {
        compileFailed = true;
        // Stop on first failing unit
        break;
      }
    }

    currentObjectFiles = objectFiles;
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const cleanOut = stripAnsi(lastCapturedOutput);
    const diags = parseDiagnostics(cleanOut, mainFile);

    if (compileFailed) {
      return {
        success: false,
        timeSec: elapsed,
        diagnostics: diags,
        rawOutput: lastCapturedOutput,
        objectFiles: currentObjectFiles,
        error: 'Biên dịch thất bại với lỗi cú pháp.'
      };
    }

    return {
      success: true,
      timeSec: elapsed,
      diagnostics: diags,
      rawOutput: lastCapturedOutput,
      objectFiles: currentObjectFiles
    };
  } catch (e) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const cleanOut = stripAnsi(lastCapturedOutput);
    const diags = parseDiagnostics(cleanOut, mainFile);
    return {
      success: false,
      timeSec: elapsed,
      diagnostics: diags,
      error: e.message,
      rawOutput: lastCapturedOutput,
      objectFiles: currentObjectFiles
    };
  }
}

async function doLink(objectFiles = currentObjectFiles, mainFile = 'main.cpp') {
  lastCapturedOutput = '';
  self.postMessage({ type: 'status', status: 'linking', message: 'Đang liên kết (Linking)...' });
  const start = performance.now();
  try {
    if (!objectFiles || objectFiles.length === 0) {
      throw new Error('Không có file object (.o) nào để liên kết!');
    }

    await api.link(objectFiles, 'test.wasm');
    const wasmBuf = api.memfs.getFileContents('test.wasm');
    currentWasmModule = await WebAssembly.compile(wasmBuf);
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    return { success: true, timeSec: elapsed, rawOutput: lastCapturedOutput };
  } catch (e) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const cleanOut = stripAnsi(lastCapturedOutput);
    const diags = parseDiagnostics(cleanOut, mainFile);
    return {
      success: false,
      timeSec: elapsed,
      error: e.message,
      diagnostics: diags,
      rawOutput: lastCapturedOutput
    };
  }
}

async function doRun(stdinStr = '', isInteractive = true) {
  if (!currentWasmModule) {
    return { success: false, error: 'Chưa có chương trình được biên dịch. Hãy Compile trước!' };
  }
  lastCapturedOutput = '';
  isExecutingProgram = true;
  isInteractiveExecution = isInteractive;
  self.postMessage({ type: 'status', status: 'running', message: 'Đang thực thi chương trình...' });
  api.memfs.isInteractive = isInteractive && !!sharedControl;
  api.memfs.setStdinStr(stdinStr);
  const start = performance.now();
  let exitCode = 0;
  try {
    await api.run(currentWasmModule, 'test.wasm');
  } catch (e) {
    if (e.name === 'ProcExit' || (e.message && e.message.includes('process exited'))) {
      exitCode = e.code !== undefined ? e.code : 0;
    } else {
      exitCode = -1;
      self.postMessage({ type: 'stderr', text: `\nRuntime Exception: ${e.message}\n` });
    }
  } finally {
    isExecutingProgram = false;
  }
  const end = performance.now();
  const timeMs = Math.round(end - start);
  const timeSec = ((end - start) / 1000).toFixed(3);
  self.postMessage({ type: 'status', status: 'ready', message: `Hoàn tất (${timeSec}s)` });
  self.postMessage({ type: 'stdin_done' });
  return {
    success: true,
    exitCode,
    timeMs,
    timeSec,
    output: lastCapturedOutput
  };
}

async function doRunTestcases(optionsOrSource, testcasesArg = [], optLevelArg = '2', filesArg = null) {
  let testcases = [];
  let compileData = null;

  if (typeof optionsOrSource === 'object' && optionsOrSource !== null && !Array.isArray(optionsOrSource)) {
    compileData = optionsOrSource;
    testcases = optionsOrSource.testcases || testcasesArg || [];
  } else {
    compileData = {
      source: optionsOrSource,
      optLevel: optLevelArg,
      files: filesArg
    };
    testcases = testcasesArg || [];
  }

  // 1. Compile
  const compRes = await doCompile(compileData);
  if (!compRes.success) {
    self.postMessage({ type: 'status', status: 'ready', message: 'Biên dịch thất bại!' });
    return {
      type: 'testcases_complete',
      status: 'COMPILE_ERROR',
      diagnostics: compRes.diagnostics,
      rawOutput: compRes.rawOutput,
      results: []
    };
  }

  // 2. Link
  const linkRes = await doLink(compRes.objectFiles || currentObjectFiles, compileData.mainFile || 'main.cpp');
  if (!linkRes.success) {
    self.postMessage({ type: 'status', status: 'ready', message: 'Liên kết thất bại!' });
    return {
      type: 'testcases_complete',
      status: 'LINK_ERROR',
      diagnostics: linkRes.diagnostics,
      rawOutput: linkRes.rawOutput,
      results: []
    };
  }

  // 3. Run test cases in non-interactive batch mode
  const results = [];
  let passedCount = 0;
  for (let i = 0; i < testcases.length; i++) {
    const tc = testcases[i];
    self.postMessage({
      type: 'testcase_start',
      index: i,
      id: tc.id,
      name: tc.name || `Test #${i + 1}`
    });

    const runRes = await doRun(tc.input || '', false);
    // Clean and normalize output for comparison
    const normActual = cleanProgramOutput(runRes.output);
    const normExpected = cleanProgramOutput(tc.expected || '');
    const isPassed = (runRes.exitCode === 0 && normActual === normExpected);
    if (isPassed) passedCount++;

    const caseResult = {
      id: tc.id || (i + 1),
      name: tc.name || `Test #${i + 1}`,
      input: tc.input || '',
      expected: tc.expected || '',
      actual: normActual,
      rawOutput: runRes.output || '',
      exitCode: runRes.exitCode,
      timeMs: runRes.timeMs,
      passed: isPassed,
      status: isPassed ? 'AC' : (runRes.exitCode !== 0 ? 'RTE' : 'WA')
    };
    results.push(caseResult);
    self.postMessage({ type: 'testcase_done', result: caseResult, index: i });
  }

  self.postMessage({ type: 'status', status: 'ready', message: `Test hoàn tất (${passedCount}/${testcases.length})` });
  return {
    type: 'testcases_complete',
    status: passedCount === testcases.length ? 'ALL_PASSED' : 'SOME_FAILED',
    passedCount,
    totalCount: testcases.length,
    results
  };
}

self.onmessage = async (event) => {
  const { id, action, data } = event.data;

  try {
    switch (action) {
      case 'init': {
        await initCompiler();
        self.postMessage({ id, success: true });
        break;
      }

      case 'init_sab': {
        sharedBuffer = data.buffer;
        sharedControl = new Int32Array(sharedBuffer, 0, 16);
        self.postMessage({ id, type: 'sab_ready', success: true });
        break;
      }

      case 'compile': {
        const compRes = await doCompile(data);
        if (!compRes.success) {
          currentWasmModule = null;
          self.postMessage({ id, action: 'compile', success: false, step: 'compile', ...compRes });
          break;
        }
        const linkRes = await doLink(compRes.objectFiles || currentObjectFiles, data.mainFile || 'main.cpp');
        if (!linkRes.success) {
          currentWasmModule = null;
          self.postMessage({ id, action: 'compile', success: false, step: 'link', ...linkRes });
          break;
        }
        const totalSec = (parseFloat(compRes.timeSec) + parseFloat(linkRes.timeSec)).toFixed(2);
        self.postMessage({
          id,
          action: 'compile',
          success: true,
          timeSec: totalSec,
          diagnostics: compRes.diagnostics,
          rawOutput: compRes.rawOutput + '\n' + linkRes.rawOutput
        });
        break;
      }

      case 'link': {
        const res = await doLink(data && data.objectFiles ? data.objectFiles : currentObjectFiles, data && data.mainFile ? data.mainFile : 'main.cpp');
        self.postMessage({ id, ...res });
        break;
      }

      case 'run': {
        if (!currentWasmModule) {
          self.postMessage({
            id,
            action: 'run',
            success: false,
            notCompiled: true,
            error: 'Chưa biên dịch dự án, vui lòng nhấn F9 hoặc F11 để dịch trước'
          });
          break;
        }
        const res = await doRun(data.stdin || '', data.interactive !== false);
        self.postMessage({ id, action: 'run', ...res });
        break;
      }

      case 'compileAndRun': {
        const compRes = await doCompile(data);
        if (!compRes.success) {
          currentWasmModule = null;
          self.postMessage({ id, action: 'compileAndRun', step: 'compile', success: false, ...compRes });
          return;
        }
        const linkRes = await doLink(compRes.objectFiles || currentObjectFiles, data.mainFile || 'main.cpp');
        if (!linkRes.success) {
          currentWasmModule = null;
          self.postMessage({ id, action: 'compileAndRun', step: 'link', success: false, ...linkRes });
          return;
        }
        self.postMessage({ id, action: 'compileAndRun', step: 'ready_to_run' });
        const runRes = await doRun(data.stdin || '', data.interactive !== false);
        self.postMessage({ id, action: 'compileAndRun', step: 'run', success: true, ...runRes });
        break;
      }

      case 'runTestcases': {
        const res = await doRunTestcases(data);
        self.postMessage({ id, ...res });
        break;
      }

      default:
        self.postMessage({ id, success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message, stack: err.stack });
  }
};
