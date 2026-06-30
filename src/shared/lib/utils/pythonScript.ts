
import type { OpticalModel, AsphericalPolynomialCoeffs, ClearAperture, EdgeAperture } from "@/shared/lib/types/opticalModel";
import { builtInSpecialMaterial, nonBuiltInSpecialMaterial } from "./specialMaterials";

type PythonLine = string;
type SurfaceMutationLine = PythonLine;

type SurfaceBuildStep = {
  addSurfaceLine: PythonLine;
  mutationLines: SurfaceMutationLine[];
};
type Surface = OpticalModel["surfaces"][number];

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

function formatClearApertureAssignment(
  targetExpr: string,
  semiDiameter: number,
  clearAperture: ClearAperture | undefined,
): PythonLine | undefined {
  const offsetX = clearAperture === undefined ? 0 : clearAperture.offsetX;
  const offsetY = clearAperture === undefined ? 0 : clearAperture.offsetY;

  if (clearAperture?.shape === "rectangular") {
    return `${targetExpr}.clear_apertures = [OffsetRotatedRectangular(x_half_width=${clearAperture.xHalfWidth}, y_half_width=${clearAperture.yHalfWidth}, x_offset=${offsetX}, y_offset=${offsetY}, rotation=${clearAperture.rotation})]`;
  }

  if (semiDiameter <= 0) {
    return undefined;
  }

  if (clearAperture?.shape === "annular") {
    return `${targetExpr}.clear_apertures = [Annular(radius=${semiDiameter}, obstruction_radius=${clearAperture.obstructionRadius}, x_offset=${offsetX}, y_offset=${offsetY})]`;
  }

  return formatCircularApertureAssignment(
    targetExpr,
    "clear_apertures",
    semiDiameter,
    offsetX,
    offsetY,
  );
}

function formatEdgeApertureAssignment(
  targetExpr: string,
  edgeAperture: EdgeAperture,
): PythonLine {
  if (edgeAperture.shape === "rectangular") {
    return `${targetExpr}.edge_apertures = [OffsetRotatedRectangular(x_half_width=${edgeAperture.xHalfWidth}, y_half_width=${edgeAperture.yHalfWidth}, x_offset=${edgeAperture.offsetX}, y_offset=${edgeAperture.offsetY}, rotation=${edgeAperture.rotation})]`;
  }

  return formatCircularApertureAssignment(
    targetExpr,
    "edge_apertures",
    edgeAperture.radius,
    edgeAperture.offsetX,
    edgeAperture.offsetY,
  );
}

function buildSurfaceStep(surface: Surface): SurfaceBuildStep {
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

  const clearApertureAssignment = formatClearApertureAssignment(currentSurfaceExpr, semiDiameter, clear_aperture);
  if (clearApertureAssignment !== undefined) {
    mutationLines.push(clearApertureAssignment);
  }

  if (edge_aperture !== undefined) {
    mutationLines.push(formatEdgeApertureAssignment(currentSurfaceExpr, edge_aperture));
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
from rayoptics.elem.surface import DecenterData, Circular, Aperture, Rectangular
from rayoptics.elem.profiles import XToroid, YToroid
from rayoptics.seq.medium import decode_medium
from opticalglass.rindexinfo import create_material
from math import cos, radians, sin, sqrt

class Annular(Aperture):
    def __init__(self, radius=1.0, obstruction_radius=0.5, **kwargs):
        super().__init__(**kwargs)
        self.radius = radius
        self.obstruction_radius = obstruction_radius
        self._validate_obstruction_radius()

    def _validate_obstruction_radius(self):
        if self.obstruction_radius <= 0 or self.obstruction_radius >= self.radius:
            raise ValueError("obstruction_radius must be greater than 0 and smaller than radius")

    def listobj_str(self):
        o_str = f"ca: annular radius={self.radius} obstruction_radius={self.obstruction_radius}\\n"
        o_str += super().listobj_str()
        return o_str

    def dimension(self):
        return (self.radius, self.radius)

    def set_dimension(self, x, y):
        self.radius = x
        self._validate_obstruction_radius()

    def max_dimension(self):
        return self.radius

    def point_inside(self, x, y, fuzz=1e-5):
        x, y = self.tform(x, y)
        radius = sqrt(x * x + y * y)
        return self.obstruction_radius - fuzz <= radius <= self.radius + fuzz

    def edge_pt_target(self, rel_dir):
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]

    def apply_scale_factor(self, scale_factor):
        super().apply_scale_factor(scale_factor)
        self.radius *= scale_factor
        self.obstruction_radius *= scale_factor

class OffsetCircular(Circular):
    def edge_pt_target(self, rel_dir):
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]

