/**
 * Worker-first custom-glass mutation orchestration shared by the GUI and WebMCP.
 * Successful runtime mutations are always persisted when possible and mirrored
 * into the Glass Map store; persistence failures remain warning-only.
 */
import type {
  UserDefinedGlassData,
  UserDefinedGlassInput,
} from "@/features/glass-map/types/glassMap";
import type { CustomGlassStoreActions } from "@/features/import-custom-glass/types/customGlassImport";
import { validateCustomGlassInput } from "@/features/import-custom-glass/lib/customGlassValidation";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

/** Dependencies for one or more custom-glass mutations. */
export interface CustomGlassOperationDependencies {
  readonly proxy: PyodideWorkerAPI;
  readonly storeActions: CustomGlassStoreActions;
  readonly persistInput?: (input: UserDefinedGlassInput) => Promise<void>;
  readonly deletePersisted?: (labels: readonly string[]) => Promise<void>;
  readonly onPersistenceWarning?: (message: string) => void;
}

/** Successful mutation data and warning-only persistence failures. */
export interface CustomGlassMutationResult {
  readonly glass?: UserDefinedGlassData;
  readonly persistenceWarnings?: readonly string[];
}

function warningMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function persistWithWarning(
  operation: (() => Promise<void>) | undefined,
  fallback: string,
  dependencies: CustomGlassOperationDependencies,
  warnings: string[],
): Promise<void> {
  if (operation === undefined) return;
  try {
    await operation();
  } catch (error) {
    const message = warningMessage(error, fallback);
    warnings.push(message);
    dependencies.onPersistenceWarning?.(message);
  }
}

function mutationResult(
  glass: UserDefinedGlassData | undefined,
  warnings: readonly string[],
): CustomGlassMutationResult {
  return {
    ...(glass === undefined ? {} : { glass }),
    ...(warnings.length === 0 ? {} : { persistenceWarnings: warnings }),
  };
}

/** Adds one runtime glass, then persists and mirrors the successful addition. */
export async function addCustomGlass(
  input: UserDefinedGlassInput,
  dependencies: CustomGlassOperationDependencies,
): Promise<CustomGlassMutationResult> {
  if (!validateCustomGlassInput(input)) {
    throw new Error("Invalid custom-glass worker input.");
  }
  const added = await dependencies.proxy.addUserDefinedGlasses([input]);
  const warnings: string[] = [];
  await persistWithWarning(
    dependencies.persistInput === undefined
      ? undefined
      : () => dependencies.persistInput?.(input) ?? Promise.resolve(),
    "Failed to persist custom glass.",
    dependencies,
    warnings,
  );
  dependencies.storeActions.upsertCustomGlasses(added);
  return mutationResult(added[input.name], warnings);
}

/** Updates in place or performs the established add-then-delete rename flow. */
export async function updateCustomGlass(
  currentName: string,
  input: UserDefinedGlassInput,
  dependencies: CustomGlassOperationDependencies,
): Promise<CustomGlassMutationResult> {
  if (!validateCustomGlassInput(input)) {
    throw new Error("Invalid custom-glass worker input.");
  }
  if (currentName === input.name) {
    const updated = await dependencies.proxy.updateUserDefinedGlasses([input]);
    const warnings: string[] = [];
    await persistWithWarning(
      dependencies.persistInput === undefined
        ? undefined
        : () => dependencies.persistInput?.(input) ?? Promise.resolve(),
      "Failed to persist custom glass.",
      dependencies,
      warnings,
    );
    dependencies.storeActions.upsertCustomGlasses(updated);
    return mutationResult(updated[input.name], warnings);
  }

  const warnings: string[] = [];
  const added = await dependencies.proxy.addUserDefinedGlasses([input]);
  await persistWithWarning(
    dependencies.persistInput === undefined
      ? undefined
      : () => dependencies.persistInput?.(input) ?? Promise.resolve(),
    "Failed to persist custom glass.",
    dependencies,
    warnings,
  );
  dependencies.storeActions.upsertCustomGlasses(added);

  await dependencies.proxy.deleteUserDefinedGlasses([currentName]);
  await persistWithWarning(
    dependencies.deletePersisted === undefined
      ? undefined
      : () =>
          dependencies.deletePersisted?.([currentName]) ?? Promise.resolve(),
    "Failed to delete persisted custom glass.",
    dependencies,
    warnings,
  );
  dependencies.storeActions.deleteCustomGlasses([currentName]);
  return mutationResult(added[input.name], warnings);
}

/** Deletes runtime labels, then persisted rows, then matching Glass Map entries. */
export async function deleteCustomGlasses(
  names: readonly string[],
  dependencies: CustomGlassOperationDependencies,
): Promise<CustomGlassMutationResult> {
  await dependencies.proxy.deleteUserDefinedGlasses(names);
  const warnings: string[] = [];
  await persistWithWarning(
    dependencies.deletePersisted === undefined
      ? undefined
      : () => dependencies.deletePersisted?.(names) ?? Promise.resolve(),
    "Failed to delete persisted custom glass.",
    dependencies,
    warnings,
  );
  dependencies.storeActions.deleteCustomGlasses(names);
  return mutationResult(undefined, warnings);
}
