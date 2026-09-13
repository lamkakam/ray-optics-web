import { deserialize, serialize } from "node:v8";
import { IDBDatabase, IDBFactory } from "fake-indexeddb";
import {
  _setIndexedDbForTest,
  customGlassStorageConstants,
  deletePersistedCustomGlasses,
  isPersistedCustomGlassRow,
  quarantinePersistedCustomGlass,
  quarantineStoredCustomGlassRow,
  readPersistedCustomGlasses,
  readStoredCustomGlassRows,
  toPersistedCustomGlassRow,
  upsertPersistedCustomGlass,
  upsertPersistedCustomGlasses,
} from "@/features/import-custom-glass/lib/customGlassStorage";
import type { UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";

const firstInput: UserDefinedGlassInput = {
  name: "FIRST",
  pairs: [
    [587.56, 1.5168],
    [486.13, 1.522],
  ],
};

const secondInput: UserDefinedGlassInput = {
  name: "SECOND",
  pairs: [
    [546.07, 1.518],
    [656.27, 1.514],
  ],
};

function openRawDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  const request = factory.open(
    customGlassStorageConstants.dbName,
    customGlassStorageConstants.dbVersion,
  );
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open test database."));
  });
}

async function readRawStore(
  factory: IDBFactory,
  storeName: string,
): Promise<readonly unknown[]> {
  const db = await openRawDatabase(factory);
  try {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    return await new Promise<readonly unknown[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to read test store."));
    });
  } finally {
    db.close();
  }
}

async function writeRawRows(
  factory: IDBFactory,
  rows: readonly unknown[],
): Promise<void> {
  const db = await openRawDatabase(factory);
  try {
    const transaction = db.transaction(
      customGlassStorageConstants.customStore,
      "readwrite",
    );
    const store = transaction.objectStore(
      customGlassStorageConstants.customStore,
    );
    for (const row of rows) {
      store.put(row);
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to write test rows."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Test row transaction aborted."));
    });
  } finally {
    db.close();
  }
}

async function settleWithin<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("IndexedDB test operation did not settle.")),
          250,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

type FakeRequest = {
  onerror: ((event: Event) => void) | null;
  onupgradeneeded: ((event: Event) => void) | null;
  onsuccess: ((event: Event) => void) | null;
  error: DOMException | null;
  result: IDBDatabase;
};

type FakeTransaction = {
  error: DOMException | null;
  onabort: ((event: Event) => void) | null;
  oncomplete: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  objectStore: () => {
    getAll: () => FakeRequest;
  };
};

type Failure =
  | "open"
  | "open-without-error"
  | "request"
  | "request-without-error"
  | "transaction-error"
  | "transaction-error-without-error"
  | "transaction-abort"
  | "transaction-abort-without-error";

function makeFailureFactory(failure: Failure): IDBFactory {
  const request = {
    onerror: null,
    onupgradeneeded: null,
    onsuccess: null,
    error: null,
    result: undefined,
  } as unknown as FakeRequest;
  const operationRequest = {
    onerror: null,
    onupgradeneeded: null,
    onsuccess: null,
    error: null,
    result: [],
  } as unknown as FakeRequest;
  const transaction: FakeTransaction = {
    error: null,
    onabort: null,
    oncomplete: null,
    onerror: null,
    objectStore: () => ({
      getAll: () => {
        queueMicrotask(() => {
          if (failure === "request" || failure === "request-without-error") {
            operationRequest.error =
              failure === "request"
                ? new DOMException("IndexedDB request failed.")
                : null;
            operationRequest.onerror?.(new Event("error"));
          } else {
            operationRequest.onsuccess?.(new Event("success"));
          }
        });
        return operationRequest;
      },
    }),
  };
  const database = {
    close: jest.fn(),
    objectStoreNames: { contains: () => true },
    transaction: () => {
      queueMicrotask(() => {
        if (
          failure === "transaction-error" ||
          failure === "transaction-error-without-error"
        ) {
          transaction.error =
            failure === "transaction-error"
              ? new DOMException("IndexedDB transaction failed.")
              : null;
          transaction.onerror?.(new Event("error"));
        } else if (
          failure === "transaction-abort" ||
          failure === "transaction-abort-without-error"
        ) {
          transaction.error =
            failure === "transaction-abort"
              ? new DOMException("IndexedDB transaction aborted.")
              : null;
          transaction.onabort?.(new Event("abort"));
        }
      });
      return transaction;
    },
  } as unknown as IDBDatabase;
  request.result = database;

  const factory = {
    open: jest.fn(() => {
      queueMicrotask(() => {
        if (failure === "open" || failure === "open-without-error") {
          request.error =
            failure === "open"
              ? new DOMException("IndexedDB open failed.")
              : null;
          request.onerror?.(new Event("error"));
        } else {
          request.onsuccess?.(new Event("success"));
        }
      });
      return request;
    }),
  } as unknown as IDBFactory;
  return factory;
}

