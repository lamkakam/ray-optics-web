/**
 * Describes the Photons To Photos Parser module.
 *
 * @remarks
 * ## API
 *
 * - `parsePhotonsToPhotosText(text, lookupMaps?)` returns either:
 * - `{ kind: "prime", model }` for single-focal-length files.
 * - `{ kind: "zoom", focalLengthChoices, resolve }` for multi-column zoom files; `resolve(choiceIndex)` builds the selected focal-length `OpticalModel`.
 *
 * ## Parsing Rules
 *
 * - Required sections are `[descriptive data]`, `[variable distances]`, and `[lens data]`; `[constants]` and `[aspherical data]` are optional. `[figure]` and `[notes]` are ignored.
 * - `Infinity`, `CG`, and `FS` radii become flat default surfaces (`curvatureRadius: 0`). `AS` radii become flat aperture-stop surfaces. `Infinity` object distances and apertures become `1e10`.
 * - `[lens data]` material columns are interpreted by tab-delimited position: cell 4 (`row[3]`) is refractive index `nd`, cell 6 (`row[5]`) is Abbe number `vd`, cell 7 (`row[6]`) is the material/glass label, and cell 8 (`row[7]`) is the catalog/manufacturer label.
 * - Lens-data aperture values become `semiDiameter = aperture / 2`.
 * - Rows with `AS` radius are aperture stops (`label: "Stop"`). Rows with `FS` radius are flat non-stop surfaces (`label: "Default"`).
 * - Glass name/catalog columns take precedence. When lookup maps are provided, special media and catalog glasses resolve case-insensitively to canonical app names. Special media `CaF2`, `Fused silica`, and `Water` use an empty manufacturer, and `fluorite` / `fluorspar` resolve to `CaF2`.
 * - User-defined custom glass resolves case-insensitively from the cell 7 material/glass label only. The cell 8 catalog/manufacturer label is ignored for this custom-glass import path, so blank, wrong, or mismatched catalog cells still resolve to the canonical stored custom label with `manufacturer: "Custom"`; Python script export then emits `user_defined_materials["<label>"]`.
 * - Unsupported named glasses never import the literal glass name as the medium. After lookup failure, with or without lookup maps, parser falls back to model-glass data: `nd` becomes `medium`, `vd` becomes `manufacturer`, blank `vd` becomes an empty manufacturer, and blank `nd` maps to air with an empty manufacturer.
 * - Without glass names, the same model-glass fallback is used: `nd` and `vd` are preserved as string `medium` and `manufacturer`; blank material data maps to air.
 * - Variable thickness tokens such as `Bf`, `d5`, and `d12` resolve from the selected variable-distance column.
 * - Object distance normally comes from variable distance `d0` and uses air with an empty manufacturer. When `d0` resolves to `0`, the object is derived from the first parsed surface with non-zero `thickness`: `distance` copies that surface thickness, and `medium` / `manufacturer` copy the already resolved surface material, including unsupported-name model-glass fallback. That source surface and every surface before it are removed from imported `surfaces`. If every parsed surface has zero thickness, the object falls back to `{ distance: 0, medium: "air", manufacturer: "" }` and no surfaces are removed.
 * - `[aspherical data]` rows attach `EvenAspherical` configs to matching surfaces and reject radius disagreement beyond a small tolerance.
 * - Imported specs use Fraunhofer d/F/C wavelengths, field samples `[0, 0.707, 1]`, and `setAutoAperture: "manualAperture"`.
 * - When `F-Number` is present, imported pupil specs use image-space `f/#`. When `F-Number` is absent, `NA` is required and imported pupil specs use object-space `NA`.
 * - When `Angle of View` is present, it is the full angle of view; imported `specs.field.maxField` is the app Field half-angle (`Angle of View / 2`). `isWideAngle` still uses the original full angle of view and is true when that value is at least 80 degrees.
 * - When `Angle of View` is absent, `Image Height` is required and imported field specs use image-space height with `maxField = Image Height / 2`. For this fallback, `isWideAngle` is true when the imported pupil is `NA >= 0.5`; otherwise it is false.
 *
 * ## Tests
 *
 * Covered by `photonsToPhotosParser.test.ts` with prime, microscope NA/Image Height fallback, flat `FS` rows, glass, case-insensitive lookup resolution, custom glass label-only lookup, special material aliases, unsupported named-glass fallback, fisheye stop, zoom column selection, unresolved variables, missing sections, and aspherical radius disagreement.
 */
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { OpticalModel, OpticalSpecs, Surface } from "@/shared/lib/types/opticalModel";