class OffsetRotatedRectangular(Rectangular):
    def _to_local(self, x, y):
        # RayOptics passes points in the global surface coordinate frame, whose
        # origin is the surface origin. The rectangular aperture center is
        # (x_offset, y_offset) in that frame. The rectangle-local frame has its
        # origin at that aperture center, with axes aligned to the unrotated
        # x_half_width and y_half_width directions. Translate to the aperture
        # center, then undo the rectangle rotation so containment can be tested
        # against the axis-aligned local half widths.
        x -= self.x_offset
        y -= self.y_offset
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return (
            x * cos_angle + y * sin_angle,
            -x * sin_angle + y * cos_angle,
        )

    def _to_global(self, x, y):
        # The input point is in the rectangle-local frame: origin at the
        # aperture center, +x along x_half_width, and +y along y_half_width.
        # Rotate it into the global surface axes, then translate by the aperture
        # center offset to recover the absolute surface coordinate.
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return [
            self.x_offset + x * cos_angle - y * sin_angle,
            self.y_offset + x * sin_angle + y * cos_angle,
        ]

    def _rotated_corner_vectors(self, x_half_width, y_half_width):
        # Start from the four rectangle-local corners:
        # (+/-x_half_width, +/-y_half_width). Rotate each around the local
        # origin, but do not add x_offset/y_offset; the result remains a vector
        # from the aperture center. set_dimension() combines these with
        # offset + scale * vector when solving for the farthest absolute corner.
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return [
            (
                rel_x * x_half_width * cos_angle - rel_y * y_half_width * sin_angle,
                rel_x * x_half_width * sin_angle + rel_y * y_half_width * cos_angle,
            )
            for rel_x in (-1, 1)
            for rel_y in (-1, 1)
        ]

    def set_dimension(self, x, y):
        if x != y:
            self.x_half_width = abs(x)
            self.y_half_width = abs(y)
            return

        target = abs(x)
        x_half_width = abs(self.x_half_width)
        y_half_width = abs(self.y_half_width)
        corner_radius_sq = x_half_width * x_half_width + y_half_width * y_half_width
        if corner_radius_sq == 0:
            self.x_half_width = 0
            self.y_half_width = 0
            return

        offset_radius_sq = self.x_offset * self.x_offset + self.y_offset * self.y_offset
        if target * target <= offset_radius_sq:
            scale = 0
        else:
            max_projection = max(
                self.x_offset * corner_x + self.y_offset * corner_y
                for corner_x, corner_y in self._rotated_corner_vectors(
                    x_half_width,
                    y_half_width,
                )
            )
            discriminant = max_projection * max_projection + corner_radius_sq * (
                target * target - offset_radius_sq
            )
            scale = (-max_projection + sqrt(max(discriminant, 0))) / corner_radius_sq

        scale = max(scale, 0)
        self.x_half_width = x_half_width * scale
        self.y_half_width = y_half_width * scale

    def point_inside(self, x, y, fuzz=1e-5):
        local_x, local_y = self._to_local(x, y)
        return (
            abs(local_x) <= self.x_half_width + fuzz
            and abs(local_y) <= self.y_half_width + fuzz
        )

    def edge_pt_target(self, rel_dir):
        return self._to_global(
            self.x_half_width * rel_dir[0],
            self.y_half_width * rel_dir[1],
        )

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
