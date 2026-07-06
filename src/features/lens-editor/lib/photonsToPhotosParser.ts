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