function makeExistingStoreFactory(): {
  factory: IDBFactory;
  createObjectStore: jest.Mock;
} {
  const request = {
    onerror: null,
    onupgradeneeded: null,
    onsuccess: null,
    error: null,
    result: undefined,
  } as unknown as FakeRequest;
  const operationRequest = {
    onerror: null,
    onupgradeneeded: null,
    onsuccess: null,
    error: null,
    result: [],
  } as unknown as FakeRequest;
  const transaction: FakeTransaction = {
    error: null,
    onabort: null,
    oncomplete: null,
    onerror: null,
    objectStore: () => ({
      getAll: () => {
        queueMicrotask(() =>
          operationRequest.onsuccess?.(new Event("success")),
        );
        return operationRequest;
      },
    }),
  };
  const createObjectStore = jest.fn();
  const database = {
    close: jest.fn(),
    objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
    createObjectStore,
    transaction: () => {
      queueMicrotask(() => transaction.oncomplete?.());
      return transaction;
    },
  } as unknown as IDBDatabase;
  request.result = database;

  const factory = {
    open: jest.fn(() => {
      queueMicrotask(() => {
        request.onupgradeneeded?.(new Event("upgradeneeded"));
        request.onsuccess?.(new Event("success"));
      });
      return request;
    }),
  } as unknown as IDBFactory;
  return { factory, createObjectStore };
}

