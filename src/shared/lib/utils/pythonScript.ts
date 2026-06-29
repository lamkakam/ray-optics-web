
import type { OpticalModel, AsphericalPolynomialCoeffs } from "@/shared/lib/types/opticalModel";
import { builtInSpecialMaterial, nonBuiltInSpecialMaterial } from "./specialMaterials";

type PythonLine = string;
type SurfaceMutationLine = PythonLine;

type SurfaceBuildStep = {
  addSurfaceLine: PythonLine;
  mutationLines: SurfaceMutationLine[];
};

function formattedMedium(medium: string, glassManufacturer: string): { medium: string | number, glassManufacturer: string | number } {
  const refractiveIdxForModalGlass = parseFloat(medium);
  if (!Number.isNaN(refractiveIdxForModalGlass)) {
    // model glass
    const abbeNumber = parseFloat(glassManufacturer);
    
    return {
      medium: refractiveIdxForModalGlass,
      glassManufacturer: !Number.isNaN(abbeNumber) ? `, ${abbeNumber}` : "",
    };
  }

  // real medium or glass
  return {
    medium: nonBuiltInSpecialMaterial.get(medium) ?? JSON.stringify(medium),
    glassManufacturer: builtInSpecialMaterial.has(medium) || nonBuiltInSpecialMaterial.has(medium)
      ? ""
      : `, ${JSON.stringify(glassManufacturer)}`,
  };
}

function formattedPolynomialCoeffs(coeffs: AsphericalPolynomialCoeffs) {
  return JSON.stringify(coeffs);
}

function formatWavelengthSpec(opticalModel: OpticalModel): PythonLine {
  const {
    specs: {
      wavelengths: { weights, referenceIndex: refWavelengthIdx },
    },
  } = opticalModel;

  const formattedWeights = weights
    .reduce((acc, [wl, weight], idx) => `${acc}(${wl}, ${weight})${idx === weights.length - 1 ? "" : ","}`, "");

  return `osp['wvls'] = WvlSpec([${formattedWeights}], ref_wl=${refWavelengthIdx})`;
}

function formatFieldSpec(opticalModel: OpticalModel): PythonLine {
  const {
    specs: {
      field: {
        space: fieldSpace,
        type: fieldType,
        maxField,
        fields,
        isRelative: isFieldRelative,
        isWideAngle: isFieldWideAngle,
      },
    },
  } = opticalModel;
  const isWideAngleFlag = isFieldWideAngle === true ? ", is_wide_angle=True" : "";

  return `osp['fov'] = FieldSpec(osp, key=['${fieldSpace}', '${fieldType}'], value=${maxField}, flds=${JSON.stringify(fields)}, is_relative=${isFieldRelative ? "True" : "False"}${isWideAngleFlag})`;
}

function formatPupilSpec(opticalModel: OpticalModel): PythonLine {
  const {
    specs: {
      pupil: { space: pupilSpace, type: pupilType, value: pupilValue },
    },
  } = opticalModel;

  return `osp['pupil'] = PupilSpec(osp, key=['${pupilSpace}', '${pupilType}'], value=${pupilValue})`;
}

function formatDecenterAssignment(targetExpr: string, decenter: NonNullable<OpticalModel["image"]["decenter"]>): PythonLine {
  const { coordinateSystemStrategy: posAndOrientation, alpha, beta, gamma, offsetX, offsetY } = decenter;
  return `${targetExpr}.decenter = DecenterData(${JSON.stringify(posAndOrientation)}, alpha=${alpha}, beta=${beta}, gamma=${gamma}, x=${offsetX}, y=${offsetY})`;
}

