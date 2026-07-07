import type { CatalogGlassData, UserDefinedGlassData, UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";
import type {
  CustomGlassPayload,
  EditablePair,
  ImportedCustomGlassMaterial,
  RejectedCsvFile,
  SaveCustomGlassOptions,
  UserDefinedCustomCatalog,
} from "@/features/import-custom-glass/types/customGlassImport";

export const EMPTY_CUSTOM_GLASSES: UserDefinedCustomCatalog = {};

let nextEditablePairId = 0;

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function makeEditablePairId(): string {
  return `row-custom-glass-${nextEditablePairId++}`;
}

export function makeEditablePair(pair?: readonly [number, number]): EditablePair {
  return {
    id: makeEditablePairId(),
    fraunhofer: "",
    wavelength: pair === undefined ? "" : formatNumber(pair[0]),
    refractiveIndex: pair === undefined ? "" : formatNumber(pair[1]),
  };
}

export function toWorkerInput(label: string, rows: readonly EditablePair[]): UserDefinedGlassInput {
  return {
    name: label.trim(),
    pairs: rows.map((row) => [Number(row.wavelength), Number(row.refractiveIndex)] as const),
  };
}

export function toCustomGlassPayload(custom: Record<string, UserDefinedGlassData>): CustomGlassPayload {
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

function isUserDefinedGlassData(data: CatalogGlassData): data is UserDefinedGlassData {
  return data.dispersionCoeffKind === "tabulated";
}

export function getUserDefinedCustomGlasses(
  customCatalog: Record<string, CatalogGlassData> | undefined,
): UserDefinedCustomCatalog {
  if (customCatalog === undefined) {
    return EMPTY_CUSTOM_GLASSES;
  }

  const entries = Object.entries(customCatalog);
  if (entries.every((entry): entry is [string, UserDefinedGlassData] => isUserDefinedGlassData(entry[1]))) {
    return customCatalog as UserDefinedCustomCatalog;
  }

  return Object.fromEntries(
    entries.filter((entry): entry is [string, UserDefinedGlassData] => isUserDefinedGlassData(entry[1])),
  );
}

export function isUserDefinedGlassAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("User-defined glass already exists:");
}

export async function saveCustomGlass({
  mode,
  previousLabel,
  input,
  proxy,
  storeActions,
}: SaveCustomGlassOptions): Promise<void> {
  if (mode === "edit" && previousLabel !== undefined && previousLabel !== input.name) {
    const added = await proxy.addUserDefinedGlasses([input]);
    await proxy.deleteUserDefinedGlasses([previousLabel]);
    storeActions.upsertCustomGlasses(added);
    storeActions.deleteCustomGlasses([previousLabel]);
    return;
  }

  let result;
  try {
    result = mode === "add"
      ? await proxy.addUserDefinedGlasses([input])
      : await proxy.updateUserDefinedGlasses([input]);
  } catch (error) {
    if (mode !== "add" || !isUserDefinedGlassAlreadyExistsError(error)) {
      throw error;
    }

    result = await proxy.getUserDefinedGlasses([input.name]);
  }
  storeActions.upsertCustomGlasses(result);
}

function filenameStem(filename: string): string {
  const basename = filename.split(/[\\/]/).at(-1) ?? filename;
  const extensionIndex = basename.lastIndexOf(".");
  return (extensionIndex <= 0 ? basename : basename.slice(0, extensionIndex)).trim();
}

function micrometersToNanometers(value: number): number {
  return Number((value * 1000).toFixed(12));
}

export function parseCustomGlassCsv(file: File, text: string): ImportedCustomGlassMaterial | RejectedCsvFile {
  const label = filenameStem(file.name);
  if (label === "") {
    return { filename: file.name, reason: "Filename must provide a non-blank glass label." };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { filename: file.name, reason: "Missing CSV header wl,n." };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  if (headers.length !== 2 || headers[0] !== "wl" || headers[1] !== "n") {
    return { filename: file.name, reason: "CSV header must contain exactly two columns: wl,n." };
  }

  const pairs: [number, number][] = [];
  const wavelengths = new Set<number>();
  for (const [index, line] of lines.slice(1).entries()) {
    const rowNumber = index + 2;
    const columns = line.split(",").map((column) => column.trim());
    if (columns.length !== 2 || columns.some((column) => column === "")) {
      return { filename: file.name, reason: `Row ${rowNumber} must contain exactly two columns.` };
    }

    const wavelengthMicrometers = Number(columns[0]);
    const refractiveIndex = Number(columns[1]);
    if (!Number.isFinite(wavelengthMicrometers) || !Number.isFinite(refractiveIndex)) {
      return { filename: file.name, reason: `Row ${rowNumber} values must be numeric.` };
    }
    if (wavelengthMicrometers <= 0 || refractiveIndex <= 0) {
      return { filename: file.name, reason: `Row ${rowNumber} values must be positive.` };
    }
    if (wavelengths.has(wavelengthMicrometers)) {
      return { filename: file.name, reason: `Duplicate wavelength ${columns[0]} found.` };
    }

    wavelengths.add(wavelengthMicrometers);
    pairs.push([micrometersToNanometers(wavelengthMicrometers), refractiveIndex]);
  }

  if (pairs.length < 4) {
    return { filename: file.name, reason: "CSV must contain at least four valid wavelength/index pairs." };
  }

  return { name: label, pairs };
}

export function downloadCustomGlassJson(payload: CustomGlassPayload): void {
  const blob = new Blob([JSON.stringify(payload, undefined, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "custom-glass.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
