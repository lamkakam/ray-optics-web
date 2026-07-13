import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

type WorkerHandler = (event: {
  readonly request: { readonly url: string };
  waitUntil(promise: Promise<unknown>): void;
  respondWith(promise: Promise<MockResponse>): void;
}) => void;

class MockResponse {
  constructor(
    readonly body: string,
    readonly ok = true
  ) {}

  clone(): MockResponse {
    return new MockResponse(this.body, this.ok);
  }
}

class MockCache {
  readonly entries = new Map<string, MockResponse>();
  readonly added: string[][] = [];

  async addAll(urls: string[]): Promise<void> {
    this.added.push([...urls]);
    urls.forEach((url) => this.entries.set(url, new MockResponse(url)));
  }

  async match(request: { readonly url: string } | string): Promise<MockResponse | undefined> {
    return this.entries.get(typeof request === "string" ? request : request.url);
  }

  async put(
    request: { readonly url: string } | string,
    response: MockResponse
  ): Promise<void> {
    this.entries.set(typeof request === "string" ? request : request.url, response);
  }
}

class MockCaches {
  readonly stores = new Map<string, MockCache>();
  readonly deleted: string[] = [];

  async open(name: string): Promise<MockCache> {
    const cache = this.stores.get(name) ?? new MockCache();
    this.stores.set(name, cache);
    return cache;
  }

  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }

  async delete(name: string): Promise<boolean> {
    this.deleted.push(name);
    return this.stores.delete(name);
  }

  async match(request: { readonly url: string }): Promise<MockResponse | undefined> {
    for (const cache of this.stores.values()) {
      const response = await cache.match(request);
      if (response) return response;
    }
    return undefined;
  }
}

async function loadWorker(manifest: string[], caches = new MockCaches()) {
  const handlers = new Map<string, WorkerHandler>();
  const source = (
    await readFile(path.join(process.cwd(), "public/pyodide-sw.js"), "utf8")
  ).replace("/* __NEXT_STATIC_MANIFEST__ */ []", JSON.stringify(manifest));
  const fetchMock = jest.fn<Promise<MockResponse>, [{ readonly url: string }]>(
    async () => new MockResponse("network")
  );
  const self = {
    location: { origin: "https://example.com" },
    registration: { scope: "https://example.com/ray-optics-web/" },
    clients: { claim: jest.fn(async () => undefined) },
    skipWaiting: jest.fn(async () => undefined),
    addEventListener: (type: string, handler: WorkerHandler) => handlers.set(type, handler),
  };
  vm.runInNewContext(source, { self, caches, fetch: fetchMock, URL, Promise });
  return { caches, fetchMock, handlers, self };
}

async function dispatch(worker: Awaited<ReturnType<typeof loadWorker>>, type: string, url = "") {
  let pending: Promise<unknown> | undefined;
  let response: Promise<MockResponse> | undefined;
  worker.handlers.get(type)?.({
    request: { url },
    waitUntil: (promise) => { pending = promise; },
    respondWith: (promise) => { response = promise; },
  });
  await pending;
  return response;
}

describe("pyodide service worker", () => {
  it("precaches the complete generated manifest during installation", async () => {
    const manifest = [
      "/ray-optics-web/_next/static/a.js",
      "/ray-optics-web/_next/static/b.css",
    ];
    const worker = await loadWorker(manifest);
    await dispatch(worker, "install");
    expect((await worker.caches.open("next-static-assets")).added).toEqual([manifest]);
  });

  it("keeps a previous deployment asset cache-first when the network would 404", async () => {
    const sharedCaches = new MockCaches();
    const oldUrl = "https://example.com/ray-optics-web/_next/static/old.js";
    const versionA = await loadWorker([oldUrl], sharedCaches);
    await dispatch(versionA, "install");
    const versionB = await loadWorker(
      ["https://example.com/ray-optics-web/_next/static/new.js"],
      sharedCaches
    );
    versionB.fetchMock.mockResolvedValue(new MockResponse("missing", false));
    await dispatch(versionB, "install");

    const response = await dispatch(versionB, "fetch", oldUrl);
    expect(response).toMatchObject({ body: oldUrl, ok: true });
    expect(versionB.fetchMock).not.toHaveBeenCalled();
  });

  it("runtime-caches only successful Next static responses", async () => {
    const worker = await loadWorker([]);
    const goodUrl = "https://example.com/ray-optics-web/_next/static/good.js";
    const badUrl = "https://example.com/ray-optics-web/_next/static/bad.js";
    worker.fetchMock
      .mockResolvedValueOnce(new MockResponse("good"))
      .mockResolvedValueOnce(new MockResponse("bad", false));

    await (await dispatch(worker, "fetch", goodUrl));
    await (await dispatch(worker, "fetch", badUrl));

    const cache = await worker.caches.open("next-static-assets");
    await expect(cache.match(goodUrl)).resolves.toMatchObject({ body: "good" });
    await expect(cache.match(badUrl)).resolves.toBeUndefined();
  });

  it("retains Next and unrelated caches while deleting obsolete Pyodide caches", async () => {
    const caches = new MockCaches();
    await caches.open("next-static-assets");
    await caches.open("pyodide-cache-v1.2");
    await caches.open("pyodide-cache-v1.3");
    await caches.open("unrelated-cache");
    const worker = await loadWorker([], caches);

    await dispatch(worker, "activate");

    expect(caches.deleted).toEqual(["pyodide-cache-v1.2"]);
    await expect(caches.keys()).resolves.toEqual([
      "next-static-assets",
      "pyodide-cache-v1.3",
      "unrelated-cache",
    ]);
  });
});