function formatAsphereAssignment(
  targetExpr: string,
  curvatureRadius: number,
  aspherical: NonNullable<OpticalModel["surfaces"][number]["aspherical"]>,
): PythonLine {
  const { kind } = aspherical;

  if (kind === "Conic") {
    const { conicConstant } = aspherical;
    return `${targetExpr}.profile = EvenPolynomial(r=${curvatureRadius}, cc=${conicConstant})`;
  }

  if (kind === "EvenAspherical") {
    const { conicConstant, polynomialCoefficients } = aspherical;
    const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
    return `${targetExpr}.profile = EvenPolynomial(r=${curvatureRadius}, cc=${conicConstant}, coefs=${coefsString})`;
  }

  if (kind === "RadialPolynomial") {
    const { conicConstant, polynomialCoefficients } = aspherical;
    const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
    return `${targetExpr}.profile = RadialPolynomial(r=${curvatureRadius}, cc=${conicConstant}, coefs=${coefsString})`;
  }

  if (kind === "XToroid") {
    const { toricSweepRadiusOfCurvature, conicConstant, polynomialCoefficients } = aspherical;
    const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
    return `${targetExpr}.profile = XToroid(r=${curvatureRadius}, cc=${conicConstant}, cR=${toricSweepRadiusOfCurvature}, coefs=${coefsString})`;
  }

  const { toricSweepRadiusOfCurvature, conicConstant, polynomialCoefficients } = aspherical;
  const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
  return `${targetExpr}.profile = YToroid(r=${curvatureRadius}, cc=${conicConstant}, cR=${toricSweepRadiusOfCurvature}, coefs=${coefsString})`;
}

function formatDiffractionGrating(
  targetExpr: string,
  grating: NonNullable<OpticalModel["surfaces"][number]["diffractionGrating"]>,
) {
  const { lpmm, order } = grating;
  return `${targetExpr}.phase_element = DiffractionGrating(grating_lpmm=${lpmm}, order=${order})`;
}

function formatCircularApertureAssignment(
  targetExpr: string,
  apertureKind: "clear_apertures" | "edge_apertures",
  radius: number,
  offsetX: number,
  offsetY: number,
): PythonLine {
  const apertureClass = offsetX === 0 && offsetY === 0 ? "Circular" : "OffsetCircular";
  return `${targetExpr}.${apertureKind} = [${apertureClass}(radius=${radius}, x_offset=${offsetX}, y_offset=${offsetY})]`;
}

function buildSurfaceStep(surface: OpticalModel["surfaces"][number]): SurfaceBuildStep {
  const {
    label,
    curvatureRadius,
    thickness,
    medium,
    manufacturer,
    semiDiameter,
    clear_aperture,
    edge_aperture,
    aspherical,
    decenter,
    diffractionGrating,
  } = surface;
  const { medium: mediumOption, glassManufacturer } = formattedMedium(medium, manufacturer);
  const mutationLines: SurfaceMutationLine[] = [];
  const currentSurfaceExpr = "sm.ifcs[sm.cur_surface]";

  if (semiDiameter > 0) {
    mutationLines.push(formatCircularApertureAssignment(
      currentSurfaceExpr,
      "clear_apertures",
      semiDiameter,
      clear_aperture?.offsetX ?? 0,
      clear_aperture?.offsetY ?? 0,
    ));
  }

  if (edge_aperture !== undefined) {
    mutationLines.push(formatCircularApertureAssignment(
      currentSurfaceExpr,
      "edge_apertures",
      edge_aperture.radius,
      edge_aperture.offsetX,
      edge_aperture.offsetY,
    ));
  }

  if (aspherical !== undefined) {
    mutationLines.push(formatAsphereAssignment(currentSurfaceExpr, curvatureRadius, aspherical));
  }

  if (decenter !== undefined) {
    mutationLines.push(formatDecenterAssignment(currentSurfaceExpr, decenter));
  }

  if (diffractionGrating !== undefined) {
    mutationLines.push(formatDiffractionGrating(currentSurfaceExpr, diffractionGrating));
  }

  if (label === "Stop") {
    mutationLines.push("sm.set_stop()");
  }

  return {
    addSurfaceLine: `sm.add_surface([${curvatureRadius}, ${thickness}, ${mediumOption}${glassManufacturer}])`,
    mutationLines,
  };
}

