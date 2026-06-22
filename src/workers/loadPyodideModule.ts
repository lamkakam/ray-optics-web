import type { loadPyodide } from "pyodide";

type CreatePyodideModule = NonNullable<
  NonNullable<Parameters<typeof loadPyodide>[0]>["createPyodideModule"]
>;

export async function loadPyodideModule(
  cdnUrl: string,
): Promise<CreatePyodideModule> {
  const { default: createPyodideModule } = await import(
    /* webpackIgnore: true */ `${cdnUrl}/pyodide.asm.mjs`
  );
  return createPyodideModule as CreatePyodideModule;
}
