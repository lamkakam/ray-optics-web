/**
 * Custom-glass conversion plus browser, worker, persistence, and store orchestration.
 * Row ids are allocated monotonically so editable grid rows remain stable.
 */
import type {
  CatalogGlassData,
  UserDefinedGlassData,
  UserDefinedGlassInput,
} from "@/features/glass-map/types/glassMap";
import type {
  CustomGlassPayload,
  EditablePair,
  ImportedCustomGlassMaterial,
  RejectedCsvFile,
  SaveCustomGlassOptions,
  UserDefinedCustomCatalog,
} from "@/features/import-custom-glass/types/customGlassImport";
import {
  MIN_CUSTOM_GLASS_PAIRS,
  validateCustomGlassInput,
  validateCustomGlassPairs,
} from "@/features/import-custom-glass/lib/customGlassValidation";
import {
  addCustomGlass,
  updateCustomGlass,
} from "@/features/import-custom-glass/lib/customGlassOperations";

/** Stable empty custom catalog used before worker-backed data is available. */
export const EMPTY_CUSTOM_GLASSES: UserDefinedCustomCatalog = {};

let nextEditablePairId = 0;

/** Formats finite modal values and maps non-finite values to an empty draft. */
export function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function makeEditablePairId(): string {
  return `row-custom-glass-${nextEditablePairId++}`;
}

/** Creates an editable grid pair with a stable generated id and string-valued drafts. */
export function makeEditablePair(
  pair?: readonly [number, number],
): EditablePair {
  return {
    id: makeEditablePairId(),
    fraunhofer: "",
    wavelength: pair === undefined ? "" : formatNumber(pair[0]),
    refractiveIndex: pair === undefined ? "" : formatNumber(pair[1]),
  };
}

/** Trims a label and converts editable string drafts to numeric worker pairs. */
export function toWorkerInput(
  label: string,
  rows: readonly EditablePair[],
): UserDefinedGlassInput {
  const input = {
    name: label.trim(),
    pairs: rows.map(
      (row) => [Number(row.wavelength), Number(row.refractiveIndex)] as const,
    ),
  };
  if (!validateCustomGlassInput(input)) {
    throw new Error("Invalid custom-glass worker input.");
  }
  return input;
}

/** Builds the strict version-1.0 JSON export envelope for tabulated custom glasses. */
export function toCustomGlassPayload(
  custom: Record<string, UserDefinedGlassData>,
): CustomGlassPayload {
  return {
    version: "1.0",
    Custom: Object.fromEntries(
      Object.entries(custom).map(([label, data]) => [
        label,
        { type: "tabulated", data: data.dispersionCoeffs },
      ]),
    ),
  };
}

function isUserDefinedGlassData(
  data: CatalogGlassData,
): data is UserDefinedGlassData {
  return data.dispersionCoeffKind === "tabulated";
}

/** Returns only tabulated custom-glass entries, preserving the input reference when no filtering is needed. */
export function getUserDefinedCustomGlasses(
  customCatalog: Record<string, CatalogGlassData> | undefined,
): UserDefinedCustomCatalog {
  if (customCatalog === undefined) {
    return EMPTY_CUSTOM_GLASSES;
  }

  const entries = Object.entries(customCatalog);
  if (
    entries.every((entry): entry is [string, UserDefinedGlassData] =>
      isUserDefinedGlassData(entry[1]),
    )
  ) {
    return customCatalog as UserDefinedCustomCatalog;
  }

  return Object.fromEntries(
    entries.filter((entry): entry is [string, UserDefinedGlassData] =>
      isUserDefinedGlassData(entry[1]),
    ),
  );
}

/** Checks whether an unknown worker failure reports an existing user-defined label. */
export function isUserDefinedGlassAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("User-defined glass already exists:");
}

