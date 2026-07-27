const databaseName = "musunil-public-read-cache";
const storeName = "responses";
const databaseVersion = 1;
const cacheSchemaVersion = "public-read-v1";
const defaultMaxAgeMs = 24 * 60 * 60_000;

export interface PublicCacheEntry<T> {
  value: T;
  savedAt: string;
}

export async function readPublicCache<T>(key: string, maxAgeMs = defaultMaxAgeMs): Promise<PublicCacheEntry<T> | undefined> {
  try {
    const database = await openDatabase();
    const entry = await new Promise<PublicCacheEntry<T> | undefined>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(cacheKey(key));
      request.onsuccess = () => resolve(request.result as PublicCacheEntry<T> | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (!entry || Date.now() - new Date(entry.savedAt).getTime() > maxAgeMs) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

export async function writePublicCache<T>(key: string, value: T): Promise<void> {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put({ value, savedAt: new Date().toISOString() } satisfies PublicCacheEntry<T>, cacheKey(key));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    // Public cache is a resilience enhancement; live reads remain usable without it.
  }
}

function cacheKey(key: string): string {
  return `${cacheSchemaVersion}:${key}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