export interface PhotonsToPhotosFocalLengthChoice {
  readonly index: number;
  readonly focalLength: number;
}

export type PhotonsToPhotosParseResult =
  | { readonly kind: "prime"; readonly model: OpticalModel }
  | {
      readonly kind: "zoom";
      readonly focalLengthChoices: readonly PhotonsToPhotosFocalLengthChoice[];
      readonly resolve: (choiceIndex: number) => OpticalModel;
    };

type SectionName =
  | "descriptive data"
  | "constants"
  | "variable distances"
  | "lens data"
  | "aspherical data"
  | "figure"
  | "notes";

interface LensRow {
  readonly surfaceNumber: number;
  readonly radiusToken: string;
  readonly thicknessToken: string;
  readonly nd: string;
  readonly aperture: number;
  readonly vd: string;
  readonly glassName: string;
  readonly catalog: string;
}

interface AsphericalRow {
  readonly surfaceNumber: number;
  readonly radius: number;
  readonly conicConstant: number;
  readonly coefficients: readonly number[];
}

const REQUIRED_SECTIONS: readonly SectionName[] = ["descriptive data", "variable distances", "lens data"];
const IGNORED_SECTIONS = new Set<SectionName>(["figure", "notes"]);
const RADIUS_TOLERANCE = 1e-6;

/** Parses Photons to Photos lens prescription `.txt` files into app `OpticalModel` data for import. */
export function parsePhotonsToPhotosText(
  text: string,
  lookupMaps?: GlassLookupMaps,
): PhotonsToPhotosParseResult {
  const sections = parseSections(text);
  for (const sectionName of REQUIRED_SECTIONS) {
    if (!sections.has(sectionName)) {
      throw new Error(`Photons to Photos file is missing required section [${sectionName}].`);
    }
  }

  const variableDistances = parseVariableDistances(sections.get("variable distances") ?? []);
  const lensRows = parseLensRows(sections.get("lens data") ?? []);
  const asphericalRows = parseAsphericalRows(sections.get("aspherical data") ?? []);
  const focalLengths = getRequiredVariable(variableDistances, "Focal Length");

  if (focalLengths.length <= 1) {
    return {
      kind: "prime",
      model: buildOpticalModel(variableDistances, lensRows, asphericalRows, 0, lookupMaps),
    };
  }

  return {
    kind: "zoom",
    focalLengthChoices: focalLengths.map((focalLength, index) => ({ index, focalLength })),
    resolve: (choiceIndex) => buildOpticalModel(
      variableDistances,
      lensRows,
      asphericalRows,
      choiceIndex,
      lookupMaps,
    ),
  };
}

function parseSections(text: string): Map<SectionName, string[][]> {
  const sections = new Map<SectionName, string[][]>();
  let currentSection: SectionName | undefined;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;

    const sectionMatch = /^\[(.+)]$/.exec(line);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim().toLowerCase() as SectionName;
      currentSection = sectionName;
      if (!IGNORED_SECTIONS.has(sectionName)) {
        sections.set(sectionName, sections.get(sectionName) ?? []);
      }
      continue;
    }

    if (currentSection === undefined || IGNORED_SECTIONS.has(currentSection)) continue;
    sections.get(currentSection)?.push(rawLine.split("\t").map((cell) => cell.trim()));
  }

  return sections;
}

function parseVariableDistances(rows: readonly string[][]): Map<string, readonly number[]> {
  const variables = new Map<string, readonly number[]>();
  for (const row of rows) {
    const key = row[0]?.trim();
    if (!key) continue;
    const values = row.slice(1).filter((cell) => cell !== "").map(parseNumberToken);
    variables.set(key, values);
  }
  return variables;
}

function parseLensRows(rows: readonly string[][]): readonly LensRow[] {
  return rows
    .filter((row) => row[0] !== undefined && row[0] !== "")
    .map((row) => ({
      surfaceNumber: parseSurfaceNumber(row[0]),
      radiusToken: requiredCell(row, 1, "lens radius"),
      thicknessToken: requiredCell(row, 2, "lens thickness"),
      nd: row[3] ?? "",
      aperture: parseNumberToken(requiredCell(row, 4, "lens aperture")),
      vd: row[5] ?? "",
      glassName: row[6] ?? "",
      catalog: row[7] ?? "",
    }));
}

