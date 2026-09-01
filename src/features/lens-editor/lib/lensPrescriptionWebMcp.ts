/**
 * Dependency-injected WebMCP registration for validated Lens Editor prescription
 * reads and mutations. Browser validation is advisory: every execution is checked
 * again with the compiled application-side AJV schema before Zustand is accessed.
 */
import type { ErrorObject, ValidateFunction } from "ajv";
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { gridRowsToSurfaces, surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { Surfaces } from "@/shared/lib/types/opticalModel";
import {
  asphericalSchema,
  clearApertureSchema,
  createPrescriptionAjv,
  decenterConfigSchema,
  diffractiveElementSchema,
  edgeApertureSchema,
  finiteNumberSchema,
  lensPrescriptionSchema,
} from "@/shared/lib/schemas/prescriptionSchema";

type RowSelector = "object" | "image" | number;
type JsonRecord = Record<string, unknown>;

const rowSelectorSchema = {
  oneOf: [
    { type: "string", enum: ["object", "image"] },
    { type: "integer", minimum: 1 },
  ],
} as const;
const surfaceSelectorSchema = { type: "integer", minimum: 1 } as const;

/** Read tool schema; omission of `row` requests the complete prescription. */
export const getLensPrescriptionInputSchema = {
  type: "object", additionalProperties: false,
  properties: { row: rowSelectorSchema },
} as const;
/** Bulk replacement accepts exactly the reusable external prescription contract. */
export const setLensPrescriptionInputSchema = lensPrescriptionSchema;
/** Insert schema permits insertion after Object or an existing physical surface. */
export const insertLensSurfaceInputSchema = {
  type: "object", required: ["after"], additionalProperties: false,
  properties: {
    after: { oneOf: [{ type: "string", const: "object" }, surfaceSelectorSchema] },
  },
} as const;

const updateValuesSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    distance: finiteNumberSchema,
    label: { type: "string", enum: ["Default", "Stop"] },
    comment: { type: "string" },
    curvatureRadius: finiteNumberSchema,
    thickness: finiteNumberSchema,
    medium: { type: "string" },
    manufacturer: { type: "string" },
    semiDiameter: finiteNumberSchema,
    aspherical: asphericalSchema,
    decenter: decenterConfigSchema,
    diffractiveElement: diffractiveElementSchema,
    clear_aperture: clearApertureSchema,
    edge_aperture: edgeApertureSchema,
  },
} as const;
const clearableFields = ["comment", "aspherical", "decenter", "diffractiveElement", "clear_aperture", "edge_aperture"] as const;
/** Partial row edit schema with explicit optional-field removal. */
export const updateLensRowInputSchema = {
  type: "object",
  required: ["row"],
  additionalProperties: false,
  anyOf: [{ required: ["values"] }, { required: ["clear"] }],
  properties: {
    row: rowSelectorSchema,
    values: updateValuesSchema,
    clear: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", enum: clearableFields } },
  },
} as const;
/** Delete schema only accepts positive visible surface indices. */
export const deleteLensSurfaceInputSchema = {
  type: "object", required: ["surface"], additionalProperties: false,
  properties: { surface: surfaceSelectorSchema },
} as const;

const ajv = createPrescriptionAjv();
const validators = {
  get: ajv.compile(getLensPrescriptionInputSchema),
  set: ajv.compile<Surfaces>(setLensPrescriptionInputSchema),
  insert: ajv.compile(insertLensSurfaceInputSchema),
  update: ajv.compile(updateLensRowInputSchema),
  delete: ajv.compile(deleteLensSurfaceInputSchema),
};

function errorPath(error: ErrorObject | undefined): string {
  if (!error) return "/";
  if (error.keyword === "required") return `${error.instancePath}/${String(error.params.missingProperty)}` || "/";
  if (error.keyword === "additionalProperties") return `${error.instancePath}/${String(error.params.additionalProperty)}` || "/";
  return error.instancePath || "/";
}

function assertInput<T>(validator: ValidateFunction<T>, input: unknown): asserts input is T {
  if (!validator(input)) {
    const error = validator.errors?.[0];
    throw new Error(`Invalid input at ${errorPath(error)}: ${error?.message ?? "schema check failed"}`);
  }
}

function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Tool execution was cancelled", "AbortError");
}

function resolveRow(rows: GridRow[], selector: RowSelector): GridRow | undefined {
  if (selector === "object") return rows.find((row) => row.kind === "object");
  if (selector === "image") return rows.find((row) => row.kind === "image");
  return rows.filter((row) => row.kind === "surface")[selector - 1];
}

function externalRow(row: GridRow): Surfaces["object"] | Surfaces["image"] | Surfaces["surfaces"][number] {
  if (row.kind === "object") {
    return { distance: row.objectDistance, medium: row.medium, manufacturer: row.manufacturer };
  }
  const prescription = gridRowsToSurfaces([row]);
  return row.kind === "image" ? prescription.image : prescription.surfaces[0];
}

function mutationResult(state: LensEditorState, extra: JsonRecord): string {
  return JSON.stringify({
    ...extra,
    revision: state.prescriptionRevision,
    surfaceCount: state.rows.filter((row) => row.kind === "surface").length,
    systemUpdateRequired: true,
  });
}

function semanticError(path: "/after" | "/row" | "/surface", message: string): never {
  throw new Error(`Invalid input at ${path}: ${message}`);
}

