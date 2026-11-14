(function () {
  'use strict';

  const DB_NAME = 'nheuflight-cache';
  const DB_VERSION = 1;
  const STORES = ['kv', 'apiCache', 'favorites', 'alerts'];
  let dbPromise = null;

  function openDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'key' });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
    return dbPromise;
  }

  async function tx(storeName, mode, fn) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }

  async function get(storeName, key) {
    const row = await tx(storeName, 'readonly', store => store.get(key));
    return row?.value ?? null;
  }

  async function set(storeName, key, value) {
    await tx(storeName, 'readwrite', store => store.put({ key, value, updatedAt: Date.now() }));
    return value;
  }

  async function del(storeName, key) {
    await tx(storeName, 'readwrite', store => store.delete(key));
  }

  async function all(storeName) {
    const rows = await tx(storeName, 'readonly', store => store.getAll());
    return Array.isArray(rows) ? rows : [];
  }

  async function cached(key, ttlMs, producer) {
    const cachedValue = await get('apiCache', key);
    if (cachedValue && Date.now() - cachedValue.time < ttlMs) return cachedValue.data;
    const data = await producer();
    await set('apiCache', key, { time: Date.now(), data });
    return data;
  }

  window.NheuDB = { get, set, del, all, cached };
})();
