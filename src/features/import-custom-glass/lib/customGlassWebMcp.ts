/**
 * Strict page-scoped WebMCP descriptors for custom-glass CRUD. Descriptors read
 * their dependency source at execution time and delegate mutations to the same
 * worker-first orchestration used by the Import Custom Glass GUI.
 */
import type {
  UserDefinedGlassInput,
  UserDefinedMaterialsData,
} from "@/features/glass-map/types/glassMap";
import {
  addCustomGlass,
  deleteCustomGlasses,
  updateCustomGlass,
  type CustomGlassOperationDependencies,
} from "@/features/import-custom-glass/lib/customGlassOperations";
import {
  customGlassInputSchema,
  customGlassPairsSchema,
  createCustomGlassAjv,
} from "@/features/import-custom-glass/lib/customGlassValidation";
import type { CustomGlassStoreActions } from "@/features/import-custom-glass/types/customGlassImport";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";
import { WebMcpToolError } from "@/shared/lib/webMcpErrors";

/** Live page dependencies shared by the descriptors and visible GUI. */
export interface CustomGlassWebMcpDependencies {
  readonly proxy: PyodideWorkerAPI | undefined;
  /** Undefined until catalog hydration completes; an empty object is a ready catalog. */
  readonly customGlasses: UserDefinedMaterialsData | undefined;
  readonly storeActions: CustomGlassStoreActions;
  readonly persistInput?: CustomGlassOperationDependencies["persistInput"];
  readonly deletePersisted?: CustomGlassOperationDependencies["deletePersisted"];
  readonly onPersistenceWarning?: CustomGlassOperationDependencies["onPersistenceWarning"];
}

type DependenciesSource =
  | CustomGlassWebMcpDependencies
  | (() => CustomGlassWebMcpDependencies);

/** Optional single-label read input. */
export const getCustomGlassesInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { name: { type: "string", pattern: ".*\\S.*" } },
} as const;

/** Strict one-glass create input. */
export const addCustomGlassInputSchema = customGlassInputSchema;

/** Strict update/rename input with current and resulting labels. */
export const updateCustomGlassInputSchema = {
  type: "object",
  required: ["currentName", "name", "pairs"],
  additionalProperties: false,
  properties: {
    currentName: { type: "string", pattern: ".*\\S.*" },
    name: { type: "string", pattern: ".*\\S.*" },
    pairs: customGlassPairsSchema,
  },
} as const;

/** Strict one-label delete input. */
export const deleteCustomGlassInputSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: { name: { type: "string", pattern: ".*\\S.*" } },
} as const;

interface GetInput {
  readonly name?: string;
}
interface UpdateInput extends UserDefinedGlassInput {
  readonly currentName: string;
}
interface DeleteInput {
  readonly name: string;
}

const validators = (() => {
  const ajv = createCustomGlassAjv();
  return {
    get: ajv.compile<GetInput>(getCustomGlassesInputSchema),
    add: ajv.compile<UserDefinedGlassInput>(addCustomGlassInputSchema),
    update: ajv.compile<UpdateInput>(updateCustomGlassInputSchema),
    delete: ajv.compile<DeleteInput>(deleteCustomGlassInputSchema),
  };
})();

/** Named handles for the four custom-glass CRUD descriptors. */
export type CustomGlassWebMcpTools = Readonly<{
  readonly getCustomGlasses: WebMCP.ModelContextTool;
  readonly addCustomGlass: WebMCP.ModelContextTool;
  readonly updateCustomGlass: WebMCP.ModelContextTool;
  readonly deleteCustomGlass: WebMCP.ModelContextTool;
}>;

function currentDependencies(
  source: DependenciesSource,
): CustomGlassWebMcpDependencies {
  return typeof source === "function" ? source() : source;
}

function semanticError(path: string, message: string, hint: string): never {
  throw new WebMcpToolError(
    "invalid_input",
    `Invalid input at ${path}: ${message}`,
    { path, hint },
  );
}

const UNKNOWN_GLASS_HINT =
  "Call get_custom_glasses to list the exact custom-glass labels.";
const DUPLICATE_GLASS_HINT =
  "Choose another label, or call update_custom_glass to change the existing glass.";
const RETRY_HINT =
  "Wait for app initialization to finish loading the custom-glass catalog, then retry.";

/** Rejects incomplete catalog hydration before any membership lookup or side effect. */
function requireCustomGlassCatalog(
  dependencies: CustomGlassWebMcpDependencies,
): UserDefinedMaterialsData {
  if (dependencies.customGlasses === undefined) {
    throw new WebMcpToolError(
      "not_ready",
      "Custom-glass catalog is not ready.",
      { hint: RETRY_HINT },
    );
  }
  return dependencies.customGlasses;
}

function operationDependencies(
  dependencies: CustomGlassWebMcpDependencies,
): CustomGlassOperationDependencies {
  if (dependencies.proxy === undefined) {
    throw new WebMcpToolError(
      "not_ready",
      "Custom-glass worker is not available.",
      { hint: RETRY_HINT },
    );
  }
  return {
    proxy: dependencies.proxy,
    storeActions: dependencies.storeActions,
    persistInput: dependencies.persistInput,
    deletePersisted: dependencies.deletePersisted,
    onPersistenceWarning: dependencies.onPersistenceWarning,
  };
}

