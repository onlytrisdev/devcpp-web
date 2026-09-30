/**
 * Dev-C++ Web Edition - Main Application Controller
 */

// Global State
let editor = null;
window.editor = null;
let term = null;
let fitAddon = null;
let compilerWorker = null;
let currentTestcases = [];
let isBusy = false;
let isFirstLoad = true;

// Real-time Interactive STDIN state & SharedArrayBuffer
let sharedBuffer = null;
let sharedControl = null;
let sharedData = null;
let isProgramRunning = false;
let isWaitingForInput = false;
let termInputBuffer = '';

// Multi-file Workspace state
let workspaceFiles = {
  'main.cpp': ''
};
let activeFile = 'main.cpp';

// Backward Compatibility ID Alias Hook
const _origGetElementById = document.getElementById.bind(document);
document.getElementById = function(id) {
  if (id === 'right-pane') {
    return _origGetElementById('devcpp-bottom-dock') || _origGetElementById('right-pane');
  }
  if (id === 'splitter') {
    return _origGetElementById('splitter-bottom') || _origGetElementById('splitter');
  }
  if (id === 'log-table') {
    return _origGetElementById('error-list-table') || _origGetElementById('log-table');
  }
  if (id === 'error-list-body') {
    return _origGetElementById('log-table-body');
  }
  return _origGetElementById(id);
};

let isWaitingToClose = false;
window.isWaitingToClose = false;

// Binary Compilation & Stale State Tracking (Milestone 3 / Feature F19)
window.hasCompiledBinary = false;
window.isBinaryStale = true;
window.useNativeAlert = false;
let isProgrammaticEditorChange = false;
let isOverwriteMode = false;

// Menubar State Tracking & Management (Milestone 3 / Feature F18)
let isMenuOpen = false;
window.isMenuOpen = false;

function closeAllComboMenus() {
  document.querySelectorAll('.devcpp-combo-wrapper.open').forEach((w) => w.classList.remove('open'));
}
window.closeAllComboMenus = closeAllComboMenus;

function closeAllMenus() {
  document.querySelectorAll('.menu-item-wrap.open').forEach((w) => w.classList.remove('open'));
  isMenuOpen = false;
  window.isMenuOpen = false;
}
window.closeAllMenus = closeAllMenus;

// DOM Elements
const elStatusDot = document.getElementById('status-dot');
const elStatusText = document.getElementById('status-text');
const elCursorPos = document.getElementById('cursor-pos');
const elStdinInput = document.getElementById('stdin-input');
const elTestcasesList = document.getElementById('testcases-list');
const elTestSummaryStats = document.getElementById('test-summary-stats');
const elTestBadge = document.getElementById('test-badge');
const elLogBadge = document.getElementById('log-badge');
const elLogTableBody = document.getElementById('log-table-body');
const elRawLogOutput = document.getElementById('raw-log-output');
const elSplashOverlay = document.getElementById('splash-overlay');
const elSplashProgressBar = document.getElementById('splash-progress-bar');
const elSplashStatusText = document.getElementById('splash-status-text');
const elTemplateSelect = document.getElementById('select-template');
const elThemeSelect = document.getElementById('select-theme');
const elLangSelect = document.getElementById('select-language');
const elFontSizeSelect = document.getElementById('select-fontsize');

// New Toolbar & Terminal Interactive Elements
const elEditorTabList = document.getElementById('editor-tab-list');
const elBtnAddFile = document.getElementById('btn-add-file');
const elBtnFormat = document.getElementById('btn-format');
const elTerminalInputBar = document.getElementById('terminal-input-bar');
const elTerminalInteractiveInput = document.getElementById('terminal-interactive-input');
const elBtnSendInput = document.getElementById('btn-send-input');
const elBtnInputEof = document.getElementById('btn-input-eof');
const elInputStatusTag = document.getElementById('input-status-tag');
const elBtnCopyTerm = document.getElementById('btn-copy-term');

/**
 * DevCPPAStyle - Pure JavaScript C/C++ Code Formatter in Authentic Allman Style (Feature F20)
 */
const DevCPPAStyle = {
  format(code, options = {}) {
    if (!code || typeof code !== 'string') return '';
    const indentSize = options.indentSize || 4;
    const indentStr = options.indentSpaces !== false ? ' '.repeat(indentSize) : '\t';

    let normalized = '';
    let i = 0;
    const n = code.length;

    let inString = false;
    let stringChar = '';
    let inRawString = false;
    let rawDelim = '';
    let inLineComment = false;
    let inBlockComment = false;

    while (i < n) {
      const c = code[i];
      const next = i + 1 < n ? code[i + 1] : '';

      // 1. Inside Raw String Literal: R"delim(...)delim"
      if (inRawString) {
        normalized += c;
        if (c === ')' && code.slice(i + 1, i + 1 + rawDelim.length + 1) === rawDelim + '"') {
          normalized += code.slice(i + 1, i + 1 + rawDelim.length + 1);
          i += rawDelim.length + 1;
          inRawString = false;
        }
        i++;
        continue;
      }

      // 2. Inside Standard String or Char Literal
      if (inString) {
        normalized += c;
        if (c === '\\') {
          if (i + 1 < n) {
            normalized += code[i + 1];
            i += 2;
            continue;
          }
        } else if (c === stringChar) {
          inString = false;
        }
        i++;
        continue;
      }

      // 3. Inside Single-line Comment
      if (inLineComment) {
        normalized += c;
        if (c === '\n') inLineComment = false;
        i++;
        continue;
      }

      // 4. Inside Block Comment
      if (inBlockComment) {
        normalized += c;
        if (c === '*' && next === '/') {
          normalized += '/';
          i += 2;
          inBlockComment = false;
          continue;
        }
        i++;
        continue;
      }

      // 5. Detect Start of Raw String: R"delim(
      if (c === 'R' && next === '"') {
        const rawMatch = code.slice(i).match(/^R"([a-zA-Z0-9_]*)\(/);
        if (rawMatch) {
          rawDelim = rawMatch[1];
          inRawString = true;
          normalized += rawMatch[0];
          i += rawMatch[0].length;
          continue;
        }
      }

      // 6. Detect Start of Normal String or Char
      if (c === '"' || c === "'") {
        inString = true;
        stringChar = c;
        normalized += c;
        i++;
        continue;
      }

      // 7. Detect Comments
      if (c === '/' && next === '/') {
        inLineComment = true;
        normalized += '//';
        i += 2;
        continue;
      }
      if (c === '/' && next === '*') {
        inBlockComment = true;
        normalized += '/*';
        i += 2;
        continue;
      }

      // 8. Opening Brace '{' (Allman Style Separation)
      if (c === '{') {
        let isInlineInit = false;
        if (normalized.trimEnd().endsWith('=')) {
          const restOfLine = code.slice(i, code.indexOf('\n', i) !== -1 ? code.indexOf('\n', i) : undefined);
          if (/^\{[^\n]*\};/.test(restOfLine)) {
            isInlineInit = true;
          }
        }

        if (isInlineInit) {
          const semiIdx = code.indexOf(';', i);
          if (semiIdx !== -1) {
            normalized += code.slice(i, semiIdx + 1);
            i = semiIdx + 1;
            continue;
          }
        }

        let p = normalized.length - 1;
        let hasPrecedingNonWs = false;
        while (p >= 0 && normalized[p] !== '\n') {
          if (!/\s/.test(normalized[p])) {
            hasPrecedingNonWs = true;
            break;
          }
          p--;
        }

        if (hasPrecedingNonWs) {
          normalized = normalized.trimEnd() + '\n{';
        } else {
          normalized += '{';
        }

        let k = i + 1;
        let hasSubsequentNonWs = false;
        while (k < n && code[k] !== '\n') {
          if (!/\s/.test(code[k])) {
            hasSubsequentNonWs = true;
            break;
          }
          k++;
        }
        if (hasSubsequentNonWs) {
          normalized += '\n';
        }
        i++;
        continue;
      }

      // 9. Closing Brace '}' (Allman Style Separation)
      if (c === '}') {
        let p = normalized.length - 1;
        let hasPrecedingNonWs = false;
        while (p >= 0 && normalized[p] !== '\n') {
          if (!/\s/.test(normalized[p])) {
            hasPrecedingNonWs = true;
            break;
          }
          p--;
        }
        if (hasPrecedingNonWs) {
          normalized = normalized.trimEnd() + '\n}';
        } else {
          normalized += '}';
        }

        let k = i + 1;
        while (k < n && (code[k] === ' ' || code[k] === '\t')) k++;
        if (k < n && code[k] !== '\n' && code[k] !== ';' && code[k] !== ',' && code[k] !== ')') {
          normalized += '\n';
        }
        i++;
        continue;
      }

      normalized += c;
      i++;
    }

    // Phase 2: Indentation Pass
    const rawLines = normalized.split(/\r?\n/);
    let currentIndent = 0;
    const output = [];
    let inMultiComment = false;

    for (let l = 0; l < rawLines.length; l++) {
      const line = rawLines[l];
      const trimmed = line.trim();

      if (inMultiComment) {
        output.push(line);
        if (trimmed.includes('*/')) inMultiComment = false;
        continue;
      }

      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inMultiComment = true;
        output.push(indentStr.repeat(currentIndent) + trimmed);
        continue;
      }

      if (trimmed === '') {
        if (output.length > 0 && output[output.length - 1] === '') {
          // skip duplicate blank
        } else {
          output.push('');
        }
        continue;
      }

      if (trimmed.startsWith('#')) {
        output.push(trimmed);
        continue;
      }

      if (trimmed.startsWith('}')) {
        currentIndent = Math.max(0, currentIndent - 1);
      }

      let lineIndent = currentIndent;
      if (trimmed.startsWith('case ') || trimmed.startsWith('default:')) {
        lineIndent = Math.max(0, currentIndent - 1);
      }

      output.push(indentStr.repeat(Math.max(0, lineIndent)) + trimmed);

      if (trimmed.startsWith('{')) {
        currentIndent++;
      }
    }

    while (output.length > 0 && output[0] === '') output.shift();
    while (output.length > 0 && output[output.length - 1] === '') output.pop();
    return output.join('\n') + '\n';
  }
};
window.DevCPPAStyle = DevCPPAStyle;

// ==========================================
// Sunken Beveled Status Bar panels (7 Panels)
// ==========================================
function updateStatusBarInfo() {
  if (!editor) return;
  const pos = editor.getPosition();
  if (elCursorPos) {
    if (activeFile && pos) {
      elCursorPos.innerText = `Line: ${pos.lineNumber}, Col: ${pos.column}`;
    } else {
      elCursorPos.innerText = `Line: -, Col: -`;
    }
  }

  // Panel 3: File Path
  const elFilePath = document.getElementById('editor-file-path');
  if (elFilePath) {
    if (activeFile) {
      const projName = (window.vfs && window.vfs.project && window.vfs.project.name) ? window.vfs.project.name : 'Project1';
      elFilePath.innerText = `${projName}\\${activeFile.replace(/\//g, '\\')}`;
      elFilePath.title = `${projName}\\${activeFile.replace(/\//g, '\\')}`;
    } else {
      elFilePath.innerText = `-`;
      elFilePath.title = window.I18N ? window.I18N.t('status_no_file') : 'No file open';
    }
  }

  // Panel 4: Encoding & Document Info
  const elEncoding = document.getElementById('editor-encoding');
  if (elEncoding) {
    const encSpan = elEncoding.querySelector('span:first-child') || elEncoding;
    encSpan.innerText = 'UTF-8';
  }
  const model = editor.getModel();
  if (model) {
    const elLines = document.getElementById('editor-lines');
    const elLen = document.getElementById('editor-length');
    if (elLines) elLines.innerText = `Lines: ${model.getLineCount()}`;
    if (elLen) elLen.innerText = `Length: ${model.getValueLength()}`;
  }

  // Panel 7: Compiler Profile
  const elStatusCompiler = document.getElementById('status-compiler');
  const elSelectCompiler = document.getElementById('select-compiler');
  if (elStatusCompiler && elSelectCompiler) {
    elStatusCompiler.innerText = elSelectCompiler.value === 'tdm32' ? 'TDM-GCC 4.9.2 32-bit' : 'TDM-GCC 4.9.2 64-bit';
  }
}
window.updateStatusBarInfo = updateStatusBarInfo;

// ==========================================
// 1. Initialize Monaco Editor
// ==========================================
function initMonaco() {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

  require(['vs/editor/editor.main'], function () {
    window.monaco = monaco;
    // Register Authentic Dev-C++ 5.11 Monaco Syntax Theme
    monaco.editor.defineTheme('devcpp-classic', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '000080', fontStyle: 'bold' },
        { token: 'keyword.directive', foreground: '008000', fontStyle: 'bold' },
        { token: 'keyword.directive.include', foreground: '008000', fontStyle: 'bold' },
        { token: 'string', foreground: '800000' },
        { token: 'string.escape', foreground: '800080' },
        { token: 'number', foreground: '0000ff' },
        { token: 'comment', foreground: '0000ff', fontStyle: 'italic' },
        { token: 'type', foreground: '000080', fontStyle: 'bold' },
        { token: 'delimiter', foreground: '000000' },
        { token: 'operator', foreground: '000000' },
        { token: 'identifier', foreground: '000000' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#808080',
        'editorLineNumber.activeForeground': '#000000',
        'editorGutter.background': '#f0f0f0',
        'editorCursor.foreground': '#000000',
        'editor.selectionBackground': '#3399ff',
        'editor.inactiveSelectionBackground': '#b5d5ff',
        'editor.selectionHighlightBackground': '#e5ebf1'
      }
    });

    const activeVfsNode = window.vfs ? window.vfs.getActiveFile() : null;
    const savedCode = localStorage.getItem('devcpp_saved_code');
    const initialCode = activeVfsNode ? (activeVfsNode.content || '') : (savedCode || CODE_TEMPLATES[0].code);
    const initialTheme = elThemeSelect && elThemeSelect.value === 'classic' ? 'devcpp-classic' : 'vs-dark';

    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
      value: initialCode,
      language: (activeVfsNode && activeVfsNode.name.endsWith('.c')) ? 'c' : 'cpp',
      theme: initialTheme,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      automaticLayout: true,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      roundedSelection: false,
      contextmenu: true,
      tabSize: 4,
      insertSpaces: true,
      bracketPairColorization: { enabled: true },
      mouseWheelZoom: true
    });
    window.editor = editor;

    // Zoom Keyboard Shortcuts: Ctrl + '+' / '=', Ctrl + '-', Ctrl + '0'
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
      const cur = editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
      editor.updateOptions({ fontSize: Math.min(cur + 1, 36) });
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
      const cur = editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
      editor.updateOptions({ fontSize: Math.max(cur - 1, 9) });
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => {
      editor.updateOptions({ fontSize: 14 });
    });

    // Register DevCPPAStyle Allman Document Formatting Provider
    if (monaco.languages && typeof monaco.languages.registerDocumentFormattingEditProvider === 'function') {
      const formattingProvider = {
        provideDocumentFormattingEdits(model, options, token) {
          const code = model.getValue();
          const formatted = window.DevCPPAStyle.format(code, {
            indentSize: options.tabSize || 4,
            indentSpaces: options.insertSpaces !== false
          });
          return [{
            range: model.getFullModelRange(),
            text: formatted
          }];
        }
      };
      monaco.languages.registerDocumentFormattingEditProvider('cpp', formattingProvider);
      monaco.languages.registerDocumentFormattingEditProvider('c', formattingProvider);
    }

    // Cursor position listener
    editor.onDidChangeCursorPosition(updateStatusBarInfo);

    // Auto-save on change & update status bar lines/length
    editor.onDidChangeModelContent(() => {
      const val = editor.getValue();
      if (activeFile) {
        if (window.vfs) {
          window.vfs.setFileContentInMemory(activeFile, val);
        }
        workspaceFiles[activeFile] = val;
        localStorage.setItem('devcpp_saved_code', val);
      }
      updateStatusBarInfo();

      if (!isProgrammaticEditorChange) {
        window.isBinaryStale = true;
      }
      if (typeof updateWindowTitle === 'function') {
        updateWindowTitle();
      }
    });

    updateStatusBarInfo();

    // Custom Dev-C++ shortcuts inside Monaco
    editor.addCommand(monaco.KeyCode.F9, () => handleCompile());
    editor.addCommand(monaco.KeyCode.F10, () => handleRun());
    editor.addCommand(monaco.KeyCode.F11, () => handleCompileAndRun());
    editor.addCommand(monaco.KeyCode.F12, () => handleRebuild());
    editor.addCommand(monaco.KeyCode.F8, () => handleRunTests());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handleSave());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => handleSaveAll());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => handleFind());
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => formatCode());
    editor.addCommand(monaco.KeyCode.Insert, () => toggleInsertMode());

    // Initialize workspace tabs and templates
    initMultiTabs();
    currentTestcases = JSON.parse(JSON.stringify(CODE_TEMPLATES[0].testcases || []));
    renderTestcasesUI();
  });
}

