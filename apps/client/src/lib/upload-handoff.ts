/**
 * Hands a file the visitor picked on one page to the builder on /order without
 * uploading it: the file is kept in this browser's IndexedDB under a random id,
 * the id travels in the URL (`?upload=<id>`), and /order takes it out once.
 * Entries older than a day are dropped on the next save.
 */

const DB = "udo-handoff";
const STORE = "files";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Entry {
  id: string;
  file: Blob;
  name: string;
  type: string;
  createdAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => { db.close(); resolve(req ? (req.result as T) : undefined); };
        t.onerror = () => { db.close(); reject(t.error); };
      }),
  );
}

/** Stores the file and returns its id, or null if IndexedDB is unavailable (private mode, old browser). */
export async function saveHandoffFile(file: File): Promise<string | null> {
  try {
    const id = crypto.randomUUID();
    const now = Date.now();
    await tx("readwrite", (store) => {
      store.put({ id, file, name: file.name, type: file.type, createdAt: now } satisfies Entry);
      // Clean up anything left from earlier visits.
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return;
        if (now - (cursor.value as Entry).createdAt > MAX_AGE_MS) cursor.delete();
        cursor.continue();
      };
    });
    return id;
  } catch {
    return null;
  }
}

/** Returns the file once and deletes it; null if missing, expired or not readable. */
export async function takeHandoffFile(id: string): Promise<File | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const entry = await tx<Entry>("readonly", (store) => store.get(id));
    await tx("readwrite", (store) => { store.delete(id); });
    if (!entry || Date.now() - entry.createdAt > MAX_AGE_MS) return null;
    return new File([entry.file], entry.name, { type: entry.type });
  } catch {
    return null;
  }
}
