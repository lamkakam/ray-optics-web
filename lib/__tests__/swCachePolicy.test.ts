import { shouldCache } from "../swCachePolicy";

describe("shouldCache", () => {
  it("returns true for local Pyodide asset paths", () => {
    expect(shouldCache("http://localhost:3000/pyodide/pyodide.js")).toBe(true);
    expect(shouldCache("http://localhost:3000/pyodide/pyodide.asm.wasm")).toBe(true);
    expect(
      shouldCache(
        "http://localhost:3000/pyodide/numpy-2.0.2-cp312-cp312-pyodide_2024_0_wasm32.whl"
      )
    ).toBe(true);
    expect(shouldCache("/pyodide/pyodide.js")).toBe(true);
  });

  it("returns true for local PyPI wheel paths", () => {
    expect(
      shouldCache("http://localhost:3000/wheels/rayoptics-0.9.4-py3-none-any.whl")
    ).toBe(true);
    expect(shouldCache("/wheels/index.json")).toBe(true);
  });

  it("returns false for CDN URLs (no longer used)", () => {
    expect(
      shouldCache("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js")
    ).toBe(false);
    expect(
      shouldCache("https://files.pythonhosted.org/packages/ab/cd/rayoptics-0.9.5-py3-none-any.whl")
    ).toBe(false);
    expect(shouldCache("https://pypi.org/pypi/rayoptics/json")).toBe(false);
  });

  it("returns false for unrelated app URLs", () => {
    expect(shouldCache("https://example.com/app.js")).toBe(false);
    expect(shouldCache("/index.html")).toBe(false);
    expect(shouldCache("https://example.com/api/data")).toBe(false);
    expect(
      shouldCache("https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js")
    ).toBe(false);
  });
});