// ==========================================
// 2. Initialize xterm.js Console
// ==========================================
function initTerminal() {
  term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontFamily: "'Consolas', 'Courier New', monospace",
    fontSize: 14,
    lineHeight: 1.2,
    convertEol: true,
    theme: {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selectionBackground: '#3399ff',
      black: '#000000',
      red: '#c00000',
      green: '#00c000',
      yellow: '#c0c000',
      blue: '#0000c0',
      magenta: '#c000c0',
      cyan: '#00c0c0',
      white: '#ffffff',
      brightBlack: '#808080',
      brightRed: '#ff0000',
      brightGreen: '#00ff00',
      brightYellow: '#ffff00',
      brightBlue: '#0000ff',
      brightMagenta: '#ff00ff',
      brightCyan: '#00ffff',
      brightWhite: '#ffffff'
    }
  });

  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('xterm-container'));
  fitAddon.fit();

  window.addEventListener('resize', () => {
    if (fitAddon) fitAddon.fit();
  });

  // Real-time typed ahead input queue
  window.queuedStdinLines = [];

  // Direct interactive typing into xterm.js
  term.onData((data) => {
    // 1. Close-on-key after process termination
    if (window.isWaitingToClose || (window.cmdWindow && window.cmdWindow.isWaitingToClose)) {
      window.isWaitingToClose = false;
      if (window.cmdWindow) window.cmdWindow.isWaitingToClose = false;
      window.closeCmdWindow();
      return;
    }

    // Only accept keystrokes when program is running or actively waiting for input
    if (!isProgramRunning && !isWaitingForInput) {
      return;
    }

    // Multi-character input (pasted text or rapid input)
    if (data.length > 1) {
      for (let i = 0; i < data.length; i++) {
        const ch = data[i];
        if (ch === '\r' || ch === '\n') {
          const line = termInputBuffer;
          termInputBuffer = '';
          term.write('\r\n');
          sendStdinLine(line, true);
        } else if (ch === '\u007F' || ch === '\b') {
          if (termInputBuffer.length > 0) {
            termInputBuffer = termInputBuffer.slice(0, -1);
            term.write('\b \b');
          }
        } else if (ch >= ' ' || ch === '\t') {
          termInputBuffer += ch;
          term.write(ch);
        }
      }
      return;
    }

    // Enter key (Carriage Return or Newline)
    if (data === '\r' || data === '\n') {
      const line = termInputBuffer;
      termInputBuffer = '';
      if (elTerminalInteractiveInput) {
        elTerminalInteractiveInput.value = '';
      }
      term.write('\r\n');
      sendStdinLine(line, true);
      return;
    }

    // Backspace
    if (data === '\u007F' || data === '\b') {
      if (termInputBuffer.length > 0) {
        termInputBuffer = termInputBuffer.slice(0, -1);
        term.write('\b \b');
        if (elTerminalInteractiveInput) {
          elTerminalInteractiveInput.value = termInputBuffer;
        }
      }
      return;
    }

    // Ctrl+C (Interrupt / Stop)
    if (data === '\u0003') {
      handleStop();
      return;
    }

    // Ctrl+D (EOF)
    if (data === '\u0004') {
      sendStdinEOF();
      return;
    }

    // Printable characters
    if (data >= ' ' || data === '\t') {
      termInputBuffer += data;
      term.write(data);
      if (elTerminalInteractiveInput) {
        elTerminalInteractiveInput.value = termInputBuffer;
      }
    }
  });

  // Attach custom key handler so Dev-C++ shortcuts work directly inside xterm without escape garbage
  term.attachCustomKeyEventHandler((e) => {
    if (e.type === 'keydown') {
      if (e.key === 'F9') { handleCompile(); return false; }
      if (e.key === 'F10') { handleRun(); return false; }
      if (e.key === 'F11') { handleCompileAndRun(); return false; }
      if (e.key === 'F8') { handleRunTests(); return false; }
      if (e.ctrlKey && e.key === 's') { handleSave(); return false; }
    }
    return true;
  });

  // Click on console wrapper to focus xterm
  const termWrapper = document.getElementById('terminal-wrapper') || document.querySelector('.terminal-wrapper');
  if (termWrapper) {
    termWrapper.addEventListener('click', () => {
      if (term) term.focus();
    });
  }

  // Global keydown listener for Close-on-Key even if xterm blurred
  document.addEventListener('keydown', (e) => {
    if (window.isWaitingToClose || (window.cmdWindow && window.cmdWindow.isWaitingToClose)) {
      if (e.key.startsWith('F') && e.key.length > 1) return;
      e.preventDefault();
      e.stopPropagation();
      window.isWaitingToClose = false;
      if (window.cmdWindow) window.cmdWindow.isWaitingToClose = false;
      window.closeCmdWindow();
    }
  }, true);

  printBanner();
}

function printBanner() {
  if (term) term.clear();
}

function initSharedBuffer() {
  if (typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated) {
    try {
      sharedBuffer = new SharedArrayBuffer(65536);
      sharedControl = new Int32Array(sharedBuffer, 0, 16);
      sharedData = new Uint8Array(sharedBuffer, 64);
      return true;
    } catch (e) {
      console.warn('SharedArrayBuffer initialization failed:', e);
    }
  }
  return false;
}

function setWaitingInputState(waiting) {
  isWaitingForInput = waiting;
  window.isWaitingForInput = waiting;

  const panelConsole = document.getElementById('panel-console');
  if (panelConsole) {
    panelConsole.setAttribute('data-waiting', waiting ? 'true' : 'false');
  }

  const statusChip = document.getElementById('term-status-chip');
  const statusLabel = document.getElementById('term-status-label');

  if (waiting) {
    // If user already typed ahead some lines, immediately fulfill the request!
    if (window.queuedStdinLines && window.queuedStdinLines.length > 0) {
      const line = window.queuedStdinLines.shift();
      sendStdinLine(line, true);
      return;
    }

    if (statusChip) {
      statusChip.className = 'term-status-chip waiting';
    }
    if (statusLabel) {
      statusLabel.innerText = window.I18N ? window.I18N.t('status_waiting_input_short') : 'Waiting for input... (Type & Enter)';
    }

    // Direct terminal focus so user types immediately
    if (term) {
      term.focus();
    }

    // Compatibility update for legacy elements/tests
    if (elTerminalInputBar) {
      elTerminalInputBar.classList.add('waiting-input');
    }
    if (elTerminalInteractiveInput) {
      elTerminalInteractiveInput.value = '';
    }
    updateStatus('running', window.I18N ? window.I18N.t('status_waiting_input_console') : 'Waiting for keyboard input in Console...');
  } else {
    if (statusChip) {
      statusChip.className = isProgramRunning ? 'term-status-chip running' : 'term-status-chip ready';
    }
    if (statusLabel) {
      statusLabel.innerText = isProgramRunning
        ? (window.I18N ? window.I18N.t('status_console_running') : 'Running...')
        : (window.I18N ? window.I18N.t('status_console_ready') : 'Console Ready');
    }
    if (elTerminalInputBar) {
      elTerminalInputBar.classList.remove('waiting-input');
    }
    termInputBuffer = '';
  }
}

function sendStdinLine(lineStr, alreadyEchoed = false) {
  if (!isProgramRunning) {
    if (elStdinInput) {
      elStdinInput.value += (elStdinInput.value ? '\n' : '') + lineStr;
    }
    return;
  }

  // If program is running but not actively paused waiting yet, buffer it
  if (!isWaitingForInput) {
    window.queuedStdinLines.push(lineStr);
    return;
  }

  const cleanLine = lineStr + '\n';
  if (term && !alreadyEchoed) {
    term.writeln(lineStr);
  }

  if (sharedControl && sharedData) {
    const encoded = new TextEncoder().encode(cleanLine);
    sharedData.set(encoded);
    sharedControl[1] = encoded.length;
    Atomics.store(sharedControl, 0, 1);
    Atomics.notify(sharedControl, 0, 1);
  }

  setWaitingInputState(false);
}

function sendStdinEOF() {
  if (!isProgramRunning || !isWaitingForInput) return;
  if (term) {
    term.writeln('\x1b[90m^D (EOF)\x1b[0m');
  }
  if (sharedControl) {
    Atomics.store(sharedControl, 0, 2); // 2 = EOF
    Atomics.notify(sharedControl, 0, 1);
  }
  setWaitingInputState(false);
}