const applicableFields = {
  object: new Set(["distance", "medium", "manufacturer"]),
  image: new Set(["curvatureRadius", "decenter"]),
  surface: new Set([
    "label", "comment", "curvatureRadius", "thickness", "medium", "manufacturer", "semiDiameter",
    "aspherical", "decenter", "diffractiveElement", "clear_aperture", "edge_aperture",
  ]),
} as const;

function buildPatch(row: GridRow, values: JsonRecord | undefined, clear: readonly string[] | undefined): Partial<GridRow> {
  const patch: JsonRecord = {};
  for (const [field, value] of Object.entries(values ?? {})) {
    if (!applicableFields[row.kind].has(field)) semanticError("/row", `${field} is not applicable to the ${row.kind} row`);
    patch[field === "distance" ? "objectDistance" : field] = value;
  }
  for (const field of clear ?? []) {
    if (!applicableFields[row.kind].has(field)) semanticError("/row", `${field} is not applicable to the ${row.kind} row`);
    patch[field] = undefined;
  }
  if (row.kind === "surface" && (values?.clear_aperture as { shape?: unknown } | undefined)?.shape === "rectangular") {
    patch.semiDiameter = 0;
  }
  return patch as Partial<GridRow>;
}

function candidateRows(rows: GridRow[], rowId: string, patch: Partial<GridRow>): GridRow[] {
  return rows.map((row) => row.id === rowId ? { ...row, ...patch, id: row.id, kind: row.kind } as GridRow : row);
}

/** Creates the five validated tool descriptors bound to the supplied Lens Editor store. */
export function createLensPrescriptionTools(store: StoreApi<LensEditorState>): readonly WebMCP.ModelContextTool[] {
  return [
    {
      name: "get_lens_prescription",
      description: "Read the complete Lens Editor prescription or one visible Object, surface, or Image row.",
      inputSchema: getLensPrescriptionInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertInput(validators.get, input);
        assertNotCancelled(signal);
        const rows = store.getState().rows;
        const selector = input.row as RowSelector | undefined;
        if (selector === undefined) return JSON.stringify(gridRowsToSurfaces(rows));
        const row = resolveRow(rows, selector);
        if (!row) semanticError("/row", `${String(selector)} does not exist`);
        return JSON.stringify(externalRow(row));
      },
    },
    {
      name: "set_lens_prescription",
      description: "Replace the complete Lens Editor prescription after strict validation.",
      inputSchema: setLensPrescriptionInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertInput(validators.set, input);
        assertNotCancelled(signal);
        store.getState().setRows(surfacesToGridRows(input));
        return mutationResult(store.getState(), { replaced: true });
      },
    },
    {
      name: "insert_lens_surface",
      description: "Insert a default physical lens surface after Object or a visible surface index.",
      inputSchema: insertLensSurfaceInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertInput(validators.insert, input);
        assertNotCancelled(signal);
        const state = store.getState();
        const after = input.after as "object" | number;
        const row = resolveRow(state.rows, after);
        if (!row || row.kind === "image") semanticError("/after", `${String(after)} does not exist`);
        state.addRowAfter(row.id);
        const next = store.getState();
        const insertedIndex = next.rows.filter((item) => item.kind === "surface").findIndex((item) => !state.rows.some((old) => old.id === item.id)) + 1;
        return mutationResult(next, { surface: insertedIndex, row: externalRow(resolveRow(next.rows, insertedIndex)!) });
      },
    },
    {
      name: "update_lens_row",
      description: "Update applicable simple or nested fields on a visible Object, surface, or Image row.",
      inputSchema: updateLensRowInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertInput(validators.update, input);
        assertNotCancelled(signal);
        const state = store.getState();
        const selector = input.row as RowSelector;
        const row = resolveRow(state.rows, selector);
        if (!row) semanticError("/row", `${String(selector)} does not exist`);
        const values = input.values as JsonRecord | undefined;
        if (row.kind === "surface" && values?.semiDiameter !== undefined) {
          if (state.autoAperture) semanticError("/row", "semiDiameter is read-only while auto aperture is enabled");
          if (row.clear_aperture?.shape === "rectangular") semanticError("/row", "semiDiameter is read-only for a rectangular clear aperture");
        }
        const patch = buildPatch(row, values, input.clear as string[] | undefined);
        const prescription = gridRowsToSurfaces(candidateRows(state.rows, row.id, patch));
        if (!validators.set(prescription)) {
          const error = validators.set.errors?.[0];
          throw new Error(`Invalid candidate prescription at ${errorPath(error)}: ${error?.message ?? "schema check failed"}`);
        }
        state.updateRow(row.id, patch);
        const next = store.getState();
        return mutationResult(next, { row: selector, value: externalRow(resolveRow(next.rows, selector)!) });
      },
    },
    {
      name: "delete_lens_surface",
      description: "Delete one physical lens surface by its current visible positive index.",
      inputSchema: deleteLensSurfaceInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertInput(validators.delete, input);
        assertNotCancelled(signal);
        const state = store.getState();
        const surface = input.surface as number;
        const row = resolveRow(state.rows, surface);
        if (!row || row.kind !== "surface") semanticError("/surface", `${surface} does not exist`);
        state.deleteRow(row.id);
        return mutationResult(store.getState(), { surface });
      },
    },
  ];
}