function parseAsphericalRows(rows: readonly string[][]): readonly AsphericalRow[] {
  return rows
    .filter((row) => row[0] !== undefined && row[0] !== "")
    .map((row) => ({
      surfaceNumber: parseSurfaceNumber(row[0]),
      radius: parseFiniteNumber(requiredCell(row, 1, "aspherical radius")),
      conicConstant: parseFiniteNumber(requiredCell(row, 2, "aspherical conic constant")),
      coefficients: row.slice(3).filter((cell) => cell !== "").map(parseFiniteNumber),
    }));
}

function buildOpticalModel(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  lensRows: readonly LensRow[],
  asphericalRows: readonly AsphericalRow[],
  choiceIndex: number,
  lookupMaps: GlassLookupMaps | undefined,
): OpticalModel {
  const surfaces = lensRows.map((row): Surface => {
    const radius = parseRadius(row.radiusToken);
    const thickness = resolveDistance(row.thicknessToken, variableDistances, choiceIndex);
    const material = resolveMaterial(row, lookupMaps);
    return {
      label: isApertureStop(row.radiusToken) ? "Stop" : "Default",
      curvatureRadius: radius,
      thickness,
      ...material,
      semiDiameter: row.aperture / 2,
    };
  });

  for (const row of asphericalRows) {
    const surface = surfaces[row.surfaceNumber - 1];
    if (!surface) {
      throw new Error(`Aspherical data references missing surface ${row.surfaceNumber}.`);
    }
    if (Math.abs(surface.curvatureRadius - row.radius) > RADIUS_TOLERANCE) {
      throw new Error(`Aspherical radius disagrees with lens data on surface ${row.surfaceNumber}.`);
    }
    surface.aspherical = {
      kind: "EvenAspherical",
      conicConstant: row.conicConstant,
      polynomialCoefficients: [...row.coefficients],
    };
  }

  const pupil = buildPupilSpec(variableDistances, choiceIndex);
  const field = buildFieldSpec(variableDistances, choiceIndex, pupil);
  const objectSide = buildObjectSide(variableDistances, choiceIndex, surfaces);

  return {
    setAutoAperture: "manualAperture",
    object: objectSide.object,
    image: { curvatureRadius: 0 },
    surfaces: objectSide.surfaces,
    specs: {
      pupil,
      field,
      wavelengths: {
        weights: [[587.562, 2], [486.133, 1], [656.273, 1]],
        referenceIndex: 0,
      },
    },
  };
}

function buildObjectSide(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  choiceIndex: number,
  surfaces: Surface[],
): Pick<OpticalModel, "object" | "surfaces"> {
  const d0 = getVariableValue(variableDistances, "d0", choiceIndex);
  if (d0 !== 0) {
    return {
      object: { distance: d0, medium: "air", manufacturer: "" },
      surfaces,
    };
  }

  const objectSurfaceIndex = surfaces.findIndex((surface) => surface.thickness !== 0);
  const objectSurface = surfaces[objectSurfaceIndex];
  if (objectSurface === undefined) {
    return {
      object: { distance: d0, medium: "air", manufacturer: "" },
      surfaces,
    };
  }

  return {
    object: {
      distance: objectSurface.thickness,
      medium: objectSurface.medium,
      manufacturer: objectSurface.manufacturer,
    },
    surfaces: surfaces.slice(objectSurfaceIndex + 1),
  };
}

function buildPupilSpec(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  choiceIndex: number,
): OpticalSpecs["pupil"] {
  const fNumber = getOptionalVariableValue(variableDistances, "F-Number", choiceIndex);
  if (fNumber !== undefined) {
    return { space: "image", type: "f/#", value: fNumber };
  }

  return {
    space: "object",
    type: "NA",
    value: getVariableValue(variableDistances, "NA", choiceIndex),
  };
}

function buildFieldSpec(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  choiceIndex: number,
  pupil: OpticalSpecs["pupil"],
): OpticalSpecs["field"] {
  const fullAngleOfView = getOptionalVariableValue(variableDistances, "Angle of View", choiceIndex);
  if (fullAngleOfView !== undefined) {
    return {
      space: "object",
      type: "angle",
      maxField: fullAngleOfView / 2,
      fields: [0, 0.707, 1],
      isRelative: true,
      isWideAngle: fullAngleOfView >= 80,
    };
  }

  const imageHeight = getVariableValue(variableDistances, "Image Height", choiceIndex);
  return {
    space: "image",
    type: "height",
    maxField: imageHeight / 2,
    fields: [0, 0.707, 1],
    isRelative: true,
    isWideAngle: pupil.type === "NA" ? pupil.value >= 0.5 : false,
  };
}