// ==========================================
// 3. Initialize Compiler Web Worker
// ==========================================
function initWorker() {
  if (compilerWorker) {
    compilerWorker.terminate();
  }

  compilerWorker = new Worker('js/compiler-worker.js?v=2.0.0');
  window.compilerWorker = compilerWorker;

  const hasSAB = initSharedBuffer();
  if (hasSAB) {
    compilerWorker.postMessage({
      action: 'init_sab',
      data: { buffer: sharedBuffer }
    });
  }

  compilerWorker.onmessage = (event) => {
    const data = event.data;

    switch (data.type) {
      case 'download_progress': {
        if (isFirstLoad && !data.fromCache) {
          elSplashOverlay.style.display = 'flex';
          elSplashProgressBar.style.width = `${data.percent}%`;
          elSplashStatusText.innerText = window.I18N
            ? window.I18N.t('splash_downloading', { file: data.file, percent: data.percent })
            : `Downloading ${data.file} (${data.percent}%)...`;
        }
        break;
      }

      case 'status': {
        updateStatus(data.status, data.message);
        if (data.status === 'ready') {
          isFirstLoad = false;
          elSplashOverlay.style.display = 'none';
        }
        break;
      }

      case 'stdout': {
        if (term) term.write(data.text);
        break;
      }

      case 'compiler_log': {
        if (elRawLogOutput) {
          if (elRawLogOutput.innerText.includes('biên dịch') || elRawLogOutput.innerText.includes('Compiler') || elRawLogOutput.innerText.includes('Compiling')) {
            elRawLogOutput.innerText = '';
          }
          const cleanText = (data.text || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
          elRawLogOutput.innerText += cleanText;
          elRawLogOutput.scrollTop = elRawLogOutput.scrollHeight;
        }
        break;
      }

      case 'stderr': {
        if (term) term.write(`\x1b[91m${data.text}\x1b[0m`);
        break;
      }

      case 'stdin_prompt': {
        setWaitingInputState(true);
        break;
      }

      case 'stdin_done': {
        setWaitingInputState(false);
        break;
      }

      case 'test_step': {
        elTestSummaryStats.innerText = data.message;
        break;
      }

      case 'testcase_start': {
        const card = document.getElementById(`tc-card-${data.id}`);
        if (card) {
          card.className = 'testcase-card running';
          const badge = card.querySelector('.badge-status');
          if (badge) {
            badge.className = 'badge-status pending';
            badge.innerText = window.I18N ? window.I18N.t('status_test_running') : 'Running...';
          }
        }
        break;
      }

      case 'testcase_done': {
        updateTestCaseCardUI(data.result);
        break;
      }

      case 'testcases_complete': {
        isBusy = false;
        setButtonsDisabled(false);
        renderTestcaseSummary(data);
        break;
      }
    }
  };

  compilerWorker.onerror = (err) => {
    console.error('Worker error:', err);
    updateStatus('error', window.I18N ? window.I18N.t('status_worker_error', { err: err.message }) : 'Web Worker Error: ' + err.message);
    isBusy = false;
    setButtonsDisabled(false);
  };

  // Kick off initialization
  compilerWorker.postMessage({ action: 'init' });
}

function updateStatus(status, text) {
  elStatusText.innerText = text;
  elStatusDot.className = 'status-dot';
  if (status === 'ready') {
    elStatusDot.classList.add('ready');
  } else if (status === 'compiling' || status === 'running' || status === 'linking' || status === 'initializing') {
    elStatusDot.classList.add('busy');
  } else if (status === 'error') {
    elStatusDot.classList.add('error');
  }
}

function setButtonsDisabled(disabled) {
  document.getElementById('btn-compile').disabled = disabled;
  document.getElementById('btn-run').disabled = disabled;
  document.getElementById('btn-compile-run').disabled = disabled;
  document.getElementById('btn-run-tests').disabled = disabled;
}

// ==========================================
// 4. Execution Actions
// ==========================================

function getCompilationPayload(optLevel = '2') {
  // 1. Flush active editor buffer to current active file
  if (editor && activeFile) {
    const val = editor.getValue();
    workspaceFiles[activeFile] = val;
    if (window.vfs) {
      window.vfs.setFileContentInMemory(activeFile, val);
      window.vfs.persist();
    } else {
      saveWorkspace();
    }
  }

  let filesList = [];
  let directories = [];
  let mainFile = 'main.cpp';

  // 2. Collect from VFS if available
  if (window.vfs && typeof window.vfs.getFiles === 'function') {
    const vfsFiles = window.vfs.getFiles();
    filesList = vfsFiles.map(f => ({
      path: f.path.replace(/\\/g, '/').replace(/^\.\//, ''),
      content: f.content || '',
      isUnit: f.isUnit !== false
    }));

    if (typeof window.vfs.getAllDirectories === 'function') {
      directories = window.vfs.getAllDirectories();
    } else {
      const dirSet = new Set();
      filesList.forEach(f => {
        const parts = f.path.split('/');
        for (let i = 1; i < parts.length; i++) {
          dirSet.add(parts.slice(0, i).join('/'));
        }
      });
      directories = Array.from(dirSet);
    }
  } else {
    // 3. Fallback to workspaceFiles dictionary
    const dirSet = new Set();
    filesList = Object.entries(workspaceFiles).map(([path, content]) => {
      const norm = path.replace(/\\/g, '/').replace(/^\.\//, '');
      const parts = norm.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirSet.add(parts.slice(0, i).join('/'));
      }
      const isHeader = /\.(h|hpp|hxx|inl)$/i.test(norm);
      return { path: norm, content, isUnit: !isHeader };
    });
    directories = Array.from(dirSet);
  }

  // 4. Determine mainFile
  const activeObj = filesList.find(f => f.path === activeFile);
  if (activeObj && activeObj.isUnit && /(?:int|void)\s+main\s*\(/.test(activeObj.content)) {
    mainFile = activeFile;
  } else {
    const mainCpp = filesList.find(f => /main\.(cpp|c|cc)$/i.test(f.path));
    if (mainCpp) {
      mainFile = mainCpp.path;
    } else {
      const firstUnit = filesList.find(f => f.isUnit);
      if (firstUnit) mainFile = firstUnit.path;
    }
  }

  return {
    source: editor ? editor.getValue() : '',
    files: filesList,
    directories: directories,
    mainFile: mainFile,
    optLevel: optLevel
  };
}

// F9: Compile Only
async function handleCompile() {
  if (isBusy || !editor) return;
  isBusy = true;
  setButtonsDisabled(true);

  clearDiagnostics();
  // DO NOT switch tab away! User remains on Console or current tab!
  elRawLogOutput.innerText = window.I18N ? window.I18N.t('log_compile_in_progress') : 'Compiling...';
  updateStatus('compiling', window.I18N ? window.I18N.t('status_compiling_f9') : 'Compiling source code (F9)...');

  saveWorkspace();
  const payload = getCompilationPayload('2');
  const startTime = performance.now();

  const reqId = Date.now();
  const handler = (event) => {
    if (event.data.id === reqId) {
      compilerWorker.removeEventListener('message', handler);
      isBusy = false;
      setButtonsDisabled(false);

      const res = event.data;
      elRawLogOutput.innerText = res.rawOutput || (res.success ? (window.I18N ? window.I18N.t('log_compile_clean') : 'Compilation complete, 0 errors.') : res.error);

      if (res.diagnostics && res.diagnostics.length > 0) {
        showDiagnostics(res.diagnostics);
      }

      if (res.success) {
        window.hasCompiledBinary = true;
        window.isBinaryStale = false;
        if (typeof updateWindowTitle === 'function') updateWindowTitle();
        updateStatus('ready', window.I18N ? window.I18N.t('status_compile_success_time', { time: res.timeSec }) : `Compilation successful (${res.timeSec}s)! Ready to run (F10).`);
        // Stay right here on current tab! Zero tab jumping!
      } else {
        window.hasCompiledBinary = false;
        window.isBinaryStale = true;
        if (typeof updateWindowTitle === 'function') updateWindowTitle();
        updateStatus('error', window.I18N ? window.I18N.t('status_compile_failed_log') : 'Compilation failed! Check Compiler Log.');
        // Only switch tab when there are actual compilation errors!
        switchRightTab('panel-log');
      }
    }
  };

  compilerWorker.addEventListener('message', handler);
  compilerWorker.postMessage({
    id: reqId,
    action: 'compile',
    data: payload
  });
}
window.handleCompile = handleCompile;
window.compileMultiFile = handleCompile;

// F10: Run Previously Compiled Binary
async function handleRun() {
  if (isBusy || !editor) return;

  // Milestone 3 Scope 2 (Feature F19): Uncompiled / Stale Binary Check
  if (!window.hasCompiledBinary || window.isBinaryStale) {
    showUncompiledWarningDialog();
    return;
  }

  isBusy = true;
  isProgramRunning = true;
  setButtonsDisabled(true);

  // Open Win32 pop-up cmd.exe console window
  if (window.openCmdWindow) {
    window.openCmdWindow();
  }
  if (term) term.clear();

  const stdinVal = elStdinInput ? elStdinInput.value : '';
  saveWorkspace();
  const payload = getCompilationPayload('2');
  payload.stdin = stdinVal;
  payload.interactive = true;
  const reqId = Date.now();

  const handler = (event) => {
    if (event.data.id === reqId) {
      compilerWorker.removeEventListener('message', handler);
      isBusy = false;
      isProgramRunning = false;
      setWaitingInputState(false);
      setButtonsDisabled(false);

      const res = event.data;
      if (!res.success) {
        if (res.step === 'compile') {
          if (typeof switchDockTab === 'function') switchDockTab('panel-error-list');
          if (elRawLogOutput) elRawLogOutput.innerText = res.rawOutput;
          if (res.diagnostics) showDiagnostics(res.diagnostics, res.rawOutput, res.timeSec);
          term.writeln('\r\n' + (window.I18N ? window.I18N.t('term_compile_err') : '[Compilation Error] Please check Error List / Compiler Log.'));
          return;
        }
        term.writeln('\r\n' + (window.I18N ? window.I18N.t('term_exec_err', { err: res.error || 'Execution failed.' }) : `[Execution Error] ${res.error || 'Execution failed.'}`) + '\r\n');
        return;
      }

      term.writeln('\r\n--------------------------------');
      term.writeln(`Process exited after ${res.timeSec} seconds with return value ${res.exitCode}`);
      term.writeln('Press any key to continue . . .\r\n');

      // Arm close-on-key state
      isWaitingToClose = true;
      window.isWaitingToClose = true;
      if (window.cmdWindow) window.cmdWindow.isWaitingToClose = true;
    }
  };

  compilerWorker.addEventListener('message', handler);
  compilerWorker.postMessage({
    id: reqId,
    action: 'run',
    data: payload
  });
}

// F11: Compile & Run
async function handleCompileAndRun() {
  if (isBusy || !editor) return;
  isBusy = true;
  isProgramRunning = true;
  setButtonsDisabled(true);

  clearDiagnostics();
  updateStatus('compiling', window.I18N ? window.I18N.t('status_compiling_f11') : 'Compiling and launching (F11)...');

  saveWorkspace();
  const stdinVal = elStdinInput ? elStdinInput.value : '';
  const payload = getCompilationPayload('2');
  payload.stdin = stdinVal;
  payload.interactive = true;
  const reqId = Date.now();

  const handler = (event) => {
    if (event.data.id === reqId) {
      const res = event.data;

      if (res.step === 'ready_to_run') {
        if (window.openCmdWindow) {
          window.openCmdWindow();
        }
        if (term) term.clear();
        updateStatus('running', window.I18N ? window.I18N.t('status_running') : 'Running executable in Command Prompt...');
        return;
      }

      compilerWorker.removeEventListener('message', handler);
      isBusy = false;
      isProgramRunning = false;
      setWaitingInputState(false);
      setButtonsDisabled(false);

      if (res.step === 'compile' && !res.success) {
        window.hasCompiledBinary = false;
        window.isBinaryStale = true;
        if (typeof updateWindowTitle === 'function') updateWindowTitle();
        if (typeof switchDockTab === 'function') switchDockTab('panel-error-list');
        if (elRawLogOutput) elRawLogOutput.innerText = res.rawOutput;
        if (res.diagnostics) showDiagnostics(res.diagnostics, res.rawOutput, res.timeSec);
        updateStatus('error', window.I18N ? window.I18N.t('status_compile_failed_errlist') : 'Compilation failed! Check Error List.');
        return;
      }

      if (res.step === 'run' && res.success) {
        window.hasCompiledBinary = true;
        window.isBinaryStale = false;
        if (typeof updateWindowTitle === 'function') updateWindowTitle();
        term.writeln('\r\n--------------------------------');
        term.writeln(`Process exited after ${res.timeSec} seconds with return value ${res.exitCode}`);
        term.writeln('Press any key to continue . . .\r\n');

        // Arm close-on-key state
        isWaitingToClose = true;
        window.isWaitingToClose = true;
        if (window.cmdWindow) window.cmdWindow.isWaitingToClose = true;
      }
    }
  };

  compilerWorker.addEventListener('message', handler);
  compilerWorker.postMessage({
    id: reqId,
    action: 'compileAndRun',
    data: payload
  });
}

// F8: Run All Test Cases
async function handleRunTests() {
  if (isBusy || !editor) return;
  if (!currentTestcases || currentTestcases.length === 0) {
    alert(window.I18N ? window.I18N.t('alert_no_testcases') : 'No testcases defined! Please add at least 1 testcase.');
    return;
  }

  isBusy = true;
  setButtonsDisabled(true);

  switchRightTab('panel-tests');
  elTestSummaryStats.innerText = window.I18N ? window.I18N.t('status_test_starting') : 'Starting test runner...';

  // Reset UI status of cards
  currentTestcases.forEach((tc) => {
    const card = document.getElementById(`tc-card-${tc.id}`);
    if (card) {
      card.className = 'testcase-card';
      const badge = card.querySelector('.badge-status');
      if (badge) {
        badge.className = 'badge-status pending';
        badge.innerText = window.I18N ? window.I18N.t('status_test_waiting') : 'Waiting';
      }
      const actBox = card.querySelector('.actual-box');
      if (actBox) actBox.innerText = '';
    }
  });

  saveWorkspace();
  const reqId = Date.now();

  // Update testcases with current user edits from inputs
  readTestcasesFromUI();

  const payload = getCompilationPayload('2');
  payload.testcases = currentTestcases;

  compilerWorker.postMessage({
    id: reqId,
    action: 'runTestcases',
    data: payload
  });
}

// Stop execution / Restart Worker
function handleStop() {
  isProgramRunning = false;
  setWaitingInputState(false);
  window.hasCompiledBinary = false;
  window.isBinaryStale = true;
  if (typeof updateWindowTitle === 'function') updateWindowTitle();
  if (sharedControl) {
    Atomics.store(sharedControl, 0, 2); // 2 = cancel/EOF
    Atomics.notify(sharedControl, 0, 1);
  }
  if (compilerWorker) {
    compilerWorker.terminate();
    term.writeln('\r\n\x1b[91m[!] Worker da duoc dung lai va khoi dong lai boi nguoi dung.\x1b[0m\r\n');
    initWorker();
  }
  isBusy = false;
  setButtonsDisabled(false);
  updateStatus('ready', window.I18N ? window.I18N.t('status_ready') : 'Dev-C++ Compiler is ready!');
}

// ==========================================
// 5. Diagnostics & Compiler Log
// ==========================================
let currentDiagnostics = [];

function clearDiagnostics() {
  currentDiagnostics = [];
  if (editor && monaco && editor.getModel()) {
    monaco.editor.setModelMarkers(editor.getModel(), 'clang', []);
  }

  const elLogTableBody = document.getElementById('log-table-body');
  if (elLogTableBody) {
    elLogTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5" class="empty-message" style="text-align:center; color:var(--text-muted); padding:20px;">
          <i class="fa-regular fa-circle-check" style="color:#22c55e; margin-right:6px;"></i> ${window.I18N ? window.I18N.t('err_empty_msg') : 'No compilation errors.'}
        </td>
      </tr>
    `;
  }

  const elSummary = document.getElementById('error-list-summary-text');
  if (elSummary) elSummary.innerText = window.I18N ? window.I18N.t('err_summary_zero') : '0 Errors, 0 Warnings';

  const countErrorsEl = document.getElementById('count-errors');
  if (countErrorsEl) countErrorsEl.innerText = '0';
  const countWarningsEl = document.getElementById('count-warnings');
  if (countWarningsEl) countWarningsEl.innerText = '0';

  if (elLogBadge) {
    elLogBadge.innerText = '0';
    elLogBadge.style.display = 'none';
  }
  if (elRawLogOutput) elRawLogOutput.innerHTML = '';
}

function showDiagnostics(diags, rawOutput = '', timeSec = '0.00') {
  currentDiagnostics = Array.isArray(diags) ? diags : [];

  const elLogTableBody = document.getElementById('log-table-body');
  if (!elLogTableBody) return;

  if (currentDiagnostics.length === 0) {
    clearDiagnostics();
    if (elRawLogOutput && rawOutput) {
      renderFormattedCompilerLog(rawOutput, 0, 0, timeSec);
    }
    return;
  }

  const errorCount = currentDiagnostics.filter(d => d.severity === 'error').length;
  const warningCount = currentDiagnostics.filter(d => d.severity === 'warning').length;

  const elSummary = document.getElementById('error-list-summary-text');
  if (elSummary) elSummary.innerText = window.I18N ? window.I18N.t('err_summary_counts', { errors: errorCount, warnings: warningCount }) : `${errorCount} Errors, ${warningCount} Warnings`;

  const countErrorsEl = document.getElementById('count-errors');
  if (countErrorsEl) countErrorsEl.innerText = String(errorCount);
  const countWarningsEl = document.getElementById('count-warnings');
  if (countWarningsEl) countWarningsEl.innerText = String(warningCount);

  if (elLogBadge) {
    elLogBadge.innerText = String(currentDiagnostics.length);
    elLogBadge.style.display = 'inline-block';
  }

  let rowsHtml = '';
  currentDiagnostics.forEach((d) => {
    const isErr = d.severity === 'error';
    const isWarn = d.severity === 'warning';
    const badgeClass = isErr ? 'badge-status error-badge' : (isWarn ? 'badge-status warning-badge' : 'badge-status note-badge');
    const iconClass = isErr ? 'fa-solid fa-circle-xmark' : (isWarn ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-info');
    const safeFile = escapeHtml(d.file || 'main.cpp');
    const safeMsg = escapeHtml(d.message || '');
    const safeSeverity = escapeHtml((d.severity || 'error').toUpperCase());
    const jumpTitle = window.I18N ? window.I18N.t('click_to_jump', { file: safeFile, line: d.line }) : `Click to jump to ${safeFile}:${d.line}`;

    rowsHtml += `
      <tr class="log-row ${escapeHtml(d.severity)} clickable" onclick="jumpToDiagnostic('${escapeJsString(d.file)}', ${d.line}, ${d.col})" title="${jumpTitle}">
        <td class="col-severity"><span class="${badgeClass}"><i class="${iconClass}"></i> ${safeSeverity}</span></td>
        <td class="col-unit log-file" title="${safeFile}"><strong>${safeFile}</strong></td>
        <td class="col-line"><strong>${d.line}</strong></td>
        <td class="col-col">${d.col}</td>
        <td class="col-message">${safeMsg}</td>
      </tr>
    `;
  });

  elLogTableBody.innerHTML = rowsHtml;

  // Render formatted Compiler Log with interactive jump links
  renderFormattedCompilerLog(rawOutput, errorCount, warningCount, timeSec);

  // Update Monaco squiggles
  updateEditorMarkersForActiveFile();
}

function stripAnsi(str) {
  if (!str) return '';
  return String(str).replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
}
window.stripAnsi = stripAnsi;

function renderFormattedCompilerLog(rawOutput, errors, warnings, timeSec) {
  if (!elRawLogOutput) return;

  const cleanRaw = stripAnsi(rawOutput || '');
  const lines = cleanRaw.split('\n');
  const diagRegex = /^(?:<stdin>|([a-zA-Z]:[\\\/][^:\r\n]+|[^:\r\n]+)):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.*)$/i;

  let formatted = '';
  formatted += `<span style="color:var(--text-muted);">Compiler: TDM-GCC 4.9.2 64-bit Release (Clang WASM Toolchain)\n</span>`;
  formatted += `<span style="color:var(--text-muted);">Building Makefile: "C:\\Projects\\Project1\\Makefile.win"\nExecuting make...\n\n</span>`;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(diagRegex);
    if (match) {
      let file = (match[1] || 'main.cpp').replace(/\\/g, '/').replace(/^\.\//, '');
      const l = parseInt(match[2], 10) || 1;
      const c = parseInt(match[3], 10) || 1;
      const sev = match[4].toLowerCase();
      const jumpTitle = window.I18N ? window.I18N.t('click_to_jump', { file: escapeHtml(file), line: l }) : `Click to jump to ${escapeHtml(file)}:${l}`;
      formatted += `<span class="compiler-log-jump-line ${sev}" onclick="jumpToDiagnostic('${escapeJsString(file)}', ${l}, ${c})" title="${jumpTitle}">`;
      formatted += escapeHtml(line);
      formatted += `</span>\n`;
    } else {
      formatted += escapeHtml(line) + '\n';
    }
  }

  formatted += `\n<span style="color:var(--text-muted);">--------------------------------------------------\nCompilation results:\n`;
  formatted += `Errors: ${errors}\nWarnings: ${warnings}\nCompilation Time: ${timeSec}s\n</span>`;

  elRawLogOutput.innerHTML = formatted;
}

function escapeJsString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function findMatchingFilePath(targetPath) {
  if (!targetPath) return null;
  const norm = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');

  if (window.vfs && typeof window.vfs.getFile === 'function' && window.vfs.getFile(norm)) {
    return norm;
  }
  if (workspaceFiles && workspaceFiles[norm] !== undefined) return norm;

  const fileName = norm.split('/').pop();
  if (window.vfs && typeof window.vfs.getFiles === 'function') {
    const all = window.vfs.getFiles();
    const found = all.find(f => f.path.endsWith('/' + fileName) || f.path === fileName);
    if (found) return found.path;
  }
  if (workspaceFiles) {
    for (const p in workspaceFiles) {
      if (p.endsWith('/' + fileName) || p === fileName) return p;
    }
  }

  return null;
}

function jumpToDiagnostic(file, line, col) {
  try {
    const normFile = file ? file.replace(/\\/g, '/').replace(/^\.\//, '') : activeFile;

    if (normFile && normFile !== activeFile && normFile !== 'test.cc' && normFile !== '<stdin>') {
      const matchedPath = findMatchingFilePath(normFile);
      if (matchedPath && matchedPath !== activeFile) {
        switchFileTab(matchedPath);
      }
    }

    updateEditorMarkersForActiveFile();

    jumpToLine(line, col);
  } catch (err) {
    console.error('Error during diagnostic jump:', err);
  }
}

let activeLineDecorationIds = [];
let flashTimeoutId = null;

function jumpToLine(line, col = 1) {
  if (!editor) return;
  const targetLine = Math.max(1, parseInt(line, 10) || 1);
  const targetCol = Math.max(1, parseInt(col, 10) || 1);

  const model = editor.getModel();
  const clampedLine = model ? Math.min(targetLine, Math.max(1, model.getLineCount())) : targetLine;

  editor.revealLineInCenter(clampedLine);
  editor.setPosition({ lineNumber: clampedLine, column: targetCol });
  editor.focus();

  flashEditorLine(clampedLine);
}

function flashEditorLine(lineNumber) {
  if (!editor || !monaco) return;
  try {
    if (flashTimeoutId) {
      clearTimeout(flashTimeoutId);
      flashTimeoutId = null;
    }
    activeLineDecorationIds = editor.deltaDecorations(activeLineDecorationIds, [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-line-flash-highlight',
          marginClassName: 'monaco-line-flash-gutter'
        }
      }
    ]);

    flashTimeoutId = setTimeout(() => {
      if (editor) {
        activeLineDecorationIds = editor.deltaDecorations(activeLineDecorationIds, []);
      }
      flashTimeoutId = null;
    }, 1800);
  } catch (e) {
    console.warn('Flash line decoration failed:', e);
  }
}

window.jumpToDiagnostic = jumpToDiagnostic;
window.jumpToLine = jumpToLine;

function updateEditorMarkersForActiveFile() {
  if (!editor || !monaco) return;

  const markers = [];
  const targetFile = activeFile ? activeFile.replace(/\\/g, '/') : 'main.cpp';

  for (const d of currentDiagnostics) {
    const dFile = (d.file || 'main.cpp').replace(/\\/g, '/');
    if (dFile === targetFile || (targetFile === 'main.cpp' && dFile === 'test.cc') || dFile.endsWith('/' + targetFile)) {
      markers.push({
        startLineNumber: d.line,
        startColumn: d.col,
        endLineNumber: d.line,
        endColumn: d.col + 6,
        message: d.message,
        severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : (d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info)
      });
    }
  }

  monaco.editor.setModelMarkers(editor.getModel(), 'clang', markers);
}

window.jumpToDiagnostic = jumpToDiagnostic;

// ==========================================
// 6. Testcases Management
// ==========================================
function renderTestcasesUI() {
  if (!currentTestcases || currentTestcases.length === 0) {
    const emptyTip = window.I18N ? window.I18N.t('status_test_empty_tip') : 'No testcases defined. Click "Add Test" to create one.';
    elTestcasesList.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">${emptyTip}</div>`;
    elTestBadge.innerText = '0/0';
    return;
  }

  elTestBadge.innerText = `0/${currentTestcases.length}`;
  elTestBadge.className = 'tab-badge';

  const unrunLbl = window.I18N ? window.I18N.t('test_summary_unrun') : 'Not run yet';
  const delLbl = window.I18N ? window.I18N.t('test_delete') : 'Delete';
  const inLbl = window.I18N ? window.I18N.t('test_input_lbl') : 'Input (stdin):';
  const expLbl = window.I18N ? window.I18N.t('test_expected_lbl') : 'Expected Output:';
  const actLbl = window.I18N ? window.I18N.t('test_actual_lbl') : 'Actual Output:';

  let html = '';
  currentTestcases.forEach((tc, idx) => {
    html += `
      <div class="testcase-card" id="tc-card-${tc.id}">
        <div class="testcase-header">
          <div class="testcase-title">
            <span><strong>#${idx + 1}</strong> ${escapeHtml(tc.name || `Test ${idx + 1}`)}</span>
            <span class="badge-status pending" id="tc-badge-${tc.id}">${unrunLbl}</span>
            <span id="tc-time-${tc.id}" style="font-size:11px; color:var(--text-muted);"></span>
          </div>
          <div>
            <button class="btn-tool" onclick="deleteTestcase(${tc.id})" style="padding:2px 6px; font-size:11px;" title="${delLbl}">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="testcase-body">
          <div class="io-row">
            <div class="io-col">
              <span class="io-label"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${inLbl}</span>
              <textarea class="io-box tc-input" data-id="${tc.id}" placeholder="${inLbl}">${escapeHtml(tc.input || '')}</textarea>
            </div>
            <div class="io-col">
              <span class="io-label"><i class="fa-solid fa-bullseye"></i> ${expLbl}</span>
              <textarea class="io-box tc-expected" data-id="${tc.id}" placeholder="${expLbl}">${escapeHtml(tc.expected || '')}</textarea>
            </div>
          </div>
          <div class="io-col">
            <span class="io-label"><i class="fa-solid fa-terminal"></i> ${actLbl}</span>
            <div class="actual-box" id="tc-actual-${tc.id}"></div>
          </div>
        </div>
      </div>
    `;
  });

  elTestcasesList.innerHTML = html;
}

function readTestcasesFromUI() {
  currentTestcases.forEach((tc) => {
    const inputEl = document.querySelector(`.tc-input[data-id="${tc.id}"]`);
    const expEl = document.querySelector(`.tc-expected[data-id="${tc.id}"]`);
    if (inputEl) tc.input = inputEl.value;
    if (expEl) tc.expected = expEl.value;
  });
}

function updateTestCaseCardUI(result) {
  const card = document.getElementById(`tc-card-${result.id}`);
  if (!card) return;

  card.className = `testcase-card ${result.passed ? 'passed' : 'failed'}`;

  const isVi = window.I18N && window.I18N.getLocale() === 'vi';
  const badge = card.querySelector('.badge-status');
  if (badge) {
    if (result.passed) {
      badge.className = 'badge-status ac';
      badge.innerText = isVi ? 'ĐẠT (PASS)' : 'AC - Passed';
    } else if (result.status === 'RTE') {
      badge.className = 'badge-status rte';
      badge.innerText = `RTE (Exit ${result.exitCode})`;
    } else {
      badge.className = 'badge-status wa';
      badge.innerText = isVi ? 'WA - Sai kết quả' : 'WA - Wrong Answer';
    }
  }

  const timeEl = document.getElementById(`tc-time-${result.id}`);
  if (timeEl) {
    timeEl.innerText = `${result.timeMs}ms`;
  }

  const actBox = document.getElementById(`tc-actual-${result.id}`);
  if (actBox) {
    actBox.innerText = result.actual || (isVi ? '(Trống)' : '(Empty)');
    if (!result.passed) {
      actBox.style.color = '#f14c4c';
    } else {
      actBox.style.color = '#4ec9b0';
    }
  }
}

function renderTestcaseSummary(data) {
  const isVi = window.I18N && window.I18N.getLocale() === 'vi';
  if (data.status === 'COMPILE_ERROR') {
    const errText = isVi ? 'Lỗi biên dịch (Compile Error)! Xem tab Compiler Log.' : 'Compilation Error! Check Compiler Log tab.';
    elTestSummaryStats.innerHTML = `<span style="color:#f14c4c;"><i class="fa-solid fa-triangle-exclamation"></i> ${errText}</span>`;
    switchRightTab('panel-log');
    if (data.diagnostics) showDiagnostics(data.diagnostics);
    elRawLogOutput.innerText = data.rawOutput || (isVi ? 'Lỗi biên dịch không xác định.' : 'Unknown compilation error.');
    elTestBadge.className = 'tab-badge failed';
    elTestBadge.innerText = isVi ? 'Lỗi' : 'Error';
    return;
  }

  if (data.status === 'LINK_ERROR') {
    const errText = isVi ? 'Lỗi liên kết (Link Error)! Xem tab Compiler Log.' : 'Link Error! Check Compiler Log tab.';
    elTestSummaryStats.innerHTML = `<span style="color:#f14c4c;"><i class="fa-solid fa-triangle-exclamation"></i> ${errText}</span>`;
    switchRightTab('panel-log');
    elRawLogOutput.innerText = data.rawOutput || (isVi ? 'Lỗi liên kết thư viện (Link Error).' : 'Library link error (Link Error).');
    elTestBadge.className = 'tab-badge failed';
    elTestBadge.innerText = isVi ? 'Lỗi' : 'Error';
    return;
  }

  const passed = data.passedCount !== undefined ? data.passedCount : 0;
  const total = data.totalCount !== undefined ? data.totalCount : 0;

  elTestBadge.innerText = `${passed}/${total}`;
  if (total > 0 && passed === total) {
    elTestBadge.className = 'tab-badge passed';
    const msg = window.I18N ? window.I18N.t('test_all_passed', { passed, total }) : `ALL TESTCASES PASSED (${passed}/${total})`;
    elTestSummaryStats.innerHTML = `<span style="color:#2ea44f; font-weight:600;"><i class="fa-solid fa-circle-check"></i> ${msg}</span>`;
  } else {
    elTestBadge.className = 'tab-badge failed';
    const msg = window.I18N ? window.I18N.t('test_failed_count', { passed, total }) : `${total - passed} test(s) failed (${passed}/${total})`;
    elTestSummaryStats.innerHTML = `<span style="color:#cb2431; font-weight:600;"><i class="fa-solid fa-circle-xmark"></i> ${msg}</span>`;
  }
}

function addTestcase() {
  readTestcasesFromUI();
  const newId = Date.now();
  currentTestcases.push({
    id: newId,
    name: `Test #${currentTestcases.length + 1}`,
    input: '',
    expected: ''
  });
  renderTestcasesUI();
}

function deleteTestcase(id) {
  readTestcasesFromUI();
  currentTestcases = currentTestcases.filter((tc) => tc.id !== id);
  renderTestcasesUI();
}

// ==========================================
// 7. Template & File Management
// ==========================================
function populateTemplates() {
  if (!elTemplateSelect) return;
  elTemplateSelect.innerHTML = CODE_TEMPLATES.map(
    (t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`
  ).join('');

  elTemplateSelect.addEventListener('change', (e) => {
    const selected = CODE_TEMPLATES.find((t) => t.id === e.target.value);
    if (selected) {
      if (confirm(window.I18N ? window.I18N.t('confirm_load_template') : 'Do you want to load this template? (Current code will be replaced)')) {
        loadTemplate(selected);
      }
    }
  });
}

// ==========================================
// VFSSidebarController - Win32 Dev-C++ 5.11 Project Manager
// ==========================================
class VFSSidebarController {
  constructor(vfsInstance) {
    this.vfs = vfsInstance;
    this.selectedNodeId = null;
    this.contextTargetNodeId = null;

    // DOM Elements
    this.elTree = document.getElementById('project-tree');
    this.elContextMenu = document.getElementById('vfs-context-menu');
    this.elContextMenuItems = document.getElementById('vfs-context-menu-items');
    this.elMiniToolbar = document.getElementById('sidebar-mini-toolbar');

    // Mini-toolbar buttons
    this.btnNewFile = document.getElementById('sb-btn-new-file');
    this.btnNewFolder = document.getElementById('sb-btn-new-folder');
    this.btnDelete = document.getElementById('sb-btn-delete');
    this.btnToggleUnit = document.getElementById('sb-btn-toggle-unit');
    this.btnCollapseAll = document.getElementById('sb-btn-collapse-all');

    // Modal dialogs
    this.dlgInputOverlay = document.getElementById('dialog-vfs-input-overlay');
    this.dlgInputVal = document.getElementById('dlg-input-val');
    this.dlgInputError = document.getElementById('dlg-input-error');
    this.dlgInputTitle = document.getElementById('dlg-input-title');
    this.dlgInputPrompt = document.getElementById('dlg-input-prompt');
    this.dlgInputOk = document.getElementById('dlg-input-btn-ok');
    this.dlgInputCancel = document.getElementById('dlg-input-btn-cancel');
    this.dlgInputClose = document.getElementById('dlg-input-btn-close');

    this.dlgOptionsOverlay = document.getElementById('dialog-project-options-overlay');
  }

  init() {
    this._bindVFSEvents();
    this._bindToolbarEvents();
    this._bindTreeEvents();
    this._bindContextMenuEvents();
    this._bindDialogEvents();

    if (this.vfs.isReady) {
      this.renderTree();
    } else {
      this.vfs.on('init', () => this.renderTree());
    }
  }

  _bindVFSEvents() {
    this.vfs.on('change', () => this.renderTree());
    this.vfs.on('nodeCreated', () => this.renderTree());
    this.vfs.on('nodeRenamed', () => this.renderTree());
    this.vfs.on('nodeDeleted', () => this.renderTree());
    this.vfs.on('unitToggled', () => this.renderTree());

    this.vfs.on('activeFileChanged', ({ newFileId }) => {
      this.highlightActiveNode(newFileId);
    });
  }

  renderTree() {
    if (!this.elTree) return;
    this.elTree.innerHTML = '';

    const project = this.vfs.project;
    if (!project) return;

    // A. Render Project Root Node
    const rootRow = document.createElement('div');
    rootRow.className = 'tree-node-row tree-node-project tree-root project-root root-node' + (this.selectedNodeId === 'project_root' ? ' selected' : '');
    rootRow.dataset.id = 'project_root';
    rootRow.dataset.type = 'project';
    rootRow.style.paddingLeft = '4px';

    rootRow.innerHTML = `
      <span class="tree-expander empty"></span>
      <span class="tree-node-icon icon-project"><i class="fa-solid fa-cube"></i></span>
      <span class="tree-node-label">${this._escapeHtml(project.name)}</span>
    `;

    rootRow.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode('project_root');
    });

    rootRow.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.showProjectOptionsDialog();
    });

    this.elTree.appendChild(rootRow);

    // B. Recursively Render Top-Level Children
    this._renderChildren(null, 1);

    if (this.selectedNodeId) {
      const activeEl = this.elTree.querySelector(`[data-id="${this.selectedNodeId}"]`);
      if (activeEl) activeEl.classList.add('selected');
    }
  }

  _renderChildren(parentId, depth) {
    const nodes = this.vfs.getChildren(parentId);
    if (!nodes || nodes.length === 0) return;

    const folders = nodes.filter(n => n.type === 'folder').sort((a, b) => a.name.localeCompare(b.name));
    const files = nodes.filter(n => n.type === 'file').sort((a, b) => a.name.localeCompare(b.name));
    const sorted = [...folders, ...files];

    for (const node of sorted) {
      if (node.type === 'folder') {
        this._renderFolderNode(node, depth);
      } else {
        this._renderFileNode(node, depth);
      }
    }
  }

  _renderFolderNode(node, depth) {
    const isExpanded = node.isExpanded !== false;
    const isSelected = (this.selectedNodeId === node.id);

    const row = document.createElement('div');
    row.className = 'tree-node-row tree-node-folder' + (isSelected ? ' selected' : '');
    row.dataset.id = node.id;
    row.dataset.type = 'folder';
    row.dataset.path = node.path;
    row.style.paddingLeft = `${depth * 14 + 4}px`;

    row.innerHTML = `
      <span class="tree-expander ${isExpanded ? 'expanded' : ''}" data-action="toggle-expand">
        <i class="fa-solid fa-chevron-right"></i>
      </span>
      <span class="tree-node-icon ${isExpanded ? 'icon-folder-open' : 'icon-folder'}">
        <i class="fa-solid ${isExpanded ? 'fa-folder-open' : 'fa-folder'}"></i>
      </span>
      <span class="tree-node-label">${this._escapeHtml(node.name)}</span>
    `;

    const expander = row.querySelector('.tree-expander');
    expander.addEventListener('click', (e) => {
      e.stopPropagation();
      this.vfs.setFolderExpanded(node.id, !isExpanded);
    });

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(node.id);
    });

    row.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.vfs.setFolderExpanded(node.id, !isExpanded);
    });

    this.elTree.appendChild(row);

    if (isExpanded) {
      this._renderChildren(node.id, depth + 1);
    }
  }

  _renderFileNode(node, depth) {
    const isSelected = (this.selectedNodeId === node.id);
    const isActiveTab = (this.vfs.project && this.vfs.project.activeFileId === node.id);
    const isExcluded = (node.isUnit === false && DevCPPVirtualFileSystem.isSourceFile(node.path));

    const row = document.createElement('div');
    let rowClasses = 'tree-node-row tree-node-file';
    if (isSelected) rowClasses += ' selected';
    if (isActiveTab) rowClasses += ' is-active-tab';
    if (isExcluded) rowClasses += ' unit-excluded';

    row.className = rowClasses;
    row.dataset.id = node.id;
    row.dataset.type = 'file';
    row.dataset.path = node.path;
    row.style.paddingLeft = `${depth * 14 + 4}px`;

    const ext = this.vfs.getExtension(node.name);
    let iconClass = 'fa-regular fa-file-code icon-text';
    if (['cpp', 'cc', 'cxx'].includes(ext)) {
      iconClass = 'fa-solid fa-file-code icon-cpp';
    } else if (ext === 'c') {
      iconClass = 'fa-solid fa-file-code icon-c';
    } else if (['h', 'hpp', 'hh', 'hxx'].includes(ext)) {
      iconClass = 'fa-solid fa-file-lines icon-header';
    }

    let unitBadgeHtml = '';
    if (DevCPPVirtualFileSystem.isSourceFile(node.path)) {
      if (node.isUnit !== false) {
        const titleText = window.I18N ? window.I18N.t('sb_unit_badge_in') : 'Unit included in project build';
        unitBadgeHtml = `<span class="unit-badge unit-badge-ok" title="${titleText}">U</span>`;
      } else {
        const titleText = window.I18N ? window.I18N.t('sb_unit_badge_out') : 'Excluded from build';
        unitBadgeHtml = `<span class="unit-badge unit-badge-excluded" title="${titleText}">✕</span>`;
      }
    }

    row.innerHTML = `
      <span class="tree-expander empty"></span>
      <span class="tree-node-icon"><i class="${iconClass}"></i></span>
      <span class="tree-node-label" title="${this._escapeHtml(node.path)}">${this._escapeHtml(node.name)}</span>
      ${unitBadgeHtml}
    `;

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(node.id);
      this.vfs.openTab(node.id);
    });

    row.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.vfs.openTab(node.id);
    });

    this.elTree.appendChild(row);
  }

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    const allRows = this.elTree.querySelectorAll('.tree-node-row');
    allRows.forEach(row => {
      row.classList.toggle('selected', row.dataset.id === nodeId);
    });
  }

  highlightActiveNode(activeFileId) {
    const allRows = this.elTree.querySelectorAll('.tree-node-file');
    allRows.forEach(row => {
      const isActive = row.dataset.id === activeFileId;
      row.classList.toggle('is-active-tab', isActive);
      if (isActive) {
        this.selectNode(activeFileId);
      }
    });
  }

  _bindToolbarEvents() {
    if (this.btnNewFile) {
      this.btnNewFile.addEventListener('click', () => this.handleActionNewFile());
    }
    if (this.btnNewFolder) {
      this.btnNewFolder.addEventListener('click', () => this.handleActionNewFolder());
    }
    if (this.btnDelete) {
      this.btnDelete.addEventListener('click', () => this.handleActionDeleteSelected());
    }
    if (this.btnToggleUnit) {
      this.btnToggleUnit.addEventListener('click', () => this.handleActionToggleUnit());
    }
    if (this.btnCollapseAll) {
      this.btnCollapseAll.addEventListener('click', () => this.handleActionCollapseAll());
    }
  }

  _getTargetParentId() {
    if (!this.selectedNodeId || this.selectedNodeId === 'project_root') {
      return null;
    }
    const node = this.vfs.getNodeById(this.selectedNodeId);
    if (!node) return null;
    if (node.type === 'folder') return node.id;
    return node.parentId;
  }

  handleActionNewFile(targetParentId = null) {
    const parentId = targetParentId !== null ? targetParentId : this._getTargetParentId();
    this.showInputDialog({
      title: window.I18N ? window.I18N.t('dlg_new_file_title') : 'New File',
      prompt: window.I18N ? window.I18N.t('dlg_new_file_prompt') : 'New file name (e.g. calc.cpp, utils.h):',
      defaultValue: 'calc.cpp',
      icon: 'fa-file-circle-plus',
      onOk: async (filename) => {
        try {
          const fileNode = await this.vfs.createFile(parentId, filename);
          this.vfs.openTab(fileNode.id);
          this.selectNode(fileNode.id);
        } catch (err) {
          alert((window.I18N ? window.I18N.t('err_create_file_prefix') : 'Error creating file: ') + err.message);
        }
      }
    });
  }

  handleActionNewFolder(targetParentId = null) {
    const parentId = targetParentId !== null ? targetParentId : this._getTargetParentId();
    this.showInputDialog({
      title: window.I18N ? window.I18N.t('dlg_new_folder_title') : 'New Folder',
      prompt: window.I18N ? window.I18N.t('dlg_new_folder_prompt') : 'New folder name:',
      defaultValue: 'src',
      icon: 'fa-folder-plus',
      onOk: async (folderName) => {
        try {
          const folderNode = await this.vfs.createFolder(parentId, folderName);
          this.selectNode(folderNode.id);
        } catch (err) {
          alert((window.I18N ? window.I18N.t('err_create_folder_prefix') : 'Error creating folder: ') + err.message);
        }
      }
    });
  }

  async handleActionDeleteSelected(nodeId = null) {
    const targetId = nodeId || this.selectedNodeId;
    if (!targetId || targetId === 'project_root') {
      alert(window.I18N ? window.I18N.t('alert_root_delete') : 'Cannot delete the project root directory!');
      return;
    }
    const node = this.vfs.getNodeById(targetId);
    if (!node) return;

    const typeDesc = node.type === 'folder'
      ? (window.I18N ? window.I18N.t('type_folder') : 'folder')
      : (window.I18N ? window.I18N.t('type_file') : 'file');
    const confirmPrompt = window.I18N ? window.I18N.t('confirm_delete_msg', { type: typeDesc, name: node.name }) : `Are you sure you want to delete ${typeDesc} "${node.name}"?`;
    if (confirm(confirmPrompt)) {
      try {
        await this.vfs.deleteNode(node.id);
        this.selectedNodeId = null;
      } catch (err) {
        alert(err.message);
      }
    }
  }

  handleActionToggleUnit(nodeId = null) {
    const targetId = nodeId || this.selectedNodeId;
    if (!targetId || targetId === 'project_root') return;
    const node = this.vfs.getNodeById(targetId);
    if (!node || node.type !== 'file') return;

    this.vfs.toggleUnit(node.id);
  }

  handleActionCollapseAll() {
    if (!this.vfs.project) return;
    for (const id in this.vfs.project.nodes) {
      if (this.vfs.project.nodes[id].type === 'folder') {
        this.vfs.project.nodes[id].isExpanded = false;
      }
    }
    this.vfs.persist();
    this.renderTree();
  }

  handleActionRename(nodeId) {
    if (!nodeId || nodeId === 'project_root') return;
    const node = this.vfs.getNodeById(nodeId);
    if (!node) return;

    this.showInputDialog({
      title: window.I18N ? window.I18N.t('dlg_rename_title') : 'Rename Item',
      prompt: window.I18N ? window.I18N.t('dlg_rename_prompt') : 'Enter new name:',
      defaultValue: node.name,
      icon: 'fa-pen-to-square',
      onOk: async (newName) => {
        try {
          await this.vfs.renameNode(node.id, newName);
        } catch (err) {
          alert((window.I18N ? window.I18N.t('err_rename_prefix') : 'Error renaming: ') + err.message);
        }
      }
    });
  }

  _bindContextMenuEvents() {
    if (!this.elTree) return;

    this.elTree.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const row = e.target.closest('.tree-node-row');
      let targetNodeId = null;
      let targetType = 'empty';

      if (row) {
        targetNodeId = row.dataset.id;
        targetType = row.dataset.type;
        this.selectNode(targetNodeId);
      } else {
        targetNodeId = 'project_root';
        targetType = 'empty';
      }

      this.contextTargetNodeId = targetNodeId;
      this.showContextMenu(e.clientX, e.clientY, targetType, targetNodeId);
    });

    document.addEventListener('click', (e) => {
      if (this.elContextMenu && !e.target.closest('#vfs-context-menu')) {
        this.hideContextMenu();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });
  }

  showContextMenu(x, y, targetType, targetNodeId) {
    if (!this.elContextMenu || !this.elContextMenuItems) return;
    this.elContextMenuItems.innerHTML = '';

    const node = (targetNodeId && targetNodeId !== 'project_root')
      ? this.vfs.getNodeById(targetNodeId)
      : null;

    const _t = (k, fb) => (window.I18N ? window.I18N.t(k) : fb);

    if (targetType === 'project' || targetNodeId === 'project_root') {
      this._addMenuItem('fa-file-circle-plus', _t('ctx_new_file', 'New Source File (.cpp, .h, .c)...'), 'Alt+N', () => {
        this.handleActionNewFile(null);
      });
      this._addMenuItem('fa-folder-plus', _t('ctx_new_folder', 'New Folder...'), '', () => {
        this.handleActionNewFolder(null);
      });
      this._addMenuSeparator();
      this._addMenuItem('fa-pen-to-square', _t('ctx_rename_proj', 'Rename Project...'), 'F2', () => {
        this.showProjectOptionsDialog();
      });
      this._addMenuItem('fa-trash-can', _t('ctx_delete', 'Delete Selected Item'), 'Del', () => {
        this.handleActionDeleteSelected();
      });
      this._addMenuSeparator();
      this._addMenuItem('fa-sliders', _t('ctx_proj_options', 'Project Options...'), '', () => {
        this.showProjectOptionsDialog();
      });
      this._addMenuItem('fa-file-zipper', _t('ctx_export_zip', 'Export Entire Project (.ZIP)...'), '', async () => {
        if (typeof window.handleDownloadZip === 'function') {
          window.handleDownloadZip();
        } else {
          await this.vfs.exportZip();
        }
      });

    } else if (targetType === 'folder' && node) {
      this._addMenuItem('fa-file-circle-plus', _t('ctx_new_file_in_folder', 'New File in Folder...'), '', () => {
        this.handleActionNewFile(node.id);
      });
      this._addMenuItem('fa-folder-plus', _t('ctx_new_subfolder', 'New Subfolder...'), '', () => {
        this.handleActionNewFolder(node.id);
      });
      this._addMenuSeparator();
      this._addMenuItem('fa-pen-to-square', _t('ctx_rename_folder', 'Rename Folder...'), 'F2', () => {
        this.handleActionRename(node.id);
      });
      this._addMenuItem('fa-trash-can', _t('ctx_delete', 'Delete Selected Item'), 'Del', () => {
        this.handleActionDeleteSelected(node.id);
      });

    } else if (targetType === 'file' && node) {
      this._addMenuItem('fa-file-circle-plus', _t('ctx_new_file', 'New Source File (.cpp, .h, .c)...'), 'Alt+N', () => {
        this.handleActionNewFile(null);
      });
      this._addMenuItem('fa-arrow-up-right-from-square', _t('ctx_open_file', 'Open File in Editor'), 'Enter', () => {
        this.vfs.openTab(node.id);
      });
      this._addMenuSeparator();
      this._addMenuItem('fa-pen-to-square', _t('ctx_rename_file', 'Rename File...'), 'F2', () => {
        this.handleActionRename(node.id);
      });
      this._addMenuItem('fa-trash-can', _t('ctx_delete', 'Delete Selected Item'), 'Del', () => {
        this.handleActionDeleteSelected(node.id);
      });
      this._addMenuSeparator();

      const isIncluded = (node.isUnit !== false);
      this._addMenuItem(
        isIncluded ? 'fa-check' : 'fa-ban',
        isIncluded ? _t('ctx_include_unit', 'Include in Project (Compile Unit)') : _t('ctx_exclude_unit', 'Exclude from Project (Do Not Compile)'),
        '',
        () => this.handleActionToggleUnit(node.id),
        isIncluded
      );

      this._addMenuItem('fa-download', _t('m_export_file', 'Export Current File (.cpp)'), '', () => {
        this._downloadSingleFile(node);
      });

    } else {
      this._addMenuItem('fa-file-circle-plus', _t('ctx_new_file', 'New Source File (.cpp, .h, .c)...'), 'Alt+N', () => {
        this.handleActionNewFile(null);
      });
      this._addMenuItem('fa-folder-plus', _t('ctx_new_folder', 'New Folder...'), '', () => {
        this.handleActionNewFolder(null);
      });
      this._addMenuSeparator();
      this._addMenuItem('fa-arrows-rotate', 'Refresh', '', () => {
        this.renderTree();
      });
    }

    this.elContextMenu.style.display = 'block';
    const menuWidth = this.elContextMenu.offsetWidth || 220;
    const menuHeight = this.elContextMenu.offsetHeight || 180;

    let posX = x;
    let posY = y;

    if (posX + menuWidth > window.innerWidth) {
      posX = Math.max(0, window.innerWidth - menuWidth - 6);
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = Math.max(0, window.innerHeight - menuHeight - 6);
    }

    this.elContextMenu.style.left = `${posX}px`;
    this.elContextMenu.style.top = `${posY}px`;
  }

  hideContextMenu() {
    if (this.elContextMenu) {
      this.elContextMenu.style.display = 'none';
    }
  }

  _addMenuItem(icon, label, shortcut, onClick, isChecked = false) {
    const item = document.createElement('div');
    item.className = 'win32-menu-item context-menu-item';

    const checkHtml = isChecked
      ? `<span class="win32-menu-check"><i class="fa-solid fa-check"></i></span>`
      : `<span class="win32-menu-item-icon"><i class="fa-solid ${icon}"></i></span>`;

    item.innerHTML = `
      ${checkHtml}
      <span class="win32-menu-item-text">${this._escapeHtml(label)}</span>
      ${shortcut ? `<span class="win32-menu-item-shortcut">${this._escapeHtml(shortcut)}</span>` : ''}
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideContextMenu();
      onClick();
    });

    this.elContextMenuItems.appendChild(item);
  }

  _addMenuSeparator() {
    const sep = document.createElement('div');
    sep.className = 'win32-menu-separator';
    this.elContextMenuItems.appendChild(sep);
  }

  _downloadSingleFile(node) {
    const blob = new Blob([node.content || ''], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  _bindTreeEvents() {
    if (!this.elTree) return;

    this.elTree.addEventListener('keydown', (e) => {
      const visibleRows = Array.from(this.elTree.querySelectorAll('.tree-node-row'));
      const currentIndex = visibleRows.findIndex(r => r.classList.contains('selected'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(visibleRows.length - 1, currentIndex + 1);
        if (visibleRows[nextIndex]) {
          this.selectNode(visibleRows[nextIndex].dataset.id);
          visibleRows[nextIndex].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        if (visibleRows[prevIndex]) {
          this.selectNode(visibleRows[prevIndex].dataset.id);
          visibleRows[prevIndex].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (this.selectedNodeId) {
          const node = this.vfs.getNodeById(this.selectedNodeId);
          if (node && node.type === 'folder' && !node.isExpanded) {
            this.vfs.setFolderExpanded(node.id, true);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (this.selectedNodeId) {
          const node = this.vfs.getNodeById(this.selectedNodeId);
          if (node && node.type === 'folder' && node.isExpanded) {
            this.vfs.setFolderExpanded(node.id, false);
          } else if (node && node.parentId) {
            this.selectNode(node.parentId);
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedNodeId) {
          const node = this.vfs.getNodeById(this.selectedNodeId);
          if (node && node.type === 'file') {
            this.vfs.openTab(node.id);
          } else if (node && node.type === 'folder') {
            this.vfs.setFolderExpanded(node.id, !node.isExpanded);
          }
        }
      } else if (e.key === 'Delete') {
        e.preventDefault();
        this.handleActionDeleteSelected();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (this.selectedNodeId && this.selectedNodeId !== 'project_root') {
          this.handleActionRename(this.selectedNodeId);
        }
      }
    });
  }

  _bindDialogEvents() {
    if (this.dlgInputClose) {
      this.dlgInputClose.addEventListener('click', () => this.hideInputDialog());
    }
    if (this.dlgInputCancel) {
      this.dlgInputCancel.addEventListener('click', () => this.hideInputDialog());
    }
    if (this.dlgInputVal) {
      this.dlgInputVal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.dlgInputOk.click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hideInputDialog();
        }
      });
    }

    const btnCloseOptions = document.getElementById('dlg-proj-btn-close');
    const btnCancelOptions = document.getElementById('dlg-proj-btn-cancel');
    const btnOkOptions = document.getElementById('dlg-proj-btn-ok');

    if (btnCloseOptions) btnCloseOptions.addEventListener('click', () => this.hideProjectOptionsDialog());
    if (btnCancelOptions) btnCancelOptions.addEventListener('click', () => this.hideProjectOptionsDialog());
    if (btnOkOptions) {
      btnOkOptions.addEventListener('click', () => {
        const inputName = document.getElementById('dlg-proj-input-name');
        if (inputName && inputName.value.trim()) {
          this.vfs.project.name = inputName.value.trim();
          this.vfs.persist();
          this.renderTree();
        }
        this.hideProjectOptionsDialog();
      });
    }

    document.querySelectorAll('.win32-dialog-tabs .win32-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.win32-dialog-tabs .win32-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.win32-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetPane = document.getElementById(`dlg-pane-${btn.dataset.tab}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  showInputDialog({ title, prompt, defaultValue, icon, onOk }) {
    if (!this.dlgInputOverlay) return;

    this.dlgInputTitle.innerText = title;
    this.dlgInputPrompt.innerText = prompt;
    this.dlgInputVal.value = defaultValue || '';
    this.dlgInputError.style.display = 'none';
    this.dlgInputError.innerText = '';

    const iconEl = document.getElementById('dlg-input-icon');
    if (iconEl && icon) {
      iconEl.className = `fa-solid ${icon}`;
    }

    this.dlgInputOverlay.style.display = 'flex';
    setTimeout(() => {
      this.dlgInputVal.focus();
      this.dlgInputVal.select();
    }, 50);

    this.dlgInputOk.onclick = () => {
      const val = this.dlgInputVal.value.trim();
      if (!val) {
        this.dlgInputError.innerText = window.I18N ? window.I18N.t('err_name_empty') : 'Name cannot be empty!';
        this.dlgInputError.style.display = 'block';
        return;
      }
      if (/[\\/:*?"<>|]/.test(val)) {
        this.dlgInputError.innerText = window.I18N ? window.I18N.t('err_name_invalid_chars') : 'Name cannot contain special characters: \\ / : * ? " < > |';
        this.dlgInputError.style.display = 'block';
        return;
      }
      this.hideInputDialog();
      onOk(val);
    };
  }

  hideInputDialog() {
    if (this.dlgInputOverlay) {
      this.dlgInputOverlay.style.display = 'none';
    }
  }

  showProjectOptionsDialog() {
    if (!this.dlgOptionsOverlay) return;

    const inputName = document.getElementById('dlg-proj-input-name');
    if (inputName) inputName.value = this.vfs.project.name || 'Project1';

    const unitList = document.getElementById('dlg-proj-unit-list');
    if (unitList) {
      unitList.innerHTML = '';
      const allFiles = this.vfs.getFiles();
      allFiles.forEach(f => {
        const item = document.createElement('div');
        item.style.padding = '2px 0';
        item.innerHTML = `
          <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
            <input type="checkbox" ${f.isUnit ? 'checked' : ''} disabled>
            <span>${this._escapeHtml(f.path)}</span>
            <span style="font-size:10px; opacity:0.6;">(${f.isUnit ? 'Unit: Compiled' : 'Header / Excluded'})</span>
          </label>
        `;
        unitList.appendChild(item);
      });
    }

    this.dlgOptionsOverlay.style.display = 'flex';
  }

  hideProjectOptionsDialog() {
    if (this.dlgOptionsOverlay) {
      this.dlgOptionsOverlay.style.display = 'none';
    }
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// ==========================================
// Multi-File Tabs Synchronization
// ==========================================
function initMultiTabs() {
  if (window.vfs && window.vfs.project) {
    workspaceFiles = window.vfs.getFlatFilesMap();
    const activeNode = window.vfs.getActiveFile();
    activeFile = activeNode ? activeNode.path : 'main.cpp';

    window.vfs.on('activeFileChanged', ({ newFileId, node }) => {
      const targetNode = node || (window.vfs && newFileId ? window.vfs.getNodeById(newFileId) : null);
      if (targetNode) {
        activeFile = targetNode.path;
        if (editor) {
          editor.updateOptions({ readOnly: false });
          if (editor.getValue() !== (targetNode.content || '')) {
            isProgrammaticEditorChange = true;
            try {
              editor.setValue(targetNode.content || '');
            } finally {
              isProgrammaticEditorChange = false;
            }
          }
          const ext = window.vfs.getExtension(targetNode.name);
          const mode = (ext === 'c') ? 'c' : 'cpp';
          if (typeof monaco !== 'undefined' && monaco.editor && editor.getModel()) {
            monaco.editor.setModelLanguage(editor.getModel(), mode);
          }
        }
        if (typeof workspaceFiles !== 'undefined') {
          workspaceFiles[activeFile] = targetNode.content || '';
        }
      } else {
        activeFile = null;
        if (editor) {
          isProgrammaticEditorChange = true;
          try {
            editor.setValue('');
            editor.updateOptions({ readOnly: true });
          } finally {
            isProgrammaticEditorChange = false;
          }
        }
      }
      renderFileTabs();
      updateStatusBarInfo();
      if (typeof updateWindowTitle === 'function') updateWindowTitle();
    });

    window.vfs.on('tabsChanged', () => {
      if (window.vfs) {
        const currentActive = window.vfs.getActiveFile();
        if (currentActive && (!activeFile || activeFile !== currentActive.path)) {
          activeFile = currentActive.path;
          if (editor) {
            editor.updateOptions({ readOnly: false });
            if (editor.getValue() !== (currentActive.content || '')) {
              isProgrammaticEditorChange = true;
              try {
                editor.setValue(currentActive.content || '');
              } finally {
                isProgrammaticEditorChange = false;
              }
            }
            const ext = window.vfs.getExtension(currentActive.name);
            const mode = (ext === 'c') ? 'c' : 'cpp';
            if (typeof monaco !== 'undefined' && monaco.editor && editor.getModel()) {
              monaco.editor.setModelLanguage(editor.getModel(), mode);
            }
          }
          if (typeof workspaceFiles !== 'undefined') {
            workspaceFiles[activeFile] = currentActive.content || '';
          }
        } else if (!currentActive) {
          activeFile = null;
          if (editor) {
            isProgrammaticEditorChange = true;
            try {
              editor.setValue('');
              editor.updateOptions({ readOnly: true });
            } finally {
              isProgrammaticEditorChange = false;
            }
          }
        }
      }
      renderFileTabs();
      updateStatusBarInfo();
      if (typeof updateWindowTitle === 'function') updateWindowTitle();
    });

    window.vfs.on('change', (event) => {
      if (event && ['create', 'delete', 'rename', 'unitToggle', 'fileUpdated'].includes(event.type)) {
        window.isBinaryStale = true;
        if (event.type === 'delete' || event.type === 'rename' || event.type === 'create') {
          window.hasCompiledBinary = false;
        }
        if (typeof updateWindowTitle === 'function') updateWindowTitle();
      }
    });
  } else {
    const savedFiles = localStorage.getItem('devcpp_files');
    if (savedFiles) {
      try {
        workspaceFiles = JSON.parse(savedFiles);
        if (!workspaceFiles || Object.keys(workspaceFiles).length === 0) {
          workspaceFiles = { 'main.cpp': editor ? editor.getValue() : CODE_TEMPLATES[0].code };
        }
      } catch (e) {
        workspaceFiles = { 'main.cpp': CODE_TEMPLATES[0].code };
      }
    } else {
      const savedCode = localStorage.getItem('devcpp_saved_code');
      workspaceFiles = { 'main.cpp': savedCode || CODE_TEMPLATES[0].code };
    }
    activeFile = Object.keys(workspaceFiles)[0] || 'main.cpp';
  }
  renderFileTabs();
}

function renderFileTabs() {
  if (!elEditorTabList) return;
  elEditorTabList.innerHTML = '';

  if (window.vfs && window.vfs.project) {
    const openIds = window.vfs.project.openFileIds || [];
    const activeId = window.vfs.project.activeFileId;

    openIds.forEach((fileId) => {
      const node = window.vfs.getNodeById(fileId);
      if (!node) return;

      const tabEl = document.createElement('div');
      const isActive = (fileId === activeId);
      tabEl.className = 'tab' + (isActive ? ' active' : '');
      tabEl.setAttribute('data-id', fileId);
      tabEl.setAttribute('data-file', node.path);

      const ext = window.vfs.getExtension(node.name);
      const isHeader = ['h', 'hpp', 'hh', 'hxx'].includes(ext);
      const iconClass = isHeader ? 'fa-solid fa-file-lines' : 'fa-solid fa-file-code';
      const iconColor = isHeader ? '#d97706' : (ext === 'c' ? '#0284c7' : '#0078d7');

      const closeTitle = window.I18N ? window.I18N.t('tab_close_file') : 'Close file';
      tabEl.innerHTML = `
        <i class="${iconClass}" style="color:${iconColor}; font-size:11px;"></i>
        <span class="tab-name">${escapeHtml(node.name)}</span>
        ${openIds.length > 1 ? `<span class="tab-close" title="${closeTitle}"><i class="fa-solid fa-xmark"></i></span>` : ''}
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) {
          e.stopPropagation();
          closeFileTab(fileId);
        } else {
          switchFileTab(fileId);
        }
      });

      elEditorTabList.appendChild(tabEl);
    });
    return;
  }

  // Fallback for non-VFS mode
  const fileNames = Object.keys(workspaceFiles);
  fileNames.forEach((fname) => {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab' + (fname === activeFile ? ' active' : '');
    tabEl.setAttribute('data-file', fname);

    const isHeader = fname.endsWith('.h') || fname.endsWith('.hpp');
    const iconClass = isHeader ? 'fa-solid fa-file-lines' : 'fa-solid fa-file-code';
    const iconColor = isHeader ? '#dcdcaa' : '#007acc';
    const closeTitle = window.I18N ? window.I18N.t('tab_close_file') : 'Close file';

    tabEl.innerHTML = `
      <i class="${iconClass}" style="color:${iconColor};"></i>
      <span class="tab-name">${escapeHtml(fname)}</span>
      ${fileNames.length > 1 ? `<span class="tab-close" title="${closeTitle}"><i class="fa-solid fa-xmark"></i></span>` : ''}
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) {
        e.stopPropagation();
        closeFileTab(fname);
      } else {
        switchFileTab(fname);
      }
    });

    elEditorTabList.appendChild(tabEl);
  });
}

function switchFileTab(fnameOrId) {
  if (window.vfs && window.vfs.project) {
    if (editor && activeFile) {
      const currentActive = window.vfs.getActiveFile();
      if (currentActive && (activeFile === currentActive.path || activeFile === currentActive.id)) {
        window.vfs.setFileContentInMemory(currentActive.id, editor.getValue());
      }
    }
    window.vfs.openTab(fnameOrId);
    const newActive = window.vfs.getActiveFile();
    if (editor && newActive) {
      activeFile = newActive.path;
      editor.updateOptions({ readOnly: false });
      isProgrammaticEditorChange = true;
      try {
        editor.setValue(newActive.content || '');
      } finally {
        isProgrammaticEditorChange = false;
      }
      const ext = window.vfs.getExtension(newActive.name);
      const mode = (ext === 'c') ? 'c' : 'cpp';
      if (typeof monaco !== 'undefined' && monaco.editor && editor.getModel()) {
        monaco.editor.setModelLanguage(editor.getModel(), mode);
      }
    }
    renderFileTabs();
    saveWorkspace();
    updateStatusBarInfo();
    if (typeof updateWindowTitle === 'function') updateWindowTitle();
    return;
  }

  const fname = fnameOrId;
  if (workspaceFiles[fname] === undefined) return;
  if (editor) {
    if (activeFile !== fname) {
      workspaceFiles[activeFile] = editor.getValue();
      activeFile = fname;
      isProgrammaticEditorChange = true;
      try {
        editor.setValue(workspaceFiles[fname]);
      } finally {
        isProgrammaticEditorChange = false;
      }
    }
    renderFileTabs();
    saveWorkspace();
    updateStatusBarInfo();
    if (typeof updateWindowTitle === 'function') updateWindowTitle();
  }
}

function addNewFileTab() {
  if (window.sidebarController) {
    window.sidebarController.handleActionNewFile();
    return;
  }
  const name = prompt(window.I18N ? window.I18N.t('prompt_new_file_name') : 'New file name (e.g. calc.cpp, utils.h):', 'utils.h');
  if (!name || !name.trim()) return;
  const cleanName = name.trim();
  if (window.vfs) {
    window.vfs.createFile(null, cleanName).then((fileNode) => {
      switchFileTab(fileNode.id);
    }).catch((err) => {
      alert(err.message);
    });
    return;
  }
  if (workspaceFiles[cleanName]) {
    alert(window.I18N ? window.I18N.t('alert_file_exists', { name: cleanName }) : 'File "' + cleanName + '" already exists!');
    switchFileTab(cleanName);
    return;
  }
  const isHeader = cleanName.endsWith('.h') || cleanName.endsWith('.hpp');
  const guard = cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const defaultContent = isHeader
    ? `#ifndef ${guard}_\n#define ${guard}_\n\n// Header declaration\n\n#endif // ${guard}_\n`
    : `// File: ${cleanName}\n#include <iostream>\n\nusing namespace std;\n\n`;

  if (editor) {
    workspaceFiles[activeFile] = editor.getValue();
  }
  workspaceFiles[cleanName] = defaultContent;
  switchFileTab(cleanName);
}

function closeFileTab(fnameOrId) {
  if (window.vfs && window.vfs.project) {
    const openIds = window.vfs.project.openFileIds || [];
    if (openIds.length <= 1) {
      alert(window.I18N ? window.I18N.t('alert_last_file') : 'Cannot close the last open file!');
      return;
    }
    window.vfs.closeTab(fnameOrId);
    const activeNode = window.vfs.getActiveFile();
    if (editor && activeNode) {
      activeFile = activeNode.path;
      editor.setValue(activeNode.content || '');
    }
    renderFileTabs();
    saveWorkspace();
    return;
  }

  const fname = fnameOrId;
  const keys = Object.keys(workspaceFiles);
  if (keys.length <= 1) {
    alert(window.I18N ? window.I18N.t('alert_last_file') : 'Cannot close the last open file!');
    return;
  }
  if (!confirm(window.I18N ? window.I18N.t('confirm_close_file', { name: fname }) : `Are you sure you want to close "${fname}"?`)) return;
  delete workspaceFiles[fname];
  if (activeFile === fname) {
    activeFile = Object.keys(workspaceFiles)[0];
    if (editor) {
      editor.setValue(workspaceFiles[activeFile]);
    }
  }
  renderFileTabs();
  saveWorkspace();
}

function saveWorkspace() {
  if (window.vfs) {
    if (editor && activeFile) {
      const activeNode = window.vfs.getActiveFile();
      if (activeNode && (activeFile === activeNode.path || activeFile === activeNode.id)) {
        window.vfs.setFileContentInMemory(activeNode.id, editor.getValue());
      }
    }
    window.vfs.persist();
    workspaceFiles = window.vfs.getFlatFilesMap();
    return;
  }

  if (editor && workspaceFiles[activeFile] !== undefined) {
    workspaceFiles[activeFile] = editor.getValue();
  }
  localStorage.setItem('devcpp_files', JSON.stringify(workspaceFiles));
  localStorage.setItem('devcpp_saved_code', workspaceFiles['main.cpp'] || (editor ? editor.getValue() : ''));
}

async function formatCode() {
  if (!editor) return;
  const formatAction = editor.getAction('editor.action.formatDocument');
  if (formatAction && formatAction.isSupported()) {
    try {
      await formatAction.run();
      updateStatus('ready', window.I18N ? window.I18N.t('status_astyle_formatted') : 'Source code formatted (AStyle Allman)');
      return;
    } catch (err) {
      console.warn('Monaco formatDocument action failed, using direct formatter:', err);
    }
  }

  // Direct fallback with Undo history preservation
  const model = editor.getModel();
  if (model) {
    const code = model.getValue();
    const formatted = window.DevCPPAStyle.format(code);
    if (formatted !== code) {
      editor.executeEdits('astyle-format', [{
        range: model.getFullModelRange(),
        text: formatted
      }]);
      editor.pushUndoStop();
    }
    updateStatus('ready', window.I18N ? window.I18N.t('status_astyle_formatted') : 'Source code formatted (AStyle Allman)');
  }
}

function copyConsoleOutput() {
  if (!term) return;
  let text = '';
  const buffer = term.buffer.active;
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    if (line) {
      text += line.translateToString(true) + '\n';
    }
  }
  const cleanText = text.trim();
  if (!cleanText) {
    alert(window.I18N ? window.I18N.t('alert_console_empty') : 'Console buffer is empty!');
    return;
  }
  navigator.clipboard.writeText(cleanText).then(() => {
    if (elBtnCopyTerm) {
      const orig = elBtnCopyTerm.innerHTML;
      const copiedText = window.I18N ? window.I18N.t('btn_copied') : 'Copied';
      elBtnCopyTerm.innerHTML = `<i class="fa-solid fa-check" style="color:#23d18b;"></i> ${copiedText}`;
      setTimeout(() => { elBtnCopyTerm.innerHTML = orig; }, 1500);
    }
  }).catch(() => {
    alert(window.I18N ? window.I18N.t('alert_copy_console_manual') : 'Unable to auto-copy. Please highlight text on the Console and press Ctrl+C.');
  });
}

function loadTemplate(tpl) {
  if (!tpl) return;
  if (editor) {
    editor.setValue(tpl.code);
    workspaceFiles[activeFile] = tpl.code;
    saveWorkspace();
  }
  // Always keep stdin input empty so user can type interactively directly in the terminal
  elStdinInput.value = '';
  currentTestcases = JSON.parse(JSON.stringify(tpl.testcases || []));
  renderTestcasesUI();
  clearDiagnostics();
}

function handleSave() {
  saveWorkspace();
  updateStatus('ready', window.I18N ? window.I18N.t('status_saved_vfs') : 'Saved source code and files to browser!');
  updateWindowTitle();
}

async function handleSaveAll() {
  if (editor && activeFile) {
    const val = editor.getValue();
    if (window.vfs) {
      window.vfs.setFileContentInMemory(activeFile, val);
    }
    if (typeof workspaceFiles !== 'undefined') {
      workspaceFiles[activeFile] = val;
    }
    localStorage.setItem('devcpp_saved_code', val);
  }
  if (window.vfs) {
    await window.vfs.persist();
  }
  saveWorkspace();
  updateStatus('ready', window.I18N ? window.I18N.t('status_saved_all') : 'Saved all files in project!');
  updateWindowTitle();
}

function handleCut() {
  if (!editor) return;
  editor.focus();
  const selection = editor.getSelection();
  if (selection && !selection.isEmpty()) {
    const text = editor.getModel().getValueInRange(selection);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    editor.trigger('toolbar', 'editor.action.clipboardCutAction');
  }
}

function handleCopy() {
  if (!editor) return;
  editor.focus();
  const selection = editor.getSelection();
  if (selection && !selection.isEmpty()) {
    const text = editor.getModel().getValueInRange(selection);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    editor.trigger('toolbar', 'editor.action.clipboardCopyAction');
  }
}

function handlePaste() {
  if (!editor) return;
  editor.focus();
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then((text) => {
      if (text && editor) {
        const selection = editor.getSelection();
        editor.executeEdits('toolbar-paste', [{
          range: selection,
          text: text,
          forceMoveMarkers: true
        }]);
      }
    }).catch(() => {
      if (editor) editor.trigger('toolbar', 'editor.action.clipboardPasteAction');
    });
  } else {
    editor.trigger('toolbar', 'editor.action.clipboardPasteAction');
  }
}

function handleFind() {
  if (!editor) return;
  editor.focus();
  const findAction = editor.getAction('actions.find');
  if (findAction) findAction.run();
}

function toggleInsertMode() {
  isOverwriteMode = !isOverwriteMode;
  const elInsMode = document.getElementById('editor-ins-mode');
  if (elInsMode) {
    elInsMode.innerText = isOverwriteMode ? 'Overwrite' : 'Insert';
    elInsMode.classList.toggle('overwrite', isOverwriteMode);
    elInsMode.title = window.I18N ? window.I18N.t('status_mode_tt') : (isOverwriteMode ? 'Overwrite Mode' : 'Insert Mode');
  }
  if (editor) {
    editor.updateOptions({ cursorStyle: isOverwriteMode ? 'block' : 'line' });
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  }
}

document.addEventListener('fullscreenchange', () => {
  const btnMax = document.querySelector('.devcpp-title-controls .win-btn[title="Phóng to"], .devcpp-title-controls .win-btn[title="Khôi phục"], .devcpp-title-controls .win-btn[title="Maximize"], .devcpp-title-controls .win-btn[title="Restore"]');
  if (btnMax) {
    btnMax.innerText = document.fullscreenElement ? '❐' : '□';
    const isVi = window.I18N && window.I18N.getLocale() === 'vi';
    btnMax.title = document.fullscreenElement ? (isVi ? 'Khôi phục' : 'Restore') : (isVi ? 'Phóng to' : 'Maximize');
  }
  if (editor) editor.layout();
  if (typeof fitAddon !== 'undefined' && fitAddon) fitAddon.fit();
});

function handleCloseAllTabs() {
  if (window.vfs && typeof window.vfs.closeAllTabs === 'function') {
    if (editor && activeFile) {
      const activeNode = window.vfs.getActiveFile();
      if (activeNode) {
        window.vfs.setFileContentInMemory(activeNode.id, editor.getValue());
      }
    }
    window.vfs.closeAllTabs();
    activeFile = null;
    if (editor) {
      editor.setValue('');
    }
    renderFileTabs();
    updateStatusBarInfo();
    updateWindowTitle();
    updateStatus('ready', window.I18N ? window.I18N.t('status_all_files_closed') : 'All files closed.');
  } else {
    workspaceFiles = {};
    activeFile = null;
    if (editor) editor.setValue('');
    renderFileTabs();
    updateStatusBarInfo();
    updateWindowTitle();
  }
  updateWindowFileListMenu();
}

function updateWindowFileListMenu() {
  const container = document.getElementById('menu-window-file-list');
  if (!container) return;
  container.innerHTML = '';

  let filesList = [];
  let currentActiveId = null;

  if (window.vfs && window.vfs.project) {
    const openIds = window.vfs.project.openFileIds || [];
    currentActiveId = window.vfs.project.activeFileId;
    openIds.forEach((fileId, idx) => {
      const node = window.vfs.getNodeById(fileId);
      if (node) {
        filesList.push({
          id: fileId,
          name: node.name,
          path: node.path,
          isActive: (fileId === currentActiveId),
          index: idx + 1
        });
      }
    });
  } else if (typeof workspaceFiles !== 'undefined') {
    const keys = Object.keys(workspaceFiles);
    keys.forEach((fname, idx) => {
      filesList.push({
        id: fname,
        name: fname,
        path: fname,
        isActive: (fname === activeFile),
        index: idx + 1
      });
    });
  }

  if (filesList.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'menu-row disabled';
    emptyRow.style.color = 'var(--text-muted)';
    emptyRow.style.fontStyle = 'italic';
    emptyRow.style.paddingLeft = '24px';
    emptyRow.innerText = window.I18N ? window.I18N.t('status_empty_open_files') : '(No open files)';
    container.appendChild(emptyRow);
    return;
  }

  filesList.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'menu-row' + (f.isActive ? ' active-window-file' : '');
    const checkIcon = f.isActive
      ? `<i class="fa-solid fa-check" style="color:#107c41; margin-right:8px; width:12px;"></i>`
      : `<span style="display:inline-block; width:20px;"></span>`;

    const isHeader = f.name.endsWith('.h') || f.name.endsWith('.hpp');
    const fileIcon = isHeader
      ? `<i class="fa-solid fa-file-lines" style="color:#d97706; margin-right:6px; font-size:11px;"></i>`
      : `<i class="fa-solid fa-file-code" style="color:#0078d7; margin-right:6px; font-size:11px;"></i>`;

    row.innerHTML = `${checkIcon}${fileIcon}<span>${f.index} ${escapeHtml(f.name)}</span>`;

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllMenus();
      switchFileTab(f.id);
    });

    container.appendChild(row);
  });
}

function updateWindowTitle() {
  const elTitle = document.getElementById('devcpp-window-title');
  if (!elTitle) return;
  const projName = (window.vfs && window.vfs.project && window.vfs.project.name) || 'Project1';
  const activeNode = window.vfs ? window.vfs.getActiveFile() : null;
  const fileName = activeNode ? activeNode.name : (activeFile || 'main.cpp');
  const dirty = (window.isBinaryStale) ? '*' : '';
  elTitle.innerText = `Dev-C++ 5.11 - [${projName}\\${fileName}${dirty}]`;
}
window.updateWindowTitle = updateWindowTitle;

function showUncompiledWarningDialog(forceNative = false) {
  const message = window.I18N ? window.I18N.t('alert_uncompiled') : 'Project has not been compiled yet, please press F9 or F11 first';

  // 1. Always update Status Bar
  updateStatus('error', message);

  // 2. If native alert is forced or requested
  if (forceNative || window.useNativeAlert) {
    window.alert(message);
    return;
  }

  // 3. Otherwise show authentic Win32 Modal Dialog
  const overlay = document.getElementById('dialog-alert-overlay');
  if (overlay) {
    const msgEl = document.getElementById('dlg-alert-message');
    if (msgEl) msgEl.innerText = message;
    overlay.style.display = 'flex';
    const btnOk = document.getElementById('dlg-alert-btn-ok');
    if (btnOk) {
      setTimeout(() => btnOk.focus(), 10);
    }
  } else {
    // Graceful fallback to native alert if modal DOM not found
    window.alert(message);
  }
}

function closeWin32Alert() {
  const overlay = document.getElementById('dialog-alert-overlay');
  if (overlay) overlay.style.display = 'none';
  if (editor) editor.focus();
}

function initWin32AlertDialog() {
  const overlay = document.getElementById('dialog-alert-overlay');
  const btnOk = document.getElementById('dlg-alert-btn-ok');
  const btnClose = document.getElementById('dlg-alert-btn-close');

  if (btnOk) btnOk.addEventListener('click', closeWin32Alert);
  if (btnClose) btnClose.addEventListener('click', closeWin32Alert);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeWin32Alert();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (overlay && overlay.style.display !== 'none') {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        closeWin32Alert();
      }
    }
  });
}

