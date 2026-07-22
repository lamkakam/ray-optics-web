/**
IndexedDB persistence for user-defined custom glass rows.

## Database Contract
- Database name: `ray-optics-web-custom-glass`.
- Version: `1`.
- Object stores:
  - `customGlasses`, keyed by `label`.
  - `quarantinedCustomGlasses`, keyed by `label`.
- Persisted rows use `{ label, type: "tabulated", pairs }`.

## Behavior
- `toPersistedCustomGlassRow(input)` converts worker input rows to the persisted row shape.
- `isPersistedCustomGlassRow(value)` accepts only non-blank labels, `type: "tabulated"`, and finite numeric wavelength/index pairs.
- `readStoredCustomGlassRows()` returns raw rows for startup hydration and quarantine decisions.
- `readPersistedCustomGlasses()` returns only valid rows from `customGlasses`.
- `upsertPersistedCustomGlass()` and `upsertPersistedCustomGlasses()` write rows after a successful worker mutation.
- `deletePersistedCustomGlasses()` removes rows after a successful worker delete.
- `quarantinePersistedCustomGlass()` and `quarantineStoredCustomGlassRow()` write the row into `quarantinedCustomGlasses` and remove it from `customGlasses`.
- `_setIndexedDbForTest()` exists only to inject a controlled IndexedDB factory in unit tests.
*/
import type { UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";

const DB_NAME = "ray-optics-web-custom-glass";
const DB_VERSION = 1;
const CUSTOM_STORE = "customGlasses";
const QUARANTINED_STORE = "quarantinedCustomGlasses";

export interface PersistedCustomGlassRow {
  readonly label: string;
  readonly type: "tabulated";
  readonly pairs: readonly (readonly [number, number])[];
}

type StoreName = typeof CUSTOM_STORE | typeof QUARANTINED_STORE;

let indexedDbOverride: IDBFactory | undefined;

function getIndexedDB(): IDBFactory {
  const factory = indexedDbOverride ?? globalThis.indexedDB;
  if (factory === undefined) {
    throw new Error("IndexedDB is not available.");
  }
  return factory;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function txDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

export function isPersistedCustomGlassRow(value: unknown): value is PersistedCustomGlassRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as { readonly label?: unknown; readonly type?: unknown; readonly pairs?: unknown };
  return typeof row.label === "string"
    && row.label.trim() !== ""
    && row.type === "tabulated"
    && Array.isArray(row.pairs)
    && row.pairs.every((pair) =>
      Array.isArray(pair)
      && pair.length === 2
      && Number.isFinite(pair[0])
      && Number.isFinite(pair[1])
    );
}

export function toPersistedCustomGlassRow(input: UserDefinedGlassInput): PersistedCustomGlassRow {
  return {
    label: input.name,
    type: "tabulated",
    pairs: input.pairs.map((pair) => [pair[0], pair[1]] as const),
  };
}

async function openDb(): Promise<IDBDatabase> {
  const request = getIndexedDB().open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(CUSTOM_STORE)) {
      db.createObjectStore(CUSTOM_STORE, { keyPath: "label" });
    }
    if (!db.objectStoreNames.contains(QUARANTINED_STORE)) {
      db.createObjectStore(QUARANTINED_STORE, { keyPath: "label" });
    }
  };
  return requestToPromise(request);
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    const [result] = await Promise.all([requestToPromise(request), txDone(transaction)]);
    return result;
  } finally {
    db.close();
  }
}

export async function readPersistedCustomGlasses(): Promise<readonly PersistedCustomGlassRow[]> {
  const rows = await readStoredCustomGlassRows();
  return rows.filter(isPersistedCustomGlassRow);
}

export async function readStoredCustomGlassRows(): Promise<readonly unknown[]> {
  return withStore(CUSTOM_STORE, "readonly", (store) => store.getAll());
}

export async function upsertPersistedCustomGlass(input: UserDefinedGlassInput): Promise<void> {
  await withStore(CUSTOM_STORE, "readwrite", (store) => store.put(toPersistedCustomGlassRow(input)));
}

export async function upsertPersistedCustomGlasses(inputs: readonly UserDefinedGlassInput[]): Promise<void> {
  const db = await openDb();
  try {
    const transaction = db.transaction(CUSTOM_STORE, "readwrite");
    const store = transaction.objectStore(CUSTOM_STORE);
    for (const input of inputs) {
      store.put(toPersistedCustomGlassRow(input));
    }
    await txDone(transaction);
  } finally {
    db.close();
  }
}

export async function deletePersistedCustomGlasses(labels: readonly string[]): Promise<void> {
  const db = await openDb();
  try {
    const transaction = db.transaction(CUSTOM_STORE, "readwrite");
    const store = transaction.objectStore(CUSTOM_STORE);
    for (const label of labels) {
      store.delete(label);
    }
    await txDone(transaction);
  } finally {
    db.close();
  }
}

export async function quarantinePersistedCustomGlass(row: PersistedCustomGlassRow): Promise<void> {
  await quarantineStoredCustomGlassRow(row, row.label);
}

export async function quarantineStoredCustomGlassRow(row: unknown, label: string): Promise<void> {
  const db = await openDb();
  try {
    const transaction = db.transaction([CUSTOM_STORE, QUARANTINED_STORE], "readwrite");
    transaction.objectStore(QUARANTINED_STORE).put(
      typeof row === "object" && row !== null ? row : { label, type: "invalid", pairs: [] },
    );
    transaction.objectStore(CUSTOM_STORE).delete(label);
    await txDone(transaction);
  } finally {
    db.close();
  }
}

export const customGlassStorageConstants = {
  dbName: DB_NAME,
  dbVersion: DB_VERSION,
  customStore: CUSTOM_STORE,
  quarantinedStore: QUARANTINED_STORE,
} as const;

export function _setIndexedDbForTest(factory: IDBFactory | undefined): void {
  indexedDbOverride = factory;
}