function buildObjectSetupLines(opticalModel: OpticalModel): PythonLine[] {
  const {
    object: { distance: objectDistance, medium, manufacturer },
  } = opticalModel;

  const { medium: mediumOption, glassManufacturer } = formattedMedium(
    medium.toUpperCase() === "REFL" ? "air" : medium,
    medium.toUpperCase() === "REFL" ? "" : manufacturer,
  );

  return [
    `sm.gaps[0].thi=${objectDistance}`,
    `sm.gaps[0].medium = decode_medium(${mediumOption}${glassManufacturer})`,
  ];
}

function buildImageSetupLines(opticalModel: OpticalModel): PythonLine[] {
  const {
    image: { curvatureRadius: imageCurvatureRadius, decenter: imageDecenter },
  } = opticalModel;
  const lines = [`sm.ifcs[-1].profile.r = ${imageCurvatureRadius}`];

  if (imageDecenter !== undefined) {
    lines.push(formatDecenterAssignment("sm.ifcs[-1]", imageDecenter));
  }

  return lines;
}

function buildOpticalModelLines(opticalModel: OpticalModel): PythonLine[] {
  const { setAutoAperture, surfaces } = opticalModel;
  const doApertureFlag = setAutoAperture === "autoAperture" ? "True" : "False";
  const lines: PythonLine[] = [
    "opm = OpticalModel()",
    "sm  = opm['seq_model']",
    "osp = opm['optical_spec']",
    "pm  = opm['parax_model']",
    "",
    "opm.system_spec.dimensions = 'mm'",
    "",
    formatPupilSpec(opticalModel),
    formatFieldSpec(opticalModel),
    formatWavelengthSpec(opticalModel),
    "",
    "opm.radius_mode = True",
    `sm.do_apertures = ${doApertureFlag}`,
    "",
    ...buildObjectSetupLines(opticalModel),
  ];

  for (const surface of surfaces) {
    const step = buildSurfaceStep(surface);
    lines.push(step.addSurfaceLine, ...step.mutationLines);
  }

  lines.push(
    ...buildImageSetupLines(opticalModel),
    "",
    "opm.update_model()",
    "set_vig(opm)",
  );

  return lines;
}

function renderPythonBlock(lines: PythonLine[]): string {
  return lines.join("\n");
}

function buildExportPreamble(): string {
  return `
isdark = False
from rayoptics.environment import *
from rayoptics.raytr.vigcalc import set_vig
from rayoptics.elem.surface import DecenterData, Circular
from rayoptics.elem.profiles import XToroid, YToroid
from rayoptics.seq.medium import decode_medium
from opticalglass.rindexinfo import create_material

class OffsetCircular(Circular):
    def edge_pt_target(self, rel_dir):
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]

caf2_url = 'https://refractiveindex.info/database/data/main/CaF2/nk/Malitson.yml'
caf2 = create_glass(caf2_url, "rindexinfo")

fused_silica_url = 'https://refractiveindex.info/database/data/main/SiO2/nk/Malitson.yml'
fused_silica = create_glass(fused_silica_url, "rindexinfo")

water_url = 'https://refractiveindex.info/database/data/main/H2O/nk/Daimon-20.0C.yml'
water = create_glass(water_url, "rindexinfo")

d263teco_url = 'https://refractiveindex.info/database/data/specs/schott/misc/D263TECO.yml'
d263teco = create_glass(d263teco_url, "rindexinfo")
`;
}

export function buildOpticalModelScript(opticalModel: OpticalModel): string {
  return renderPythonBlock(buildOpticalModelLines(opticalModel));
}

export function buildScript(
  opticalModel: OpticalModel,
  computation: (opm: string) => string,
): string {
  const modelScript = buildOpticalModelScript(opticalModel);
  const indented = modelScript
    .split('\n')
    .map(line => (line.length > 0 ? '    ' + line : line))
    .join('\n');
  const opmExpr = '_build_opm()';
  return `def _build_opm():\n${indented}\n    return opm\n${computation(opmExpr)}`;
}

export function buildExportScript(opticalModel: OpticalModel) {
  return `${buildExportPreamble()}
${buildOpticalModelScript(opticalModel)}

sm.list_model()
pm.first_order_data()

layout_plt = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,do_draw_rays=True, do_paraxial_layout=False,is_dark=isdark).plot()
`;
}