window.showUncompiledWarningDialog = showUncompiledWarningDialog;
window.closeWin32Alert = closeWin32Alert;

function handleNew() {
  if (confirm(window.I18N ? window.I18N.t('confirm_new_file_prompt') : 'Create new file? Make sure you have saved your current changes.')) {
    loadTemplate(CODE_TEMPLATES[0]);
  }
}

function handleExportSingleSourceFile() {
  if (window.vfs) {
    const activeNode = window.vfs.getActiveFile();
    if (activeNode) {
      const code = editor ? editor.getValue() : (activeNode.content || '');
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = activeNode.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 200);
      return;
    }
  }
  if (!editor) return;
  const code = editor.getValue();
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = activeFile || 'main.cpp';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 200);
}

async function handleDownloadZip() {
  if (window.vfs) {
    updateStatus('busy', window.I18N ? window.I18N.t('status_zipping_project') : 'Compressing project to .ZIP...');
    try {
      if (editor) {
        const activeNode = window.vfs.getActiveFile();
        if (activeNode) {
          activeNode.content = editor.getValue();
        }
      }
      await window.vfs.downloadZip();
      updateStatus('ready', window.I18N ? window.I18N.t('status_zipped_success') : 'Project .ZIP file downloaded!');
    } catch (err) {
      console.error('ZIP Export Error:', err);
      const errPrefix = window.I18N ? window.I18N.t('alert_zip_error') : 'ZIP Export Error: ';
      alert(errPrefix + err.message);
      updateStatus('ready', errPrefix + err.message);
    }
  }
}
window.handleDownloadZip = handleDownloadZip;