function requireGlass(
  name: string,
  glass: UserDefinedMaterialsData[string] | undefined,
): UserDefinedMaterialsData[string] {
  if (glass === undefined) {
    throw new WebMcpToolError(
      "internal_error",
      `Worker did not return custom glass ${name}.`,
    );
  }
  return glass;
}

/**
 * Creates the four descriptors in their public registration order. Each execution
 * validates input and cancellation, then requires a hydrated catalog before lookups
 * or mutations. Only own catalog properties count as glass names, including labels
 * shared with Object.prototype. Stable descriptors observe hydration through source.
 * Failures throw `WebMcpToolError`: an unhydrated catalog or missing worker is
 * `not_ready`, unknown or duplicate labels are `invalid_input` with a
 * corrective hint, and a missing worker result is `internal_error`.
 */
export function createCustomGlassWebMcpTools(
  source: DependenciesSource,
): CustomGlassWebMcpTools {
  return {
    getCustomGlasses: {
      name: "get_custom_glasses",
      description: "Read all custom glasses or one exact custom-glass label.",
      inputSchema: getCustomGlassesInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.get, input);
        assertWebMcpNotCancelled(signal);
        const customGlasses = requireCustomGlassCatalog(
          currentDependencies(source),
        );
        const { name } = input as GetInput;
        if (name === undefined) return JSON.stringify({ customGlasses });
        if (!Object.hasOwn(customGlasses, name))
          semanticError(
            "/name",
            `unknown custom glass ${name}`,
            UNKNOWN_GLASS_HINT,
          );
        const glass = customGlasses[name];
        return JSON.stringify({ customGlasses: { [name]: glass } });
      },
    },
    addCustomGlass: {
      name: "add_custom_glass",
      description:
        "Add one tabulated custom glass using at least four unique positive finite wavelength/index pairs; wavelengths are in nanometres.",
      inputSchema: addCustomGlassInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.add, input);
        assertWebMcpNotCancelled(signal);
        const dependencies = currentDependencies(source);
        const customGlasses = requireCustomGlassCatalog(dependencies);
        if (Object.hasOwn(customGlasses, input.name)) {
          semanticError(
            "/name",
            `custom glass ${input.name} already exists`,
            DUPLICATE_GLASS_HINT,
          );
        }
        const result = await addCustomGlass(
          input,
          operationDependencies(dependencies),
        );
        return JSON.stringify({
          name: input.name,
          glass: requireGlass(input.name, result.glass),
          ...(result.persistenceWarnings === undefined
            ? {}
            : { persistenceWarnings: result.persistenceWarnings }),
        });
      },
    },
    updateCustomGlass: {
      name: "update_custom_glass",
      description:
        "Update or rename one custom glass using at least four unique positive finite wavelength/index pairs; wavelengths are in nanometres.",
      inputSchema: updateCustomGlassInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.update, input);
        assertWebMcpNotCancelled(signal);
        const dependencies = currentDependencies(source);
        const customGlasses = requireCustomGlassCatalog(dependencies);
        if (!Object.hasOwn(customGlasses, input.currentName)) {
          semanticError(
            "/currentName",
            `unknown custom glass ${input.currentName}`,
            UNKNOWN_GLASS_HINT,
          );
        }
        if (
          input.name !== input.currentName &&
          Object.hasOwn(customGlasses, input.name)
        ) {
          semanticError(
            "/name",
            `custom glass ${input.name} already exists`,
            "Choose another label, or delete the existing glass with delete_custom_glass first.",
          );
        }
        const result = await updateCustomGlass(
          input.currentName,
          { name: input.name, pairs: input.pairs },
          operationDependencies(dependencies),
        );
        return JSON.stringify({
          currentName: input.currentName,
          name: input.name,
          glass: requireGlass(input.name, result.glass),
          ...(result.persistenceWarnings === undefined
            ? {}
            : { persistenceWarnings: result.persistenceWarnings }),
        });
      },
    },
    deleteCustomGlass: {
      name: "delete_custom_glass",
      description: "Delete one custom glass by its exact label.",
      inputSchema: deleteCustomGlassInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.delete, input);
        assertWebMcpNotCancelled(signal);
        const dependencies = currentDependencies(source);
        const customGlasses = requireCustomGlassCatalog(dependencies);
        if (!Object.hasOwn(customGlasses, input.name)) {
          semanticError(
            "/name",
            `unknown custom glass ${input.name}`,
            UNKNOWN_GLASS_HINT,
          );
        }
        const result = await deleteCustomGlasses(
          [input.name],
          operationDependencies(dependencies),
        );
        return JSON.stringify({
          name: input.name,
          ...(result.persistenceWarnings === undefined
            ? {}
            : { persistenceWarnings: result.persistenceWarnings }),
        });
      },
    },
  };
}

/** Alias using the all-capitals acronym used by the composition hook. */
export const createCustomGlassWebMCPTools = createCustomGlassWebMcpTools;
