/** Feature-local TypeScript contracts for custom glass import, export, editing, and page state. */
import type { UserDefinedGlassData, UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

/** Strict versioned JSON export envelope. */
export interface CustomGlassPayload {
  readonly version: "1.0";
  readonly Custom: Record<string, { readonly type: "tabulated"; readonly data: readonly (readonly [number, number])[] }>;
}

/** String-valued editable wavelength/index grid row. */
export interface EditablePair {
  readonly id: string;
  readonly fraunhofer: string;
  readonly wavelength: string;
  readonly refractiveIndex: string;
}

/** Selectable custom-catalog table row. */
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

/** Add or edit custom-glass modal mode. */
export type ModalMode = "add" | "edit";
/** Supported confirmation and warning modal purposes. */
export type ConfirmationMode = "delete" | "overwrite" | "invalid-import" | "rejected-csv" | "persistence-warning";
/** Tabulated custom glasses keyed by label. */
export type UserDefinedCustomCatalog = Record<string, UserDefinedGlassData>;
/** Validated CSV material ready for worker import. */
export type ImportedCustomGlassMaterial = { readonly name: string; readonly pairs: readonly (readonly [number, number])[] };
/** Rejected CSV filename and user-facing reason. */
export type RejectedCsvFile = { readonly filename: string; readonly reason: string };

/** Store mutations required by save orchestration. */
export interface CustomGlassStoreActions {
  readonly upsertCustomGlasses: (materialsData: Record<string, UserDefinedGlassData>) => void;
  readonly deleteCustomGlasses: (labels: readonly string[]) => void;
}

/** Worker, store, and optional persistence dependencies for one save. */
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