async function handleDownload() {
  await handleDownloadZip();
}

function handleOpen() {
  document.getElementById('file-input').click();
}

document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    if (editor) {
      const fileName = file.name;
      workspaceFiles[fileName] = event.target.result;
      switchFileTab(fileName);
      updateStatus('ready', window.I18N ? window.I18N.t('status_file_opened', { name: fileName }) : `Opened file: ${fileName}`);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ==========================================
// 8. Bottom Dock Tabs, Splitter & Controls
// ==========================================
let lastDockHeight = 220;

function switchDockTab(targetId) {
  if (!targetId) return;

  // Update tabs
  document.querySelectorAll('#devcpp-bottom-dock .dock-tab, .right-pane .tab-bar .tab').forEach((tab) => {
    const isTarget = tab.dataset.target === targetId || tab.getAttribute('data-alias-id') === targetId || tab.id === targetId;
    tab.classList.toggle('active', isTarget);
    if (tab.hasAttribute('aria-selected')) {
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    }
  });

  // Update panels
  document.querySelectorAll('#devcpp-bottom-dock .panel-content, .right-pane .panel-content').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetId);
  });

  // If dock was collapsed, restore it when switching tab
  const bottomDock = document.getElementById('devcpp-bottom-dock');
  if (bottomDock && (bottomDock.classList.contains('collapsed') || bottomDock.getBoundingClientRect().height <= 36)) {
    bottomDock.classList.remove('collapsed');
    const restoreHeight = (lastDockHeight && lastDockHeight > 36) ? lastDockHeight : 220;
    bottomDock.style.height = `${restoreHeight}px`;
    const icon = document.getElementById('icon-dock-toggle');
    if (icon) {
      icon.classList.remove('fa-chevron-up');
      icon.classList.add('fa-chevron-down');
    }
    if (editor) editor.layout();
  }
}

