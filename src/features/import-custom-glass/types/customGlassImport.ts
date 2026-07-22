/**
# `features/import-custom-glass/types/customGlassImport.ts`

## Purpose
Feature-local TypeScript contracts for custom glass import, export, editing, and page state.

## Exports
- `CustomGlassPayload` describes the persisted JSON format `{ version: "1.0", Custom: { LABEL: { type: "tabulated", data } } }`.
- `EditablePair` is the modal grid row shape for tabulated wavelength/index editing.
- `CustomGlassRow` is the readonly table row shape derived from `UserDefinedGlassData`.
- `ModalMode` and `ConfirmationMode` enumerate page-level modal states, including the IndexedDB persistence warning modal.
- `UserDefinedCustomCatalog`, `ImportedCustomGlassMaterial`, and `RejectedCsvFile` model custom catalog maps and import results.
- `CustomGlassStoreActions` and `SaveCustomGlassOptions` keep worker orchestration loosely coupled from the Glass Map Zustand store and optional IndexedDB persistence callbacks.
*/
import type { UserDefinedGlassData, UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

export interface CustomGlassPayload {
  readonly version: "1.0";
  readonly Custom: Record<string, { readonly type: "tabulated"; readonly data: readonly (readonly [number, number])[] }>;
}

export interface EditablePair {
  readonly id: string;
  readonly fraunhofer: string;
  readonly wavelength: string;
  readonly refractiveIndex: string;
}

export interface CustomGlassRow {
  readonly label: string;
  readonly nd: number;
  readonly vd: number;
  readonly ne: number;
  readonly ve: number;
  readonly pgF: number;
  readonly pFe: number;
  readonly pFd: number;
  readonly data: UserDefinedGlassData;
}

export type ModalMode = "add" | "edit";
export type ConfirmationMode = "delete" | "overwrite" | "invalid-import" | "rejected-csv" | "persistence-warning";
export type UserDefinedCustomCatalog = Record<string, UserDefinedGlassData>;
export type ImportedCustomGlassMaterial = { readonly name: string; readonly pairs: readonly (readonly [number, number])[] };
export type RejectedCsvFile = { readonly filename: string; readonly reason: string };

export interface CustomGlassStoreActions {
  readonly upsertCustomGlasses: (materialsData: Record<string, UserDefinedGlassData>) => void;
  readonly deleteCustomGlasses: (labels: readonly string[]) => void;
}

export interface SaveCustomGlassOptions {
  readonly mode: ModalMode;
  readonly previousLabel: string | undefined;
  readonly input: UserDefinedGlassInput;
  readonly proxy: PyodideWorkerAPI;
  readonly storeActions: CustomGlassStoreActions;
  readonly persistInput?: (input: UserDefinedGlassInput) => Promise<void>;
  readonly deletePersisted?: (labels: readonly string[]) => Promise<void>;
  readonly onPersistenceWarning?: (message: string) => void;
}
