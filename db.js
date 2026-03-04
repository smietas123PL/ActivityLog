// ── db.js — IndexedDB wrapper ─────────────────────────────────────────────────
const DB_NAME    = 'actlog_db';
const DB_VERSION = 1;
export const DB_SCHEMA_VERSION = 1;

export const DB = (() => {
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess  = e => { _db = e.target.result; resolve(_db); };
      req.onerror    = e => reject(e.target.error);
    });
  }

  function tx(storeName, mode = 'readonly') {
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  function getAll(storeName) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    }));
  }

  function get(storeName, key) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName).get(key);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    }));
  }

  function put(storeName, value) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').put(value);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    }));
  }

  function del(storeName, key) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    }));
  }

  function putMany(storeName, items) {
    return open().then(() => new Promise((resolve, reject) => {
      const transaction = _db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      items.forEach(item => store.put(item));
      transaction.oncomplete = () => resolve();
      transaction.onerror    = e => reject(e.target.error);
    }));
  }

  return { open, get, getAll, put, del, putMany };
})();