function switchRightTab(targetId) {
  switchDockTab(targetId);
}

function toggleBottomDock() {
  const bottomDock = document.getElementById('devcpp-bottom-dock');
  const icon = document.getElementById('icon-dock-toggle');
  if (!bottomDock) return;

  const isCollapsed = bottomDock.classList.contains('collapsed') || bottomDock.getBoundingClientRect().height <= 36;
  if (isCollapsed) {
    bottomDock.classList.remove('collapsed');
    const restoreHeight = (lastDockHeight && lastDockHeight > 36) ? lastDockHeight : 220;
    bottomDock.style.height = `${restoreHeight}px`;
    if (icon) {
      icon.classList.remove('fa-chevron-up');
      icon.classList.add('fa-chevron-down');
    }
  } else {
    const currentH = bottomDock.getBoundingClientRect().height;
    if (currentH > 36) {
      lastDockHeight = currentH;
    }
    bottomDock.classList.add('collapsed');
    bottomDock.style.height = '32px';
    if (icon) {
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-up');
    }
  }
  if (editor) editor.layout();
}

function initBottomDock() {
  // Tab click listeners
  document.querySelectorAll('#devcpp-bottom-dock .dock-tab, .right-pane .tab-bar .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchDockTab(tab.dataset.target);
    });
  });

  // Window control buttons
  const btnToggle = document.getElementById('btn-dock-toggle');
  if (btnToggle) btnToggle.addEventListener('click', toggleBottomDock);

  const btnClose = document.getElementById('btn-dock-close');
  if (btnClose) btnClose.addEventListener('click', toggleBottomDock);

  // Horizontal Resizable Splitter
  const splitterBottom = document.getElementById('splitter-bottom');
  const bottomDock = document.getElementById('devcpp-bottom-dock');
  const centerContainer = document.getElementById('devcpp-workspace-center');

  if (splitterBottom && bottomDock) {
    let isDraggingBottom = false;
    let startY = 0;
    let startHeight = 0;
    let containerHeight = 0;

    splitterBottom.addEventListener('mousedown', (e) => {
      isDraggingBottom = true;
      startY = e.clientY;
      startHeight = bottomDock.getBoundingClientRect().height;
      containerHeight = centerContainer ? centerContainer.getBoundingClientRect().height : window.innerHeight;
      splitterBottom.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingBottom) return;
      if (bottomDock.classList.contains('collapsed')) {
        bottomDock.classList.remove('collapsed');
        const icon = document.getElementById('icon-dock-toggle');
        if (icon) {
          icon.classList.remove('fa-chevron-up');
          icon.classList.add('fa-chevron-down');
        }
      }
      const deltaY = e.clientY - startY;
      const newHeight = startHeight - deltaY;
      const minHeight = 100; // TC-B12-03
      const maxHeight = containerHeight * 0.8; // TC-B12-04
      const clamped = Math.max(minHeight, Math.min(newHeight, maxHeight));
      bottomDock.style.height = `${clamped}px`;
      lastDockHeight = clamped;
      requestAnimationFrame(() => {
        if (editor) editor.layout();
      });
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingBottom) {
        isDraggingBottom = false;
        splitterBottom.classList.remove('dragging');
        document.body.style.cursor = 'default';
        if (editor) editor.layout();
      }
    });

    // Double-click quick collapse (TC-B12-05)
    splitterBottom.addEventListener('dblclick', () => {
      toggleBottomDock();
    });
  }

  // Error List filter buttons
  const btnFilterAll = document.getElementById('btn-err-filter-all');
  const btnFilterErrors = document.getElementById('btn-err-filter-errors');
  const btnFilterWarnings = document.getElementById('btn-err-filter-warnings');

  function applyErrorFilter(filter) {
    [btnFilterAll, btnFilterErrors, btnFilterWarnings].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (filter === 'all' && btnFilterAll) btnFilterAll.classList.add('active');
    if (filter === 'error' && btnFilterErrors) btnFilterErrors.classList.add('active');
    if (filter === 'warning' && btnFilterWarnings) btnFilterWarnings.classList.add('active');

    const rows = document.querySelectorAll('#log-table-body tr.log-row, #error-list-body tr.log-row');
    rows.forEach(r => {
      if (filter === 'all') {
        r.style.display = '';
      } else if (filter === 'error') {
        r.style.display = r.classList.contains('error') ? '' : 'none';
      } else if (filter === 'warning') {
        r.style.display = r.classList.contains('warning') ? '' : 'none';
      }
    });
  }

  if (btnFilterAll) btnFilterAll.addEventListener('click', () => applyErrorFilter('all'));
  if (btnFilterErrors) btnFilterErrors.addEventListener('click', () => applyErrorFilter('error'));
  if (btnFilterWarnings) btnFilterWarnings.addEventListener('click', () => applyErrorFilter('warning'));

  // Copy and Clear buttons in Compiler Log
  const btnCopyLog = document.getElementById('btn-copy-log');
  if (btnCopyLog) {
    btnCopyLog.addEventListener('click', () => {
      if (elRawLogOutput) {
        navigator.clipboard.writeText(elRawLogOutput.innerText || '').catch(() => {});
      }
    });
  }
  const btnClearLog = document.getElementById('btn-clear-log');
  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      if (elRawLogOutput) elRawLogOutput.innerHTML = '';
    });
  }
}

