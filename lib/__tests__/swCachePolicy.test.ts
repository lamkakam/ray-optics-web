import { shouldCache } from "../swCachePolicy";

describe("shouldCache", () => {
  it("returns true for Pyodide CDN URLs", () => {
    expect(
      shouldCache("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js")
    ).toBe(true);
    expect(
      shouldCache(
        "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.asm.wasm"
      )
    ).toBe(true);
    expect(
      shouldCache(
        "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl"
      )
    ).toBe(true);
  });

  it("returns true for PyPI metadata API URLs", () => {
    expect(
      shouldCache("https://pypi.org/pypi/rayoptics/json")
    ).toBe(true);
  });

  it("returns true for PyPI wheel URLs", () => {
    expect(
      shouldCache(
        "https://files.pythonhosted.org/packages/ab/cd/rayoptics-0.9.5-py3-none-any.whl"
      )
    ).toBe(true);
  });

  it("returns false for app asset URLs", () => {
    expect(shouldCache("https://example.com/app.js")).toBe(false);
    expect(shouldCache("/index.html")).toBe(false);
    expect(shouldCache("https://example.com/api/data")).toBe(false);
  });

  it("returns false for unrelated jsdelivr URLs", () => {
    expect(
      shouldCache("https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js")
    ).toBe(false);
  });
});