/** Compatibility wrapper over the shared add/update/rename orchestration. */
export async function saveCustomGlass({
  mode,
  previousLabel,
  input,
  proxy,
  storeActions,
  persistInput,
  deletePersisted,
  onPersistenceWarning,
}: SaveCustomGlassOptions): Promise<void> {
  const dependencies = {
    proxy,
    storeActions,
    persistInput,
    deletePersisted,
    onPersistenceWarning,
  };
  if (mode === "edit") {
    await updateCustomGlass(previousLabel ?? input.name, input, dependencies);
    return;
  }
  try {
    await addCustomGlass(input, dependencies);
  } catch (error) {
    if (!isUserDefinedGlassAlreadyExistsError(error)) throw error;
    const existing = await proxy.getUserDefinedGlasses([input.name]);
    storeActions.upsertCustomGlasses(existing);
  }
}

function filenameStem(filename: string): string {
  const basename = filename.split(/[\\/]/).at(-1) ?? filename;
  const extensionIndex = basename.lastIndexOf(".");
  return (
    extensionIndex <= 0 ? basename : basename.slice(0, extensionIndex)
  ).trim();
}

function micrometersToNanometers(value: number): number {
  return Number((value * 1000).toFixed(12));
}

/**
 * Parses refractiveindex.info-style `wl,n` CSV text in linear time, preserving row
 * order. The filename supplies the label; at least four positive finite pairs are
 * required. Each wavelength is converted once from micrometers to normalized
 * nanometers and checked against an incremental set for duplicates. The shared
 * pair validator checks the completed result before it is returned.
 */
export function parseCustomGlassCsv(
  file: File,
  text: string,
): ImportedCustomGlassMaterial | RejectedCsvFile {
  const label = filenameStem(file.name);
  if (label === "") {
    return {
      filename: file.name,
      reason: "Filename must provide a non-blank glass label.",
    };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { filename: file.name, reason: "Missing CSV header wl,n." };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  if (headers.length !== 2 || headers[0] !== "wl" || headers[1] !== "n") {
    return {
      filename: file.name,
      reason: "CSV header must contain exactly two columns: wl,n.",
    };
  }

  const pairs: [number, number][] = [];
  const wavelengths = new Set<number>();
  for (const [index, line] of lines.slice(1).entries()) {
    const rowNumber = index + 2;
    const columns = line.split(",").map((column) => column.trim());
    if (columns.length !== 2 || columns.some((column) => column === "")) {
      return {
        filename: file.name,
        reason: `Row ${rowNumber} must contain exactly two columns.`,
      };
    }

    const wavelengthMicrometers = Number(columns[0]);
    const refractiveIndex = Number(columns[1]);
    if (
      !Number.isFinite(wavelengthMicrometers) ||
      !Number.isFinite(refractiveIndex)
    ) {
      return {
        filename: file.name,
        reason: `Row ${rowNumber} values must be numeric.`,
      };
    }
    if (wavelengthMicrometers <= 0 || refractiveIndex <= 0) {
      return {
        filename: file.name,
        reason: `Row ${rowNumber} values must be positive.`,
      };
    }
    const wavelengthNanometers = micrometersToNanometers(wavelengthMicrometers);
    if (wavelengths.has(wavelengthNanometers)) {
      return {
        filename: file.name,
        reason: `Duplicate wavelength ${columns[0]} found.`,
      };
    }

    wavelengths.add(wavelengthNanometers);
    pairs.push([wavelengthNanometers, refractiveIndex]);
  }

  if (pairs.length < MIN_CUSTOM_GLASS_PAIRS) {
    return {
      filename: file.name,
      reason: "CSV must contain at least four valid wavelength/index pairs.",
    };
  }

  if (!validateCustomGlassPairs(pairs)) {
    return {
      filename: file.name,
      reason: "CSV wavelength/index pairs are invalid.",
    };
  }

  return { name: label, pairs };
}

/** Downloads a custom-glass payload as two-space-formatted `custom-glass.json`. */
export function downloadCustomGlassJson(payload: CustomGlassPayload): void {
  const blob = new Blob([JSON.stringify(payload, undefined, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "custom-glass.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