// ==========================================
// Win32 cmd.exe Pop-up Window Controller
// ==========================================
window.cmdWindow = {
  element: null,
  titleText: null,
  isMaximized: false,
  isMinimized: false,
  prevGeometry: null,
  isWaitingToClose: false,

  init() {
    this.element = document.getElementById('win32-cmd-window');
    this.titleText = document.getElementById('cmd-title-text');
    if (!this.element) return;

    this.bindDragging();
    this.bindResizing();
    this.bindButtons();

    // Default centered position
    const w = 680;
    const h = 420;
    const left = Math.max(20, Math.round((window.innerWidth - w) / 2));
    const top = Math.max(40, Math.round((window.innerHeight - h) / 2));
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.element.style.width = `${w}px`;
    this.element.style.height = `${h}px`;
    this.element.style.display = 'none';

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (fitAddon && this.element.style.display !== 'none') {
          try { fitAddon.fit(); } catch (e) {}
        }
      });
      ro.observe(this.element);
    }
  },

  open(title) {
    if (!this.element) this.element = document.getElementById('win32-cmd-window');
    if (!this.element) return;

    const activeFileName = window.activeFile || 'main.cpp';
    const exeName = activeFileName.replace(/\.[^.]+$/, '.exe');
    const defaultTitle = `C:\\Projects\\Project1\\${exeName}`;
    if (this.titleText) {
      this.titleText.innerText = title || defaultTitle;
    }

    // Un-minimize cleanly if previously minimized
    if (this.isMinimized) {
      this.isMinimized = false;
      this.element.classList.remove('minimized');
    }

    // Clamp within viewport bounds (unless maximized)
    if (!this.isMaximized) {
      let w = parseInt(this.element.style.width, 10);
      let h = parseInt(this.element.style.height, 10);
      if (isNaN(w) || w < 380) w = 680;
      if (isNaN(h) || h < 220) h = 420;

      // Fit within current browser viewport dimensions
      w = Math.min(w, Math.max(380, window.innerWidth - 40));
      h = Math.min(h, Math.max(220, window.innerHeight - 60));

      let left = parseInt(this.element.style.left, 10);
      let top = parseInt(this.element.style.top, 10);

      if (isNaN(left) || isNaN(top)) {
        left = Math.max(20, Math.round((window.innerWidth - w) / 2));
        top = Math.max(40, Math.round((window.innerHeight - h) / 2));
      } else {
        const maxLeft = Math.max(0, window.innerWidth - w);
        const maxTop = Math.max(0, window.innerHeight - h);
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));
      }

      this.element.style.left = `${left}px`;
      this.element.style.top = `${top}px`;
      this.element.style.width = `${w}px`;
      this.element.style.height = `${h}px`;
    }

    this.element.style.display = 'flex';
    this.isWaitingToClose = false;
    window.isWaitingToClose = false;

    requestAnimationFrame(() => {
      if (fitAddon) {
        try { fitAddon.fit(); } catch (e) {}
      }
      if (term) {
        term.focus();
      }
    });
  },

  close() {
    if (!this.element) return;
    this.element.style.display = 'none';
    this.isWaitingToClose = false;
    window.isWaitingToClose = false;

    // Un-minimize cleanly on close so subsequent open is restored
    if (this.isMinimized) {
      this.isMinimized = false;
      this.element.classList.remove('minimized');
    }

    if (isProgramRunning) {
      handleStop();
    }

    if (editor) {
      editor.focus();
    }
  },

  toggleMaximize() {
    if (!this.element) return;
    if (this.isMaximized) {
      if (this.prevGeometry) {
        this.element.style.left = this.prevGeometry.left;
        this.element.style.top = this.prevGeometry.top;
        this.element.style.width = this.prevGeometry.width;
        this.element.style.height = this.prevGeometry.height;
      }
      this.element.classList.remove('maximized');
      this.isMaximized = false;
      const btn = document.getElementById('btn-cmd-max');
      if (btn) btn.innerText = '□';
    } else {
      this.prevGeometry = {
        left: this.element.style.left,
        top: this.element.style.top,
        width: this.element.style.width,
        height: this.element.style.height
      };
      this.element.classList.add('maximized');
      this.isMaximized = true;
      const btn = document.getElementById('btn-cmd-max');
      if (btn) btn.innerText = '❐';
    }
    requestAnimationFrame(() => {
      if (fitAddon) fitAddon.fit();
    });
  },

  toggleMinimize() {
    if (!this.element) return;
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.element.classList.add('minimized');
    } else {
      this.element.classList.remove('minimized');
      requestAnimationFrame(() => {
        if (fitAddon) fitAddon.fit();
      });
    }
  },

  bindDragging() {
    const titlebar = document.getElementById('cmd-titlebar');
    if (!titlebar) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.cmd-title-btn')) return;
      if (this.isMaximized) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const maxLeft = Math.max(0, window.innerWidth - 120);
        const maxTop = Math.max(0, window.innerHeight - 36);
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        this.element.style.left = `${newLeft}px`;
        this.element.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  },

  bindResizing() {
    const handles = this.element.querySelectorAll('.cmd-resize-handle');
    handles.forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isMaximized) return;

        const dir = handle.dataset.dir;
        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = this.element.getBoundingClientRect();

        const onMouseMove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          let newWidth = startRect.width;
          let newHeight = startRect.height;
          let newLeft = startRect.left;
          let newTop = startRect.top;

          if (dir.includes('e')) newWidth = Math.max(380, startRect.width + dx);
          if (dir.includes('s')) newHeight = Math.max(220, startRect.height + dy);
          if (dir.includes('w')) {
            const possibleWidth = startRect.width - dx;
            if (possibleWidth >= 380) {
              newWidth = possibleWidth;
              newLeft = startRect.left + dx;
            }
          }
          if (dir.includes('n')) {
            const possibleHeight = startRect.height - dy;
            if (possibleHeight >= 220) {
              newHeight = possibleHeight;
              newTop = startRect.top + dy;
            }
          }

          this.element.style.width = `${newWidth}px`;
          this.element.style.height = `${newHeight}px`;
          this.element.style.left = `${newLeft}px`;
          this.element.style.top = `${newTop}px`;

          if (fitAddon) fitAddon.fit();
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  },

  bindButtons() {
    const btnMin = document.getElementById('btn-cmd-min');
    const btnMax = document.getElementById('btn-cmd-max');
    const btnClose = document.getElementById('btn-cmd-close');

    if (btnMin) btnMin.addEventListener('click', () => this.toggleMinimize());
    if (btnMax) btnMax.addEventListener('click', () => this.toggleMaximize());
    if (btnClose) btnClose.addEventListener('click', () => this.close());
  }
};

window.openCmdWindow = function(title) {
  window.cmdWindow.open(title);
};

window.closeCmdWindow = function() {
  window.cmdWindow.close();
};

// Themes
if (elThemeSelect) {
  elThemeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
}