function parseSurfaceNumber(token: string): number {
  const match = /^\d+/.exec(token);
  if (!match) throw new Error(`Invalid surface number "${token}".`);
  return Number(match[0]);
}

function parseRadius(token: string): number {
  if (isApertureStop(token) || isFlatSurface(token)) return 0;
  return parseFiniteNumber(token);
}

function isFlatSurface(token: string): boolean {
  return /^(CG|FS|Infinity)$/i.test(token);
}

function resolveDistance(
  token: string,
  variableDistances: ReadonlyMap<string, readonly number[]>,
  choiceIndex: number,
): number {
  if (/^Infinity$/i.test(token)) return 1e10;
  const numeric = Number(token);
  if (Number.isFinite(numeric)) return numeric;
  if (!variableDistances.has(token)) {
    throw new Error(`Unresolved variable distance "${token}".`);
  }
  return getVariableValue(variableDistances, token, choiceIndex);
}

function resolveMaterial(
  row: LensRow,
  lookupMaps: GlassLookupMaps | undefined,
): Pick<Surface, "medium" | "manufacturer"> {
  if (row.glassName !== "") {
    const resolvedMaterial = resolveNamedMaterial(row, lookupMaps);
    if (resolvedMaterial !== undefined) {
      return resolvedMaterial;
    }
    return fallbackModelGlassMaterial(row);
  }
  return fallbackModelGlassMaterial(row);
}

function fallbackModelGlassMaterial(row: LensRow): Pick<Surface, "medium" | "manufacturer"> {
  if (row.nd !== "") {
    return { medium: row.nd, manufacturer: row.vd };
  }
  return { medium: "air", manufacturer: "" };
}

function resolveNamedMaterial(
  row: LensRow,
  lookupMaps: GlassLookupMaps | undefined,
): Pick<Surface, "medium" | "manufacturer"> | undefined {
  if (lookupMaps === undefined) {
    return undefined;
  }

  const specialMaterial = lookupMaps.mediumMap.get(normalizeLookupKey(row.glassName));
  if (specialMaterial !== undefined) {
    return specialMaterial;
  }

  const canonicalManufacturer = lookupMaps.manufacturerMap.get(normalizeLookupKey(row.catalog));
  if (canonicalManufacturer !== undefined) {
    const catalogMaterial = lookupMaps.mediumMap.get(
      `${normalizeLookupKey(canonicalManufacturer)}:${normalizeLookupKey(row.glassName)}`,
    );
    if (catalogMaterial !== undefined) {
      return catalogMaterial;
    }
  }

  return lookupMaps.customMediumMap.get(normalizeLookupKey(row.glassName));
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function getRequiredVariable(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  key: string,
): readonly number[] {
  const values = variableDistances.get(key);
  if (!values || values.length === 0) {
    throw new Error(`Photons to Photos file is missing variable distance "${key}".`);
  }
  return values;
}

function getVariableValue(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  key: string,
  choiceIndex: number,
): number {
  const values = getRequiredVariable(variableDistances, key);
  const value = values[choiceIndex];
  if (value === undefined) {
    throw new Error(`Variable distance "${key}" has no value for focal-length column ${choiceIndex + 1}.`);
  }
  return value;
}

function getOptionalVariableValue(
  variableDistances: ReadonlyMap<string, readonly number[]>,
  key: string,
  choiceIndex: number,
): number | undefined {
  if (!variableDistances.has(key)) {
    return undefined;
  }
  return getVariableValue(variableDistances, key, choiceIndex);
}

function parseNumberToken(token: string): number {
  if (/^Infinity$/i.test(token)) return 1e10;
  if (/^undefined$/i.test(token)) return Number.NaN;
  return parseFiniteNumber(token);
}

function parseFiniteNumber(token: string): number {
  const value = Number(token);
  if (!Number.isFinite(value)) {
    throw new Error(`Expected a numeric value, got "${token}".`);
  }
  return value;
}

function requiredCell(row: readonly string[], index: number, label: string): string {
  const value = row[index];
  if (value === undefined || value === "") {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function isApertureStop(token: string): boolean {
  return /^AS$/i.test(token);
}
