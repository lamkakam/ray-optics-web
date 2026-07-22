import type { loadPyodide } from "pyodide";

type CreatePyodideModule = NonNullable<
  NonNullable<Parameters<typeof loadPyodide>[0]>["createPyodideModule"]
>;

/** Natively imports Pyodide's `pyodide.asm.mjs` module factory from the supplied versioned CDN URL. `webpackIgnore` is required so webpack does not convert the computed remote import into a local context lookup. The factory is passed to the npm package's `loadPyodide` function by the worker. */
export async function loadPyodideModule(
  cdnUrl: string,
): Promise<CreatePyodideModule> {
  const { default: createPyodideModule } = await import(
    /* webpackIgnore: true */ `${cdnUrl}/pyodide.asm.mjs`
  );
  return createPyodideModule as CreatePyodideModule;
}