describe("customGlassStorage", () => {
  let factory: IDBFactory;
  const originalStructuredClone = globalThis.structuredClone;

  beforeEach(() => {
    Object.defineProperty(globalThis, "structuredClone", {
      configurable: true,
      value: <T>(value: T) => deserialize(serialize(value)) as T,
    });
    factory = new IDBFactory();
    _setIndexedDbForTest(factory);
  });

  afterEach(() => {
    _setIndexedDbForTest(undefined);
    Object.defineProperty(globalThis, "structuredClone", {
      configurable: true,
      value: originalStructuredClone,
    });
  });

  it("defines the IndexedDB database and store contract", () => {
    expect(customGlassStorageConstants).toEqual({
      dbName: "ray-optics-web-custom-glass",
      dbVersion: 1,
      customStore: "customGlasses",
      quarantinedStore: "quarantinedCustomGlasses",
    });
  });

  it("settles successful storage operations instead of leaving requests pending", async () => {
    await expect(
      settleWithin(upsertPersistedCustomGlass(firstInput)),
    ).resolves.toBeUndefined();
  });

  it("does not recreate object stores that already exist during an upgrade", async () => {
    const { factory: existingStoreFactory, createObjectStore } =
      makeExistingStoreFactory();
    _setIndexedDbForTest(existingStoreFactory);

    await expect(settleWithin(readStoredCustomGlassRows())).resolves.toEqual(
      [],
    );
    expect(createObjectStore).not.toHaveBeenCalled();
  });

  it("converts worker input to a tabulated persisted row keyed by label", () => {
    expect(
      toPersistedCustomGlassRow({
        name: "CUSTOM",
        pairs: [
          [587.56, 1.5168],
          [486.13, 1.522],
        ],
      }),
    ).toEqual({
      label: "CUSTOM",
      type: "tabulated",
      pairs: [
        [587.56, 1.5168],
        [486.13, 1.522],
      ],
    });
  });

  it("accepts only tabulated rows with finite numeric pairs", () => {
    expect(
      isPersistedCustomGlassRow({
        label: "CUSTOM",
        type: "tabulated",
        pairs: [[587.56, 1.5168]],
      }),
    ).toBe(true);
    expect(
      isPersistedCustomGlassRow({
        label: "CUSTOM",
        type: "sellmeier",
        pairs: [[587.56, 1.5168]],
      }),
    ).toBe(false);
    expect(
      isPersistedCustomGlassRow({
        label: "CUSTOM",
        type: "tabulated",
        pairs: [[587.56, Number.NaN]],
      }),
    ).toBe(false);
    expect(
      isPersistedCustomGlassRow({
        label: "CUSTOM",
        type: "tabulated",
        pairs: [
          [587.56, 1.5],
          [486.13, Number.NaN],
        ],
      }),
    ).toBe(false);
  });

  it.each([
    undefined,
    null,
    "not a row",
    { label: "", type: "tabulated", pairs: [] },
    { label: "   ", type: "tabulated", pairs: [] },
    { label: 123, type: "tabulated", pairs: [] },
    { label: "CUSTOM", type: "tabulated", pairs: "not an array" },
    { label: "CUSTOM", type: "tabulated", pairs: [[587.56]] },
    { label: "CUSTOM", type: "tabulated", pairs: [[587.56, 1.5, 99]] },
    { label: "CUSTOM", type: "tabulated", pairs: [["not finite", 1.5]] },
    {
      label: "CUSTOM",
      type: "tabulated",
      pairs: [{ length: 2, 0: 587.56, 1: 1.5 }],
    },
    {
      label: "CUSTOM",
      type: "tabulated",
      pairs: [
        [587.56, 1.5],
        [486.13, Number.NaN],
      ],
    },
    {
      label: "CUSTOM",
      type: "tabulated",
      pairs: [{ wavelength: 587.56, index: 1.5 }],
    },
    {
      label: "CUSTOM",
      type: "tabulated",
      pairs: [[587.56, Number.POSITIVE_INFINITY]],
    },
  ])("rejects invalid persisted row %p", (row) => {
    expect(isPersistedCustomGlassRow(row)).toBe(false);
  });

  it("creates both object stores and supports single and batch upserts", async () => {
    await upsertPersistedCustomGlass(firstInput);
    await upsertPersistedCustomGlasses([
      secondInput,
      { ...firstInput, name: "REPLACED" },
    ]);

    expect(await readPersistedCustomGlasses()).toEqual(
      expect.arrayContaining([
        { label: "FIRST", type: "tabulated", pairs: firstInput.pairs },
        { label: "SECOND", type: "tabulated", pairs: secondInput.pairs },
        { label: "REPLACED", type: "tabulated", pairs: firstInput.pairs },
      ]),
    );
    expect(
      await readRawStore(factory, customGlassStorageConstants.quarantinedStore),
    ).toEqual([]);
  });

  it("filters invalid raw rows when reading persisted glasses", async () => {
    await upsertPersistedCustomGlass(firstInput);
    await writeRawRows(factory, [
      { label: "WRONG_TYPE", type: "sellmeier", pairs: [[587.56, 1.5]] },
      { label: "BAD_PAIR", type: "tabulated", pairs: [[587.56, Number.NaN]] },
      { label: "", type: "tabulated", pairs: [[587.56, 1.5]] },
    ]);

    const storedRows = await readStoredCustomGlassRows();
    expect(storedRows).toHaveLength(4);
    expect(await readPersistedCustomGlasses()).toEqual([
      { label: "FIRST", type: "tabulated", pairs: firstInput.pairs },
    ]);
  });

  it("deletes a batch of persisted labels", async () => {
    await upsertPersistedCustomGlasses([firstInput, secondInput]);

    await deletePersistedCustomGlasses(["FIRST", "MISSING"]);

    expect(await readPersistedCustomGlasses()).toEqual([
      { label: "SECOND", type: "tabulated", pairs: secondInput.pairs },
    ]);
  });

  it("moves valid rows to quarantine and removes them from the custom store", async () => {
    await upsertPersistedCustomGlass(firstInput);

    await quarantinePersistedCustomGlass({
      label: "FIRST",
      type: "tabulated",
      pairs: firstInput.pairs,
    });

    expect(await readStoredCustomGlassRows()).toEqual([]);
    expect(
      await readRawStore(factory, customGlassStorageConstants.quarantinedStore),
    ).toEqual([{ label: "FIRST", type: "tabulated", pairs: firstInput.pairs }]);
  });

  it("uses the fallback quarantine row for primitive input and preserves object input", async () => {
    await upsertPersistedCustomGlasses([
      { name: "PRIMITIVE", pairs: firstInput.pairs },
      { name: "OBJECT", pairs: secondInput.pairs },
    ]);

    const objectRow = { label: "OBJECT", type: "unexpected", pairs: [] };
    await quarantineStoredCustomGlassRow("invalid primitive", "PRIMITIVE");
    await quarantineStoredCustomGlassRow(null, "NULL");
    await quarantineStoredCustomGlassRow(objectRow, "OBJECT");

    expect(await readStoredCustomGlassRows()).toEqual([]);
    expect(
      await readRawStore(factory, customGlassStorageConstants.quarantinedStore),
    ).toEqual([
      { label: "NULL", type: "invalid", pairs: [] },
      { label: "OBJECT", type: "unexpected", pairs: [] },
      { label: "PRIMITIVE", type: "invalid", pairs: [] },
    ]);
  });

  it("closes opened databases after successful storage operations", async () => {
    const close = jest.spyOn(IDBDatabase.prototype, "close");

    try {
      await upsertPersistedCustomGlass(firstInput);
      await readPersistedCustomGlasses();
      await upsertPersistedCustomGlasses([secondInput]);
      await deletePersistedCustomGlasses([secondInput.name]);
      await quarantinePersistedCustomGlass(
        toPersistedCustomGlassRow(firstInput),
      );
      expect(close).toHaveBeenCalled();
      expect(close).toHaveBeenCalledTimes(5);
    } finally {
      close.mockRestore();
    }
  });

  it("rejects when IndexedDB is unavailable", async () => {
    _setIndexedDbForTest(undefined);
    const originalIndexedDB = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });

    try {
      await expect(readPersistedCustomGlasses()).rejects.toThrow(
        "IndexedDB is not available.",
      );
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: originalIndexedDB,
      });
    }
  });

  it("rejects IndexedDB open, request, transaction-error, and transaction-abort failures", async () => {
    for (const failure of [
      "open",
      "request",
      "transaction-error",
      "transaction-abort",
    ] as const) {
      _setIndexedDbForTest(makeFailureFactory(failure));
      await expect(
        settleWithin(readStoredCustomGlassRows()),
      ).rejects.toBeInstanceOf(DOMException);
    }
  });

  it("uses fallback messages when IndexedDB failures omit an error object", async () => {
    const failures: readonly [Failure, string][] = [
      ["open-without-error", "IndexedDB request failed."],
      ["request-without-error", "IndexedDB request failed."],
      ["transaction-error-without-error", "IndexedDB transaction failed."],
      ["transaction-abort-without-error", "IndexedDB transaction aborted."],
    ];

    for (const [failure, message] of failures) {
      _setIndexedDbForTest(makeFailureFactory(failure));
      await expect(settleWithin(readStoredCustomGlassRows())).rejects.toThrow(
        message,
      );
    }
  });
});