// Language Selector (Toolbar Quick Switch)
if (elLangSelect) {
  if (window.I18N) {
    elLangSelect.value = window.I18N.getLocale();
  }
  elLangSelect.addEventListener('change', (e) => {
    if (window.I18N) {
      window.I18N.setLocale(e.target.value);
    }
  });
  if (window.I18N) {
    window.I18N.onLocaleChange((locale) => {
      if (elLangSelect.value !== locale) {
        elLangSelect.value = locale;
        elLangSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
}

function applyTheme(theme) {
  document.body.className = '';
  if (theme === 'classic') {
    document.body.classList.add('theme-classic');
    if (editor) monaco.editor.setTheme('devcpp-classic');
    if (term) term.options.theme = { background: '#000000', foreground: '#cccccc', cursor: '#ffffff' };
  } else if (theme === 'dracula') {
    document.body.classList.add('theme-dracula');
    if (editor) monaco.editor.setTheme('vs-dark');
    if (term) term.options.theme = { background: '#282a36', foreground: '#f8f8f2', cursor: '#ffffff' };
  } else {
    // dark
    if (editor) monaco.editor.setTheme('vs-dark');
    if (term) term.options.theme = { background: '#0c0c0c', foreground: '#cccccc', cursor: '#ffffff' };
  }
}

// Font size (toolbar or zoom shortcuts)
if (elFontSizeSelect) {
  elFontSizeSelect.addEventListener('change', (e) => {
    const sz = parseInt(e.target.value, 10);
    if (editor) editor.updateOptions({ fontSize: sz });
    if (term) {
      term.options.fontSize = sz;
      if (fitAddon) fitAddon.fit();
    }
  });
}

// Global Ctrl + '+' / '=' / '-' / '0' Editor Zoom Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && !e.altKey && !e.shiftKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      if (window.editor) {
        const cur = window.editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
        window.editor.updateOptions({ fontSize: Math.min(cur + 1, 36) });
      }
    } else if (e.key === '-') {
      e.preventDefault();
      if (window.editor) {
        const cur = window.editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
        window.editor.updateOptions({ fontSize: Math.max(cur - 1, 9) });
      }
    } else if (e.key === '0') {
      e.preventDefault();
      if (window.editor) {
        window.editor.updateOptions({ fontSize: 14 });
      }
    }
  }
});

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'F9') {
    e.preventDefault();
    handleCompile();
  } else if (e.key === 'F10') {
    e.preventDefault();
    handleRun();
  } else if (e.key === 'F11') {
    e.preventDefault();
    handleCompileAndRun();
  } else if (e.key === 'F12') {
    e.preventDefault();
    handleRebuild();
  } else if (e.key === 'F8') {
    e.preventDefault();
    handleRunTests();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================
// 9. Startup & Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  populateTemplates();
  initTerminal();
  initMonaco();
  initWorker();
  initBottomDock();
  if (window.cmdWindow) window.cmdWindow.init();

  // Register I18N dynamic UI updates
  if (window.I18N) {
    window.I18N.onLocaleChange((locale) => {
      window.I18N.apply();
      if (elStatusText && (elStatusText.innerText.includes('ready') || elStatusText.innerText.includes('sẵn sàng'))) {
        updateStatus('ready', window.I18N.t('status_ready'));
      }
      if (window.sidebarController) {
        window.sidebarController.renderTree();
      }
      renderFileTabs();
      renderTestcasesUI();
      updateStatusBarInfo();
      updateWindowTitle();
      updateWindowFileListMenu();
      const emptyTd = document.querySelector('#log-table-body td.empty-message');
      if (emptyTd) {
        emptyTd.innerHTML = `<i class="fa-regular fa-circle-check" style="color:#22c55e; margin-right:6px;"></i> ${window.I18N.t('err_empty_msg')}`;
      }
      const elSummary = document.getElementById('error-list-summary-text');
      if (elSummary && (elSummary.innerText.includes('0 Lỗi') || elSummary.innerText.includes('0 Errors'))) {
        elSummary.innerText = window.I18N.t('err_summary_zero');
      }
      if (elRawLogOutput && (elRawLogOutput.innerText.includes('Compiler Ready') || elRawLogOutput.innerText.includes('Sẵn sàng') || elRawLogOutput.innerText.includes('Ready to compile'))) {
        elRawLogOutput.innerText = window.I18N.t('dock_log_ready');
      }
    });
  }
  if (window.vfs) {
    window.vfs.init().then(() => {
      window.sidebarController = new VFSSidebarController(window.vfs);
      window.sidebarController.init();
      initMultiTabs();
      if (editor) {
        const activeNode = window.vfs.getActiveFile();
        if (activeNode) {
          editor.setValue(activeNode.content || '');
          activeFile = activeNode.path;
        }
      }
    }).catch((err) => {
      console.error('VFS Initialization failed:', err);
      initMultiTabs();
    });
  } else {
    initMultiTabs();
  }

  // Button Listeners
  document.getElementById('btn-compile').addEventListener('click', handleCompile);
  document.getElementById('btn-run').addEventListener('click', handleRun);
  document.getElementById('btn-compile-run').addEventListener('click', handleCompileAndRun);
  document.getElementById('btn-run-tests').addEventListener('click', handleRunTests);
  document.getElementById('btn-stop').addEventListener('click', handleStop);
  document.getElementById('btn-new').addEventListener('click', handleNew);
  document.getElementById('btn-open').addEventListener('click', handleOpen);
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-download').addEventListener('click', handleDownloadZip);

  // Feature F17: Toolbar Row 1 Actions
  const btnSaveAll = document.getElementById('btn-save-all');
  if (btnSaveAll) btnSaveAll.addEventListener('click', handleSaveAll);

  const btnUndo = document.getElementById('btn-undo');
  if (btnUndo) btnUndo.addEventListener('click', () => { if (editor) { editor.focus(); editor.trigger('toolbar', 'undo'); } });

  const btnRedo = document.getElementById('btn-redo');
  if (btnRedo) btnRedo.addEventListener('click', () => { if (editor) { editor.focus(); editor.trigger('toolbar', 'redo'); } });

  const btnCut = document.getElementById('btn-cut');
  if (btnCut) btnCut.addEventListener('click', handleCut);

  const btnCopy = document.getElementById('btn-copy');
  if (btnCopy) btnCopy.addEventListener('click', handleCopy);

  const btnPaste = document.getElementById('btn-paste');
  if (btnPaste) btnPaste.addEventListener('click', handlePaste);

  const btnFind = document.getElementById('btn-find');
  if (btnFind) btnFind.addEventListener('click', handleFind);

  // Status Bar Insert Mode Interactive Toggle
  const elInsMode = document.getElementById('editor-ins-mode');
  if (elInsMode) elInsMode.addEventListener('click', toggleInsertMode);

  // Feature F23: Compiler Profile Selector
  const selectCompiler = document.getElementById('select-compiler');
  if (selectCompiler) {
    selectCompiler.addEventListener('change', () => {
      const statusCompiler = document.getElementById('status-compiler');
      if (statusCompiler) {
        statusCompiler.innerText = selectCompiler.value === 'tdm32' ? 'TDM-GCC 4.9.2 32-bit' : 'TDM-GCC 4.9.2 64-bit';
      }
    });
  }

  // Feature F22: Sidebar Tab Switcher ("Classes" vs "Project")
  const tabProject = document.getElementById('sidebar-tab-project');
  const tabClasses = document.getElementById('sidebar-tab-classes');
  if (tabClasses) {
    tabClasses.addEventListener('click', () => {
      if (tabProject) tabProject.classList.remove('active');
      tabClasses.classList.add('active');
      const tree = document.getElementById('project-tree');
      if (tree) {
        tree.innerHTML = `
          <div class="tree-node root-node" style="padding:4px 8px; color:#555;">
            <i class="fa-solid fa-tags" style="color:#7b1fa2; margin-right:4px;"></i>
            <span>Classes &amp; Structs</span>
          </div>
          <div class="tree-node child-node" style="padding:2px 18px; color:#666; font-size:11px;">
            <i class="fa-solid fa-cube" style="color:#0078d7; margin-right:4px;"></i>
            <span>${window.I18N ? window.I18N.t('status_empty_classes') : '(No classes defined)'}</span>
          </div>
        `;
      }
    });
  }

  if (tabProject) {
    tabProject.addEventListener('click', () => {
      if (tabClasses) tabClasses.classList.remove('active');
      tabProject.classList.add('active');
      if (window.sidebarController) {
        window.sidebarController.renderTree();
      }
    });
  }

  // Feature F22: Titlebar Controls (─ □ ✕)
  const btnTitleMax = document.querySelector('.devcpp-title-controls .win-btn[title="Phóng to"], .devcpp-title-controls .win-btn[title="Khôi phục"], .devcpp-title-controls .win-btn[title="Maximize"], .devcpp-title-controls .win-btn[title="Restore"]');
  if (btnTitleMax) btnTitleMax.addEventListener('click', toggleFullscreen);

  const btnTitleMin = document.querySelector('.devcpp-title-controls .win-btn[title="Thu nhỏ"], .devcpp-title-controls .win-btn[title="Minimize"]');
  if (btnTitleMin) {
    btnTitleMin.addEventListener('click', () => {
      updateStatus('ready', 'Dev-C++ 5.11 Web Edition');
    });
  }

  const btnTitleClose = document.querySelector('.devcpp-title-controls .win-btn.win-close');
  if (btnTitleClose) {
    btnTitleClose.addEventListener('click', () => {
      if (confirm(window.I18N ? window.I18N.t('confirm_close_window') : 'Close Dev-C++ 5.11 Web Edition? Make sure all files are saved.')) {
        updateStatus('ready', window.I18N ? window.I18N.t('status_state_saved') : 'Project state saved');
      }
    });
  }

  // Feature F19: Win32 Modal Alert Dialog Initialization
  initWin32AlertDialog();
  updateWindowTitle();
  
  const btnRebuild = document.getElementById('btn-rebuild');
  if (btnRebuild) btnRebuild.addEventListener('click', handleRebuild);

  // Initialize Dev-C++ Menubar & Sidebar & Custom Dropdowns
  initMenuBar();
  initSidebarResizer();
  initDevCppCustomCombos();

  document.getElementById('btn-clear-term').addEventListener('click', () => {
    if (term) {
      term.clear();
      printBanner();
    }
  });
  document.getElementById('btn-add-testcase').addEventListener('click', addTestcase);
  document.getElementById('btn-reset-testcases').addEventListener('click', () => {
    const tplId = elTemplateSelect ? elTemplateSelect.value : null;
    const currentTpl = (tplId ? CODE_TEMPLATES.find((t) => t.id === tplId) : null) || CODE_TEMPLATES[0];
    currentTestcases = JSON.parse(JSON.stringify(currentTpl.testcases || []));
    renderTestcasesUI();
  });

  const btnFillSample = document.getElementById('btn-fill-sample-stdin');
  if (btnFillSample) {
    btnFillSample.addEventListener('click', () => {
      const tplId = elTemplateSelect ? elTemplateSelect.value : null;
      const currentTpl = (tplId ? CODE_TEMPLATES.find((t) => t.id === tplId) : null) || CODE_TEMPLATES[0];
      if (currentTpl && currentTpl.defaultStdin) {
        elStdinInput.value = currentTpl.defaultStdin;
        updateStatus('ready', window.I18N ? window.I18N.t('status_input_loaded') : 'Sample data loaded into Input tab!');
      } else {
        updateStatus('ready', window.I18N ? window.I18N.t('status_input_no_sample') : 'This problem has no sample input.');
      }
    });
  }

  const btnClearStdin = document.getElementById('btn-clear-stdin');
  if (btnClearStdin) {
    btnClearStdin.addEventListener('click', () => {
      elStdinInput.value = '';
      updateStatus('ready', window.I18N ? window.I18N.t('status_input_cleared') : 'Input tab cleared!');
    });
  }

  // Formatting & Multi-tabs
  const btnFormat = document.getElementById('btn-format');
  if (btnFormat) btnFormat.addEventListener('click', formatCode);

  const btnCopyTerm = document.getElementById('btn-copy-term');
  if (btnCopyTerm) btnCopyTerm.addEventListener('click', copyConsoleOutput);

  const btnAddFile = document.getElementById('btn-add-file');
  if (btnAddFile) btnAddFile.addEventListener('click', addNewFileTab);

  // Interactive Console Input Bar
  const btnSendInput = document.getElementById('btn-send-input');
  if (btnSendInput) {
    btnSendInput.addEventListener('click', () => {
      if (elTerminalInteractiveInput) {
        sendStdinLine(elTerminalInteractiveInput.value);
        elTerminalInteractiveInput.value = '';
      }
    });
  }

  const btnInputEof = document.getElementById('btn-input-eof');
  if (btnInputEof) {
    btnInputEof.addEventListener('click', sendStdinEOF);
  }

  if (elTerminalInteractiveInput) {
    elTerminalInteractiveInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendStdinLine(elTerminalInteractiveInput.value);
        elTerminalInteractiveInput.value = '';
      }
    });
  }
});

// ==========================================
// 10. Authentic Dev-C++ 5.11 UI Controllers
// ==========================================
function handleRebuild() {
  if (isBusy) {
    updateStatus('busy', window.I18N ? window.I18N.t('status_busy_task') : 'Executing another task...');
    return;
  }
  updateStatus('busy', window.I18N ? window.I18N.t('status_rebuilding_all') : 'Rebuilding entire project...');
  const statusCompile = document.getElementById('status-compiler');
  if (statusCompile) statusCompile.innerText = 'Rebuilding...';
  handleCompile();
}

function showAboutDialog() {
  alert(window.I18N ? window.I18N.t('about_text') : 'Dev-C++ 5.11 Web Edition');
}

function toggleSidebar() {
  const sidebar = document.getElementById('devcpp-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    if (editor) editor.layout();
    if (fitAddon) fitAddon.fit();
  }
}

function initSidebarResizer() {
  const sidebar = document.getElementById('devcpp-sidebar');
  const splitterSidebar = document.getElementById('splitter-sidebar');
  if (!sidebar || !splitterSidebar) return;

  let isDraggingSidebar = false;

  splitterSidebar.addEventListener('mousedown', (e) => {
    isDraggingSidebar = true;
    splitterSidebar.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingSidebar) return;
    const newWidth = e.clientX;
    if (newWidth <= 50) {
      sidebar.classList.add('collapsed');
      if (editor) editor.layout();
      if (fitAddon) fitAddon.fit();
    } else {
      sidebar.classList.remove('collapsed');
      const clamped = Math.max(120, Math.min(newWidth, 450));
      sidebar.style.width = `${clamped}px`;
      if (editor) editor.layout();
      if (fitAddon) fitAddon.fit();
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingSidebar) {
      isDraggingSidebar = false;
      splitterSidebar.classList.remove('dragging');
      document.body.style.cursor = 'default';
    }
  });
}

function initMenuBar() {
  const menubar = document.getElementById('devcpp-menubar');
  if (!menubar) return;

  document.querySelectorAll('.menu-item-wrap').forEach((wrap) => {
    const item = wrap.querySelector('.menu-item');
    if (!item) return;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = wrap.classList.contains('open');
      closeAllMenus();
      if (!wasOpen) {
        wrap.classList.add('open');
        isMenuOpen = true;
        window.isMenuOpen = true;
        if (item.dataset.menu === 'menu-window') {
          updateWindowFileListMenu();
        }
      }
    });

    item.addEventListener('mouseenter', () => {
      if (isMenuOpen) {
        closeAllMenus();
        wrap.classList.add('open');
        isMenuOpen = true;
        window.isMenuOpen = true;
        if (item.dataset.menu === 'menu-window') {
          updateWindowFileListMenu();
        }
      }
    });
  });

  // Clicking outside closes menus
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#devcpp-menubar')) {
      closeAllMenus();
    }
  });

  // Escape key closes menus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      closeAllMenus();
    }
  });

  // Wire menu items
  const bindMenuAction = (id, handler) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        handler();
      });
    }
  };

  // File menu
  bindMenuAction('m-new', handleNew);
  bindMenuAction('m-open', handleOpen);
  bindMenuAction('m-save', handleSave);
  bindMenuAction('m-save-all', handleSaveAll);
  bindMenuAction('m-download', handleDownloadZip);
  bindMenuAction('m-export-file', handleExportSingleSourceFile);

  // Edit menu
  bindMenuAction('m-undo', () => { if (editor) { editor.focus(); editor.trigger('menu', 'undo'); } });
  bindMenuAction('m-redo', () => { if (editor) { editor.focus(); editor.trigger('menu', 'redo'); } });
  bindMenuAction('m-format', formatCode);

  // Search menu
  bindMenuAction('m-find', handleFind);

  // View menu
  bindMenuAction('m-toggle-sidebar', toggleSidebar);

  // Project menu
  bindMenuAction('m-proj-new', () => {
    const promptText = window.I18N ? window.I18N.t('prompt_new_project_name') : 'Enter new project name:';
    const name = prompt(promptText, 'Project1');
    if (name && window.vfs) {
      window.vfs.project.name = name.trim();
      window.vfs.saveToStorage();
      if (window.sidebarController) window.sidebarController.renderTree();
      updateWindowTitle();
      const statusMsg = window.I18N ? window.I18N.t('status_renamed_proj', { name: name.trim() }) : `Renamed project to "${name.trim()}"`;
      updateStatus('ready', statusMsg);
    }
  });
  bindMenuAction('m-proj-add', () => {
    if (window.sidebarController) {
      window.sidebarController.handleActionNewFile();
    } else {
      addNewFileTab();
    }
  });
  bindMenuAction('m-proj-remove', () => {
    if (window.sidebarController) {
      window.sidebarController.handleActionDeleteSelected();
    }
  });
  bindMenuAction('m-proj-options', () => {
    const overlay = document.getElementById('dialog-project-options-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    } else {
      const projTitle = window.I18N ? window.I18N.t('opt_title') : 'Project Options';
      const projNameLbl = window.I18N ? window.I18N.t('opt_lbl_name') : 'Project Name';
      alert(`${projTitle}:\n${projNameLbl}: ${window.vfs ? window.vfs.project.name : 'Project1'}\nCompiler: Clang WebAssembly (TDM-GCC 4.9.2 64-bit)`);
    }
  });

  // Execute menu
  bindMenuAction('m-compile', handleCompile);
  bindMenuAction('m-run', handleRun);
  bindMenuAction('m-compile-run', handleCompileAndRun);
  bindMenuAction('m-rebuild', handleRebuild);
  bindMenuAction('m-tests', handleRunTests);
  bindMenuAction('m-stop', handleStop);

  // Tools menu
  bindMenuAction('m-lang-en', () => {
    if (window.I18N) window.I18N.setLocale('en');
  });
  bindMenuAction('m-lang-vi', () => {
    if (window.I18N) window.I18N.setLocale('vi');
  });
  bindMenuAction('m-tool-dark', () => {
    if (elThemeSelect) { elThemeSelect.value = 'dark'; applyTheme('dark'); }
  });
  bindMenuAction('m-tool-classic', () => {
    if (elThemeSelect) { elThemeSelect.value = 'classic'; applyTheme('classic'); }
  });

  // Window menu (F18)
  bindMenuAction('m-win-fullscreen', toggleFullscreen);
  bindMenuAction('m-win-close-all', handleCloseAllTabs);

  // Help menu
  bindMenuAction('m-about', showAboutDialog);
  window._menuBarReady = true;
}

/**
 * Dev-C++ Custom Sleek Dropdown Component
 * Replaces native OS select popups with clean, smooth, accessible floating CSS menus
 */
function initDevCppCustomCombos() {
  const wrappers = document.querySelectorAll('.devcpp-combo-wrapper');
  wrappers.forEach((wrap) => {
    const select = wrap.querySelector('.devcpp-combo');
    const menu = wrap.querySelector('.devcpp-combo-menu');
    if (!select || !menu) return;

    function syncItems() {
      menu.innerHTML = '';
      Array.from(select.options).forEach((opt, idx) => {
        const item = document.createElement('div');
        const isSelected = opt.value === select.value;
        item.className = 'devcpp-combo-item' + (isSelected ? ' selected' : '');
        item.dataset.value = opt.value;
        item.dataset.index = String(idx);
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', isSelected ? 'true' : 'false');

        const check = document.createElement('span');
        check.className = 'combo-item-check' + (isSelected ? '' : ' hidden');
        check.innerHTML = '<i class="fa-solid fa-check"></i>';

        const text = document.createElement('span');
        text.className = 'combo-item-text';
        text.textContent = opt.textContent;

        item.appendChild(check);
        item.appendChild(text);

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const prevVal = select.value;
          select.value = opt.value;
          if (select.value !== prevVal) {
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          closeAllComboMenus();
        });

        menu.appendChild(item);
      });
    }

    // Initial sync
    syncItems();

    // Listen to change events on select (e.g. from Playwright, scripts, or item click)
    select.addEventListener('change', () => {
      menu.querySelectorAll('.devcpp-combo-item').forEach((item) => {
        const isMatch = item.dataset.value === select.value;
        item.classList.toggle('selected', isMatch);
        item.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        const check = item.querySelector('.combo-item-check');
        if (check) check.classList.toggle('hidden', !isMatch);
      });
    });

    // Intercept mousedown on select to prevent ugly browser OS native popup
    select.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const isOpen = wrap.classList.contains('open');
      closeAllComboMenus();
      closeAllMenus();
      if (!isOpen) {
        syncItems();
        wrap.classList.add('open');
      }
    });

    // Keyboard accessibility on select
    select.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!wrap.classList.contains('open')) {
          syncItems();
          wrap.classList.add('open');
        } else {
          const items = Array.from(menu.querySelectorAll('.devcpp-combo-item'));
          if (items.length === 0) return;
          const curIdx = items.findIndex((i) => i.classList.contains('selected'));
          let nextIdx = e.key === 'ArrowDown' ? curIdx + 1 : curIdx - 1;
          if (nextIdx >= items.length) nextIdx = 0;
          if (nextIdx < 0) nextIdx = items.length - 1;
          if (items[nextIdx]) {
            items[nextIdx].click();
          }
        }
      } else if (e.key === 'Escape') {
        wrap.classList.remove('open');
      } else if (e.key === 'Enter') {
        if (wrap.classList.contains('open')) {
          wrap.classList.remove('open');
        }
      }
    });

    // MutationObserver to re-sync if options are dynamically injected (e.g. templates)
    const observer = new MutationObserver(() => {
      syncItems();
    });
    observer.observe(select, { childList: true });
  });

  // Clicking outside any combo wrapper closes all open menus
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.devcpp-combo-wrapper')) {
      closeAllComboMenus();
    }
  });

  // Escape key closes open combo menus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllComboMenus();
    }
  });
}
window.initDevCppCustomCombos = initDevCppCustomCombos;

