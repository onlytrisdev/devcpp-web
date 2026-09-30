/**
 * Dev-C++ Web Edition - Virtual File System (VFS) Core
 * Replicates Win32 Dev-C++ 5.11 Project & File Management
 * 
 * Storage: IndexedDB (`DevCPP_VFS_v1`) with transparent localStorage fallback & migration.
 */

(function (global) {
  'use strict';

  // --- Constants & Database Config ---
  const DB_NAME = 'DevCPP_VFS_v1';
  const DB_VERSION = 1;
  const STORE_META = 'project_meta';
  const STORE_NODES = 'nodes';
  const LS_BACKUP_KEY = 'DevCPP_VFS_backup';
  const LS_LEGACY_FILES_KEY = 'devcpp_files';
  const LS_LEGACY_CODE_KEY = 'devcpp_saved_code';

  /**
   * Universal Simple Event Emitter
   */
  class VFSEventEmitter {
    constructor() {
      this._events = Object.create(null);
    }

    on(event, handler) {
      if (typeof handler !== 'function') return () => {};
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(handler);
      return () => this.off(event, handler);
    }

    off(event, handler) {
      if (!this._events[event]) return;
      const idx = this._events[event].indexOf(handler);
      if (idx !== -1) this._events[event].splice(idx, 1);
    }

    emit(event, data) {
      if (!this._events[event]) return;
      const listeners = this._events[event].slice();
      for (let i = 0; i < listeners.length; i++) {
        try {
          listeners[i](data);
        } catch (err) {
          console.error(`[VFS Event Error] on '${event}':`, err);
        }
      }
    }
  }

  /**
   * Main Virtual File System Class
   */
  class DevCPPVirtualFileSystem extends VFSEventEmitter {
    constructor() {
      super();
      this.db = null;
      this.isReady = false;
      this._dbPromise = null;
      this._saveTimer = null;

      // In-memory active project state
      this.project = {
        id: 'project_default',
        name: 'Project1',
        version: 1,
        activeFileId: null,
        openFileIds: [],
        rootNodeIds: [],
        nodes: Object.create(null),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    // ==========================================
    // 1. Path Utilities & Validation
    // ==========================================

    static normalizePath(rawPath) {
      if (!rawPath || typeof rawPath !== 'string') return '';
      return rawPath
        .replace(/\\/g, '/')
        .replace(/^\.?\/+/, '')
        .replace(/\/+$/, '')
        .replace(/\/{2,}/g, '/');
    }

    static isValidName(name) {
      if (!name || typeof name !== 'string') return false;
      const trimmed = name.trim();
      if (!trimmed || trimmed === '.' || trimmed === '..') return false;
      // Prohibit invalid filesystem characters
      return !/[\\/:*?"<>|]/.test(trimmed);
    }

    static getExtension(filename) {
      if (!filename || typeof filename !== 'string') return '';
      const match = filename.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : '';
    }

    static isSourceFile(path) {
      return /\.(cpp|c|cc|cxx)$/i.test(path || '');
    }

    static isHeaderFile(path) {
      return /\.(h|hpp|hh|hxx|inc|inl)$/i.test(path || '');
    }

    getExtension(filename) {
      return DevCPPVirtualFileSystem.getExtension(filename);
    }

    isSourceFile(path) {
      return DevCPPVirtualFileSystem.isSourceFile(path);
    }

    isHeaderFile(path) {
      return DevCPPVirtualFileSystem.isHeaderFile(path);
    }

    _generateId(prefix = 'node') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    // ==========================================
    // 2. Database & Persistence Layer
    // ==========================================

    async _openDB() {
      if (this.db) return this.db;
      if (this._dbPromise) return this._dbPromise;

      this._dbPromise = new Promise((resolve) => {
        if (!('indexedDB' in global)) {
          console.warn('[VFS] IndexedDB not available in this browser. Using localStorage.');
          return resolve(null);
        }

        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);

          req.onupgradeneeded = (e) => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_META)) {
              db.createObjectStore(STORE_META, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_NODES)) {
              const nodeStore = db.createObjectStore(STORE_NODES, { keyPath: 'id' });
              nodeStore.createIndex('parentId', 'parentId', { unique: false });
              nodeStore.createIndex('path', 'path', { unique: true });
            }
          };

          req.onsuccess = () => {
            this.db = req.result;
            resolve(this.db);
          };

          req.onerror = () => {
            console.warn('[VFS] Failed to open IndexedDB:', req.error);
            resolve(null); // Fallback gracefully to localStorage
          };
        } catch (err) {
          console.warn('[VFS] IndexedDB open exception:', err);
          resolve(null);
        }
      });

      return this._dbPromise;
    }

    async persist() {
      this.project.updatedAt = Date.now();

      // 1. Primary Store: IndexedDB
      if (this.db) {
        try {
          await new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_META, STORE_NODES], 'readwrite');
            const metaStore = tx.objectStore(STORE_META);
            const nodesStore = tx.objectStore(STORE_NODES);

            metaStore.put({
              id: this.project.id,
              name: this.project.name,
              version: this.project.version,
              activeFileId: this.project.activeFileId,
              openFileIds: [...this.project.openFileIds],
              rootNodeIds: [...this.project.rootNodeIds],
              createdAt: this.project.createdAt,
              updatedAt: this.project.updatedAt
            });

            nodesStore.clear();
            for (const id in this.project.nodes) {
              nodesStore.put(this.project.nodes[id]);
            }

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          });
        } catch (err) {
          console.error('[VFS] IndexedDB persist error:', err);
        }
      }

      // 2. Synchronous Snapshot Fallback (localStorage)
      try {
        localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(this.project));
        // Keep legacy keys synchronized for backward compatibility with tests/external scripts
        localStorage.setItem(LS_LEGACY_FILES_KEY, JSON.stringify(this.getFlatFilesMap()));
        const activeNode = this.getActiveFile();
        if (activeNode) {
          localStorage.setItem(LS_LEGACY_CODE_KEY, activeNode.content || '');
        }
      } catch (err) {
        console.warn('[VFS] localStorage backup error (quota or access):', err);
      }
    }

    _triggerDebouncedSave(delayMs = 400) {
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        this.persist();
      }, delayMs);
    }

    // ==========================================
    // 3. Initialization & Migration
    // ==========================================

    async init() {
      await this._openDB();
      let loaded = false;

      // 1. Attempt loading from IndexedDB
      if (this.db) {
        try {
          loaded = await this._loadFromIndexedDB();
        } catch (err) {
          console.warn('[VFS] Could not load from IndexedDB:', err);
        }
      }

      // 2. If IndexedDB was empty, attempt loading from LS_BACKUP_KEY
      if (!loaded) {
        loaded = this._loadFromLocalStorageBackup();
      }

      // 3. If still empty, migrate legacy localStorage keys
      if (!loaded) {
        loaded = this._migrateFromLegacyLocalStorage();
      }

      // 4. If completely clean state, seed default project
      if (!loaded) {
        this._seedDefaultProject();
      }

      // Ensure activeFileId and openFileIds are valid
      this._sanitizeWorkspaceSession();

      this.isReady = true;
      await this.persist();
      this.emit('init', { project: this.project });
      return this.project;
    }

    async _loadFromIndexedDB() {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([STORE_META, STORE_NODES], 'readonly');
          const metaStore = tx.objectStore(STORE_META);
          const nodesStore = tx.objectStore(STORE_NODES);

          const metaReq = metaStore.get(this.project.id);
          const nodesReq = nodesStore.getAll();

          let meta = null;
          let nodes = null;

          metaReq.onsuccess = () => { meta = metaReq.result; };
          nodesReq.onsuccess = () => { nodes = nodesReq.result; };

          tx.oncomplete = () => {
            if (meta && nodes && nodes.length > 0) {
              this.project.id = meta.id || this.project.id;
              this.project.name = meta.name || 'Project1';
              this.project.version = meta.version || 1;
              this.project.activeFileId = meta.activeFileId || null;
              this.project.openFileIds = Array.isArray(meta.openFileIds) ? meta.openFileIds : [];
              this.project.rootNodeIds = Array.isArray(meta.rootNodeIds) ? meta.rootNodeIds : [];
              this.project.createdAt = meta.createdAt || Date.now();
              this.project.updatedAt = meta.updatedAt || Date.now();
              this.project.nodes = Object.create(null);

              for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                this.project.nodes[node.id] = node;
              }
              resolve(true);
            } else {
              resolve(false);
            }
          };

          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    }

    _loadFromLocalStorageBackup() {
      try {
        const backupStr = localStorage.getItem(LS_BACKUP_KEY);
        if (!backupStr) return false;
        const backup = JSON.parse(backupStr);
        if (backup && backup.nodes && Object.keys(backup.nodes).length > 0) {
          this.project = backup;
          console.log('[VFS] Restored project snapshot from localStorage backup.');
          return true;
        }
      } catch (e) {
        console.warn('[VFS] Failed to parse localStorage backup:', e);
      }
      return false;
    }

    _migrateFromLegacyLocalStorage() {
      try {
        const legacyFilesStr = localStorage.getItem(LS_LEGACY_FILES_KEY);
        if (legacyFilesStr) {
          const filesMap = JSON.parse(legacyFilesStr);
          if (filesMap && typeof filesMap === 'object' && Object.keys(filesMap).length > 0) {
            console.log('[VFS] Migrating legacy devcpp_files to VFS tree...');
            this._resetProjectState('Project1');

            for (const rawPath in filesMap) {
              const normPath = DevCPPVirtualFileSystem.normalizePath(rawPath);
              if (!normPath) continue;
              const content = filesMap[rawPath] || '';
              this._createPathInternal(normPath, content);
            }
            return true;
          }
        }

        const legacyCodeStr = localStorage.getItem(LS_LEGACY_CODE_KEY);
        if (legacyCodeStr && legacyCodeStr.trim()) {
          console.log('[VFS] Migrating legacy devcpp_saved_code to main.cpp...');
          this._resetProjectState('Project1');
          this._createPathInternal('main.cpp', legacyCodeStr);
          return true;
        }
      } catch (err) {
        console.warn('[VFS] Legacy migration error:', err);
      }
      return false;
    }

    _seedDefaultProject() {
      console.log('[VFS] Seeding new default Dev-C++ project...');
      this._resetProjectState('Project1');

      let initialCode = '';
      if (global.CODE_TEMPLATES && global.CODE_TEMPLATES.length > 0 && global.CODE_TEMPLATES[0].code) {
        initialCode = global.CODE_TEMPLATES[0].code;
      } else {
        initialCode = `#include <iostream>\n\nusing namespace std;\n\nint main() {\n    cout << "Hello, Dev-C++ Web Edition!" << endl;\n    return 0;\n}\n`;
      }

      this._createPathInternal('main.cpp', initialCode);
    }

    _resetProjectState(projectName = 'Project1') {
      this.project = {
        id: 'project_default',
        name: projectName,
        version: 1,
        activeFileId: null,
        openFileIds: [],
        rootNodeIds: [],
        nodes: Object.create(null),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    _createPathInternal(normPath, content = '') {
      const parts = normPath.split('/');
      let currentParentId = null;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = (i === parts.length - 1);
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        let existing = this.getNodeByPath(currentPath);

        if (!isLast) {
          // Folder segment
          if (!existing) {
            existing = {
              id: this._generateId('dir'),
              name: part,
              path: currentPath,
              type: 'folder',
              parentId: currentParentId,
              isExpanded: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            this.project.nodes[existing.id] = existing;
            if (currentParentId === null) {
              this.project.rootNodeIds.push(existing.id);
            }
          }
          currentParentId = existing.id;
        } else {
          // Final File segment
          if (!existing) {
            const isSource = DevCPPVirtualFileSystem.isSourceFile(part);
            const fileNode = {
              id: this._generateId('file'),
              name: part,
              path: currentPath,
              type: 'file',
              parentId: currentParentId,
              content: content,
              isUnit: isSource,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            this.project.nodes[fileNode.id] = fileNode;
            if (currentParentId === null) {
              this.project.rootNodeIds.push(fileNode.id);
            }
            if (!this.project.openFileIds.includes(fileNode.id)) {
              this.project.openFileIds.push(fileNode.id);
            }
            if (!this.project.activeFileId) {
              this.project.activeFileId = fileNode.id;
            }
          }
        }
      }
    }

    _sanitizeWorkspaceSession() {
      // Ensure all openFileIds actually exist
      this.project.openFileIds = this.project.openFileIds.filter(id => {
        const n = this.project.nodes[id];
        return n && n.type === 'file';
      });

      const allFiles = this.getFiles();
      if (allFiles.length > 0) {
        if (this.project.openFileIds.length === 0) {
          this.project.openFileIds = [allFiles[0].id];
        }
        if (!this.project.activeFileId || !this.project.nodes[this.project.activeFileId]) {
          this.project.activeFileId = this.project.openFileIds[0];
        }
      } else {
        this.project.activeFileId = null;
        this.project.openFileIds = [];
      }
    }

    // ==========================================
    // 4. Lookups & Node Queries
    // ==========================================

    getProject() {
      return this.project;
    }

    getNode(nodeIdOrPath) {
      if (!nodeIdOrPath) return null;
      if (this.project.nodes[nodeIdOrPath]) {
        return this.project.nodes[nodeIdOrPath];
      }
      return this.getNodeByPath(nodeIdOrPath);
    }

    getNodeById(nodeId) {
      if (!nodeId) return null;
      return this.project.nodes[nodeId] || null;
    }

    getNodeByPath(rawPath) {
      const normPath = DevCPPVirtualFileSystem.normalizePath(rawPath);
      if (!normPath) return null;
      for (const id in this.project.nodes) {
        if (this.project.nodes[id].path === normPath) {
          return this.project.nodes[id];
        }
      }
      return null;
    }

    getFile(nodeIdOrPath) {
      const node = this.getNode(nodeIdOrPath);
      return (node && node.type === 'file') ? node : null;
    }

    getActiveFile() {
      if (!this.project.activeFileId) return null;
      return this.project.nodes[this.project.activeFileId] || null;
    }

    getFiles() {
      const list = [];
      for (const id in this.project.nodes) {
        if (this.project.nodes[id].type === 'file') {
          list.push(this.project.nodes[id]);
        }
      }
      return list;
    }

    getOpenFiles() {
      return this.project.openFileIds
        .map(id => this.project.nodes[id])
        .filter(n => n && n.type === 'file');
    }

    getCompilableUnits() {
      return this.getFiles()
        .filter(f => f.isUnit !== false && DevCPPVirtualFileSystem.isSourceFile(f.path))
        .map(f => ({
          ...f,
          lang: f.path.endsWith('.c') ? 'c' : 'c++'
        }));
    }

    getAllDirectories() {
      const dirs = [];
      for (const id in this.project.nodes) {
        if (this.project.nodes[id].type === 'folder') {
          dirs.push(this.project.nodes[id].path);
        }
      }
      // Sort ascending by depth so parent directories are created first in MemFS
      return dirs.sort((a, b) => a.split('/').length - b.split('/').length);
    }

    getFlatFilesMap() {
      const map = Object.create(null);
      for (const id in this.project.nodes) {
        const node = this.project.nodes[id];
        if (node.type === 'file') {
          map[node.path] = node.content || '';
        }
      }
      return map;
    }

    getCompilationPayload(optLevel = '2') {
      const filesList = this.getFiles().map(f => ({
        path: f.path.replace(/\\/g, '/').replace(/^\.\//, ''),
        content: f.content || '',
        isUnit: f.isUnit !== false
      }));
      const directories = this.getAllDirectories();
      const mainNode = this.getActiveFile() || this.getNodeByPath('main.cpp') || (filesList[0] || { path: 'main.cpp' });
      return {
        files: filesList,
        directories: directories,
        mainFile: mainNode.path || 'main.cpp',
        optLevel: optLevel || '2'
      };
    }

    getChildren(parentId = null) {
      const result = [];
      for (const id in this.project.nodes) {
        if (this.project.nodes[id].parentId === parentId) {
          result.push(this.project.nodes[id]);
        }
      }
      // Folders first, then files, alphabetical
      return result.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    // ==========================================
    // 5. CRUD File & Folder Operations
    // ==========================================

    setFileContentInMemory(nodeIdOrPath, content) {
      const node = this.getFile(nodeIdOrPath);
      if (!node) return;
      node.content = content;
      node.updatedAt = Date.now();
      if (typeof window !== 'undefined') {
        const ed = window.editor || (window.monaco && window.monaco.editor && window.monaco.editor.getEditors && window.monaco.editor.getEditors()[0]);
        const activeNode = this.getActiveFile();
        const isActive = (activeNode && (activeNode.id === node.id || activeNode.path === node.path)) ||
                         (window.activeFile && (window.activeFile === node.path || window.activeFile === node.name));
        if (ed && isActive && typeof ed.setValue === 'function' && ed.getValue() !== content) {
          ed.setValue(content);
        }
      }
      this._triggerDebouncedSave();
    }

    saveFileSync(nodeIdOrPath, content) {
      this.setFileContentInMemory(nodeIdOrPath, content);
      this.persist();
    }

    async saveFile(nodeIdOrPath, content) {
      const node = this.getFile(nodeIdOrPath);
      if (!node) throw new Error(`[VFS] File not found: ${nodeIdOrPath}`);
      node.content = content;
      node.updatedAt = Date.now();
      if (typeof window !== 'undefined') {
        const ed = window.editor || (window.monaco && window.monaco.editor && window.monaco.editor.getEditors && window.monaco.editor.getEditors()[0]);
        const activeNode = this.getActiveFile();
        const isActive = (activeNode && (activeNode.id === node.id || activeNode.path === node.path)) ||
                         (window.activeFile && (window.activeFile === node.path || window.activeFile === node.name));
        if (ed && isActive && typeof ed.setValue === 'function' && ed.getValue() !== content) {
          ed.setValue(content);
        }
      }
      await this.persist();
      this.emit('fileSaved', { node });
      this.emit('change', { type: 'save', node });
      return node;
    }

    async createFile(pathOrOptions, content = '', isUnit = undefined) {
      let rawPath = '';
      let fileContent = content;
      let unitFlag = isUnit;
      let parentId = null;

      // Handle overloaded signature: createFile(parentId, filename, content, isUnit)
      if ((typeof pathOrOptions === 'string' || pathOrOptions === null) &&
          arguments.length >= 2 &&
          (pathOrOptions === null || (this.project.nodes[pathOrOptions] && this.project.nodes[pathOrOptions].type === 'folder'))) {
        parentId = pathOrOptions;
        rawPath = arguments[1];
        fileContent = arguments[2] || '';
        unitFlag = arguments[3];
      } else if (typeof pathOrOptions === 'object' && pathOrOptions !== null) {
        rawPath = pathOrOptions.path || pathOrOptions.name || '';
        if (pathOrOptions.content !== undefined) fileContent = pathOrOptions.content;
        if (pathOrOptions.isUnit !== undefined) unitFlag = pathOrOptions.isUnit;
        if (pathOrOptions.parentId) parentId = pathOrOptions.parentId;
      } else {
        rawPath = String(pathOrOptions);
      }

      let normPath = DevCPPVirtualFileSystem.normalizePath(rawPath);
      if (!normPath) throw new Error('[VFS] Invalid or empty file path');

      // If parentId was given, resolve parent's path
      if (parentId && this.project.nodes[parentId]) {
        const parentNode = this.project.nodes[parentId];
        if (parentNode.type === 'folder') {
          normPath = `${parentNode.path}/${normPath.split('/').pop()}`;
        }
      }

      const existingNode = this.getNodeByPath(normPath);
      if (existingNode) {
        if (existingNode.type === 'file') {
          existingNode.content = fileContent;
          if (unitFlag !== undefined) existingNode.isUnit = Boolean(unitFlag);
          existingNode.updatedAt = Date.now();
          if (!this.project.openFileIds.includes(existingNode.id)) {
            this.project.openFileIds.push(existingNode.id);
          }
          await this.persist();
          this.emit('change', { type: 'fileUpdated', node: existingNode });
          return existingNode;
        } else {
          throw new Error(`[VFS] A file or folder already exists at: ${normPath}`);
        }
      }

      const parts = normPath.split('/');
      const fileName = parts[parts.length - 1];
      if (!DevCPPVirtualFileSystem.isValidName(fileName)) {
        throw new Error(`[VFS] Invalid file name: ${fileName}`);
      }

      // Ensure intermediate parent folders exist
      if (parts.length > 1) {
        let parentDir = '';
        let currentParent = null;
        for (let i = 0; i < parts.length - 1; i++) {
          parentDir = parentDir ? `${parentDir}/${parts[i]}` : parts[i];
          let folder = this.getNodeByPath(parentDir);
          if (!folder) {
            folder = await this.createFolder(parentDir);
          }
          currentParent = folder;
        }
        parentId = currentParent ? currentParent.id : null;
      }

      // Default include guard for header files if content is empty
      if (!fileContent && DevCPPVirtualFileSystem.isHeaderFile(fileName)) {
        const guard = fileName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        fileContent = `#ifndef ${guard}_\n#define ${guard}_\n\n// Khai báo cấu trúc / hàm tại đây\n\n#endif // ${guard}_\n`;
      } else if (!fileContent && DevCPPVirtualFileSystem.isSourceFile(fileName)) {
        fileContent = `// File: ${fileName}\n#include <iostream>\n\nusing namespace std;\n\n`;
      }

      if (unitFlag === undefined) {
        unitFlag = DevCPPVirtualFileSystem.isSourceFile(fileName);
      }

      const newNode = {
        id: this._generateId('file'),
        name: fileName,
        path: normPath,
        type: 'file',
        parentId: parentId,
        content: fileContent,
        isUnit: Boolean(unitFlag),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.project.nodes[newNode.id] = newNode;
      if (parentId === null) {
        this.project.rootNodeIds.push(newNode.id);
      }

      // Open new file in editor tabs automatically
      if (!this.project.openFileIds.includes(newNode.id)) {
        this.project.openFileIds.push(newNode.id);
      }
      this.project.activeFileId = newNode.id;

      await this.persist();
      this.emit('nodeCreated', { node: newNode });
      this.emit('tabsChanged', { openFileIds: this.project.openFileIds, activeFileId: this.project.activeFileId });
      this.emit('change', { type: 'create', node: newNode });
      return newNode;
    }

    async createFolder(pathOrOptions) {
      let rawPath = '';
      let parentId = null;

      // Handle overloaded signature: createFolder(parentId, folderName)
      if ((typeof pathOrOptions === 'string' || pathOrOptions === null) &&
          arguments.length >= 2 &&
          (pathOrOptions === null || (this.project.nodes[pathOrOptions] && this.project.nodes[pathOrOptions].type === 'folder'))) {
        parentId = pathOrOptions;
        rawPath = arguments[1];
      } else if (typeof pathOrOptions === 'object' && pathOrOptions !== null) {
        rawPath = pathOrOptions.path || pathOrOptions.name || '';
        if (pathOrOptions.parentId) parentId = pathOrOptions.parentId;
      } else {
        rawPath = String(pathOrOptions);
      }

      let normPath = DevCPPVirtualFileSystem.normalizePath(rawPath);
      if (!normPath) throw new Error('[VFS] Invalid or empty folder path');

      if (parentId && this.project.nodes[parentId]) {
        const parentNode = this.project.nodes[parentId];
        if (parentNode.type === 'folder') {
          normPath = `${parentNode.path}/${normPath.split('/').pop()}`;
        }
      }

      const existingFolder = this.getNodeByPath(normPath);
      if (existingFolder) {
        if (existingFolder.type === 'folder') {
          return existingFolder;
        } else {
          throw new Error(`[VFS] A file already exists at: ${normPath}`);
        }
      }

      const parts = normPath.split('/');
      let currentParentId = null;
      let currentPath = '';
      let lastCreatedFolder = null;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!DevCPPVirtualFileSystem.isValidName(part)) {
          throw new Error(`[VFS] Invalid folder name segment: ${part}`);
        }
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let existing = this.getNodeByPath(currentPath);

        if (!existing) {
          existing = {
            id: this._generateId('dir'),
            name: part,
            path: currentPath,
            type: 'folder',
            parentId: currentParentId,
            isExpanded: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          this.project.nodes[existing.id] = existing;
          if (currentParentId === null) {
            this.project.rootNodeIds.push(existing.id);
          }
          lastCreatedFolder = existing;
        }
        currentParentId = existing.id;
      }

      await this.persist();
      if (lastCreatedFolder) {
        this.emit('nodeCreated', { node: lastCreatedFolder });
        this.emit('change', { type: 'createFolder', node: lastCreatedFolder });
      }
      return lastCreatedFolder;
    }

    async renameNode(nodeIdOrPath, newName) {
      const node = this.getNode(nodeIdOrPath);
      if (!node) throw new Error(`[VFS] Node not found: ${nodeIdOrPath}`);
      const cleanName = (newName || '').trim();
      if (!DevCPPVirtualFileSystem.isValidName(cleanName)) {
        throw new Error(`[VFS] Invalid name: "${cleanName}"`);
      }
      if (node.name === cleanName) return node;

      const oldPath = node.path;
      let newPath = '';
      if (node.parentId && this.project.nodes[node.parentId]) {
        newPath = `${this.project.nodes[node.parentId].path}/${cleanName}`;
      } else {
        newPath = cleanName;
      }

      if (this.getNodeByPath(newPath)) {
        throw new Error(`[VFS] Name conflict: "${newPath}" already exists`);
      }

      node.name = cleanName;
      node.path = newPath;
      node.updatedAt = Date.now();

      // If source file renamed to header or vice versa, re-evaluate default isUnit
      if (node.type === 'file') {
        if (DevCPPVirtualFileSystem.isHeaderFile(cleanName)) {
          node.isUnit = false;
        } else if (DevCPPVirtualFileSystem.isSourceFile(cleanName)) {
          node.isUnit = true;
        }
      }

      // If folder: recursively update paths of all descendant children!
      if (node.type === 'folder') {
        const oldPrefix = `${oldPath}/`;
        const newPrefix = `${newPath}/`;
        for (const id in this.project.nodes) {
          const item = this.project.nodes[id];
          if (item.path.startsWith(oldPrefix)) {
            item.path = newPrefix + item.path.substring(oldPrefix.length);
            item.updatedAt = Date.now();
          }
        }
      }

      await this.persist();
      this.emit('nodeRenamed', { node, oldPath, newPath });
      this.emit('change', { type: 'rename', node, oldPath, newPath });
      return node;
    }

    async deleteNode(nodeIdOrPath) {
      const node = this.getNode(nodeIdOrPath);
      if (!node) throw new Error(`[VFS] Node not found: ${nodeIdOrPath}`);

      const allFiles = this.getFiles();
      if (node.type === 'file' && allFiles.length <= 1) {
        throw new Error('[VFS] Cannot delete the last remaining source file in the project!');
      }

      // Collect all IDs to delete (node itself + descendants)
      const toDeleteIds = new Set([node.id]);
      if (node.type === 'folder') {
        const prefix = `${node.path}/`;
        for (const id in this.project.nodes) {
          if (this.project.nodes[id].path.startsWith(prefix)) {
            toDeleteIds.add(id);
          }
        }
      }

      // Check if deleting would leave 0 files
      const remainingFilesCount = allFiles.filter(f => !toDeleteIds.has(f.id)).length;
      if (remainingFilesCount === 0) {
        throw new Error('[VFS] Cannot delete folder containing all project files!');
      }

      // Remove from nodes, rootNodeIds, openFileIds
      toDeleteIds.forEach(id => {
        delete this.project.nodes[id];
        const rootIdx = this.project.rootNodeIds.indexOf(id);
        if (rootIdx !== -1) this.project.rootNodeIds.splice(rootIdx, 1);
        const openIdx = this.project.openFileIds.indexOf(id);
        if (openIdx !== -1) this.project.openFileIds.splice(openIdx, 1);
      });

      // Update active file if it was deleted or is no longer valid
      const oldActiveId = this.project.activeFileId;
      const wasActiveDeleted = oldActiveId ? toDeleteIds.has(oldActiveId) : false;

      if (wasActiveDeleted || !this.project.nodes[this.project.activeFileId]) {
        const remainingFiles = this.getFiles();
        const primaryUnit = this.getNodeByPath('main.cpp');
        const fallbackId = (this.project.openFileIds.length > 0)
          ? this.project.openFileIds[0]
          : ((primaryUnit && !toDeleteIds.has(primaryUnit.id)) ? primaryUnit.id : (remainingFiles.length > 0 ? remainingFiles[0].id : null));

        this.project.activeFileId = fallbackId;
      }

      // Ensure openFileIds is never empty when project has surviving files (BUG-ADV-02 fix)
      if (this.project.openFileIds.length === 0 && this.project.activeFileId) {
        this.project.openFileIds.push(this.project.activeFileId);
      }

      await this.persist();
      this.emit('nodeDeleted', { nodeId: node.id, path: node.path, deletedIds: Array.from(toDeleteIds) });
      if ((wasActiveDeleted || oldActiveId !== this.project.activeFileId) && this.project.activeFileId) {
        const newActiveNode = this.getNodeById(this.project.activeFileId);
        this.emit('activeFileChanged', { oldFileId: oldActiveId, newFileId: this.project.activeFileId, node: newActiveNode });
      }
      this.emit('tabsChanged', { openFileIds: this.project.openFileIds, activeFileId: this.project.activeFileId });
      this.emit('change', { type: 'delete', nodeId: node.id });
      return true;
    }

    async toggleUnit(nodeIdOrPath, isUnit = undefined) {
      const node = this.getFile(nodeIdOrPath);
      if (!node) throw new Error(`[VFS] File not found: ${nodeIdOrPath}`);

      if (typeof isUnit === 'boolean') {
        node.isUnit = isUnit;
      } else {
        node.isUnit = !node.isUnit;
      }

      node.updatedAt = Date.now();
      await this.persist();
      this.emit('unitToggled', { node, isUnit: node.isUnit });
      this.emit('change', { type: 'unitToggle', node });
      return node;
    }

    setFolderExpanded(nodeId, isExpanded) {
      const node = this.getNode(nodeId);
      if (node && node.type === 'folder') {
        node.isExpanded = Boolean(isExpanded);
        this.persist();
        this.emit('change', { type: 'folderExpand', node });
      }
    }

    // ==========================================
    // 6. Tabs & Active File Coordination
    // ==========================================

    openFile(nodeIdOrPath) {
      const node = this.getFile(nodeIdOrPath);
      if (!node) return null;

      if (!this.project.openFileIds.includes(node.id)) {
        this.project.openFileIds.push(node.id);
      }
      const oldActive = this.project.activeFileId;
      this.project.activeFileId = node.id;

      this.persist();
      if (oldActive !== node.id) {
        this.emit('activeFileChanged', { oldFileId: oldActive, newFileId: node.id, node });
      }
      this.emit('tabsChanged', { openFileIds: this.project.openFileIds, activeFileId: this.project.activeFileId });
      return node;
    }

    openTab(nodeIdOrPath) {
      return this.openFile(nodeIdOrPath);
    }

    closeFile(nodeIdOrPath) {
      const node = this.getFile(nodeIdOrPath);
      if (!node) return false;

      if (this.project.openFileIds.length <= 1) {
        return false; // Prevent closing the only open tab
      }

      const idx = this.project.openFileIds.indexOf(node.id);
      if (idx !== -1) {
        this.project.openFileIds.splice(idx, 1);
        if (this.project.activeFileId === node.id) {
          const nextIdx = Math.max(0, idx - 1);
          this.project.activeFileId = this.project.openFileIds[nextIdx];
          const newActive = this.project.nodes[this.project.activeFileId];
          this.emit('activeFileChanged', { oldFileId: node.id, newFileId: this.project.activeFileId, node: newActive });
        }
        this.persist();
        this.emit('tabsChanged', { openFileIds: this.project.openFileIds, activeFileId: this.project.activeFileId });
        return true;
      }
      return false;
    }

    closeTab(nodeIdOrPath) {
      return this.closeFile(nodeIdOrPath);
    }

    closeAllTabs() {
      if (!this.project) return;
      this.project.openFileIds = [];
      this.project.activeFileId = null;
      this.persist();
      this.emit('activeFileChanged', { oldFileId: null, newFileId: null, node: null });
      this.emit('tabsChanged', { openFileIds: [], activeFileId: null });
    }

    setActiveFile(nodeIdOrPath) {
      return this.openFile(nodeIdOrPath);
    }

    // ==========================================
    // 7. JSZip Export & Project Download
    // ==========================================

    async _ensureJSZip() {
      if (typeof global.JSZip !== 'undefined') return global.JSZip;

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(global.JSZip);
        script.onerror = () => reject(new Error('Failed to load JSZip library from CDN'));
        document.head.appendChild(script);
      });
    }

    _generateDevProjectFile() {
      const files = this.getFiles();
      const lines = [];

      lines.push('[Project]');
      lines.push(`FileName=${this.project.name}.dev`);
      lines.push(`Name=${this.project.name}`);
      lines.push('Type=1');
      lines.push('Ver=2');
      lines.push('ObjFiles=');
      lines.push('Includes=');
      lines.push('Libs=');
      lines.push('PrivateResource=');
      lines.push('ResourceIncludes=');
      lines.push('MakeIncludes=');
      lines.push('Compiler=');
      lines.push('CppCompiler=');
      lines.push('Linker=');
      lines.push('IsCpp=1');
      lines.push('Icon=');
      lines.push('ExeOutput=');
      lines.push('ObjectOutput=');
      lines.push('LogOutput=');
      lines.push('LogOutputConsole=');
      lines.push('OverrideOutput=0');
      lines.push(`OverrideOutputName=${this.project.name}.exe`);
      lines.push('HostApplication=');
      lines.push('UseCustomMakefile=0');
      lines.push('CustomMakefile=');
      lines.push('CommandLine=');
      lines.push('Folders=');
      lines.push(`UnitCount=${files.length}`);
      lines.push('');

      files.forEach((file, index) => {
        const unitNum = index + 1;
        const isCpp = !file.path.endsWith('.c');
        const compile = (file.isUnit && DevCPPVirtualFileSystem.isSourceFile(file.path)) ? 1 : 0;
        lines.push(`[Unit${unitNum}]`);
        lines.push(`FileName=${file.path.replace(/\//g, '\\')}`);
        lines.push(`CompileCpp=${isCpp ? 1 : 0}`);
        lines.push(`Folder=${file.parentId ? 'Sources' : ''}`);
        lines.push(`Compile=${compile}`);
        lines.push(`Link=${compile}`);
        lines.push('Priority=1000');
        lines.push('OverrideBuildCmd=0');
        lines.push('BuildCmd=');
        lines.push('');
      });

      return lines.join('\r\n');
    }

    async exportZip() {
      const JSZipLib = await this._ensureJSZip();
      const zip = new JSZipLib();

      // 1. Flush active editor buffer to memory model before zipping
      if (typeof window !== 'undefined') {
        const ed = window.editor || (window.monaco && window.monaco.editor && window.monaco.editor.getEditors && window.monaco.editor.getEditors()[0]);
        if (ed && typeof ed.getValue === 'function') {
          const activeFile = this.getActiveFile();
          if (activeFile) {
            activeFile.content = ed.getValue();
          }
        }
      }

      // 2. Add all project files
      const files = this.getFiles();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        zip.file(file.path, file.content || '');
      }

      // 3. Add authentic Dev-C++ 5.11 .dev project descriptor
      const devContent = this._generateDevProjectFile();
      const projName = (this.project && this.project.name) || 'Project1';
      zip.file(`${projName}.dev`, devContent);

      // 4. Generate Blob with deflate compression
      return await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });
    }

    async downloadZip(filename = null) {
      const blob = await this.exportZip();
      const rawName = filename || `${(this.project && this.project.name) || 'Project1'}.zip`;
      const safeName = rawName.replace(/[\\/:*?"<>|]/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    }
  }

  // Register on window
  global.DevCPPVirtualFileSystem = DevCPPVirtualFileSystem;
  global.vfs = new DevCPPVirtualFileSystem();

  global.exportProjectZip = async function() {
    if (global.vfs) return await global.vfs.exportZip();
    throw new Error('VFS not initialized');
  };

  global.downloadProjectZip = async function(filename) {
    if (global.vfs) return await global.vfs.downloadZip(filename);
    throw new Error('VFS not initialized');
  };

})(typeof window !== 'undefined' ? window : this);
