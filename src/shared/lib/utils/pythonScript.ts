
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

export function buildOpticalModelScript(opticalModel: OpticalModel): string {
  const { setAutoAperture, specs, surfaces, object, image } = opticalModel;
  const {
    pupil: { space: pupilSpace, type: pupilType, value: pupilValue },
    field: { space: fieldSpace, type: fieldType, maxField, fields, isRelative: isFieldRelative },
    wavelengths: { weights, referenceIndex: refWavelengthIdx }
  } = specs;

  const formattedWeights = weights
    .reduce((acc, [wl, weight], idx) => `${acc}(${wl}, ${weight})${idx === weights.length - 1 ? "" : ","}`, "");

  const addSurfaceCommands = surfaces.reduce((acc, surface) => {
    const { label, curvatureRadius, thickness, medium, manufacturer, semiDiameter, aspherical, decenter } = surface;
    // common surface
    const semiDiameterArg = semiDiameter ? `, sd=${semiDiameter}` : "";
    const glassManufacturer = medium === "air" || medium === "REFL" || medium === "CaF2" ? "" : `, ${JSON.stringify(manufacturer)}`;
    const mediumOption = medium === "CaF2" ? "caf2" : JSON.stringify(medium);
    const setStop = label === "Stop" ? "\nsm.set_stop()" : "";

    let asphericalCommands = "";
    if (aspherical !== undefined) {
      const { conicConstant, polynomialCoefficients } = aspherical;
      if (polynomialCoefficients === undefined) {
        asphericalCommands = `\nsm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=${curvatureRadius}, cc=${conicConstant})`;
      } else {
        const coefsString = JSON.stringify(polynomialCoefficients);
        asphericalCommands = `\nsm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=${curvatureRadius}, cc=${conicConstant}, coefs=${coefsString})`;
      }
    }

    let decenterCommands = "";
    if (decenter !== undefined) {
      const { coordinateSystemStrategy: posAndOrientation, alpha, beta, gamma, offsetX, offsetY } = decenter;
      decenterCommands = `\nsm.ifcs[sm.cur_surface].decenter = DecenterData(${JSON.stringify(posAndOrientation)}, alpha=${alpha}, beta=${beta}, gamma=${gamma}, x=${offsetX}, y=${offsetY})`;
    }

    return `${acc}\nsm.add_surface([${curvatureRadius}, ${thickness}, ${mediumOption}${glassManufacturer}]${semiDiameterArg})${asphericalCommands}${decenterCommands}${setStop}`;
  }, "");

  const { distance: objectDistance } = object;
  const { curvatureRadius: imageCurvatureRadius, decenter: imageDecenter } = image;

  let imageDecenterCommands = "";
  if (imageDecenter !== undefined) {
    const { coordinateSystemStrategy: posAndOrientation, alpha, beta, gamma, offsetX, offsetY } = imageDecenter;
    imageDecenterCommands = `\nsm.ifcs[-1].decenter = DecenterData(${JSON.stringify(posAndOrientation)}, alpha=${alpha}, beta=${beta}, gamma=${gamma}, x=${offsetX}, y=${offsetY})`;
  }

  const doApertureFlag = setAutoAperture === "autoAperture" ? "True" : "False";

  // WARNING: DON'T TOUCH THE FORMATTING BELOW
  return `
opm = OpticalModel()
sm  = opm['seq_model']
osp = opm['optical_spec']
pm  = opm['parax_model']

opm.system_spec.dimensions = 'mm'

osp['pupil'] = PupilSpec(osp, key=['${pupilSpace}', '${pupilType}'], value=${pupilValue})
osp['fov'] = FieldSpec(osp, key=['${fieldSpace}', '${fieldType}'], value=${maxField}, flds=${JSON.stringify(fields)}, is_relative=${isFieldRelative ? "True" : "False"})
osp['wvls'] = WvlSpec([${formattedWeights}], ref_wl=${refWavelengthIdx})

opm.radius_mode = True
sm.do_apertures = ${doApertureFlag}

sm.gaps[0].thi=${objectDistance}
${addSurfaceCommands}
sm.ifcs[-1].profile.r = ${imageCurvatureRadius}
${imageDecenterCommands}

opm.update_model()
set_vig(opm)`;
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
  const scriptForImporting = `
isdark = False
from rayoptics.environment import *
from rayoptics.raytr.vigcalc import set_vig
from rayoptics.elem.surface import DecenterData
from opticalglass.rindexinfo import create_material

caf2_url = 'https://refractiveindex.info/database/data/main/CaF2/nk/Malitson.yml'
caf2 = create_glass(caf2_url, "rindexinfo")
`;

  return `${scriptForImporting}
${buildOpticalModelScript(opticalModel)}

sm.list_model()
pm.first_order_data()

layout_plt = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,do_draw_rays=True, do_paraxial_layout=False,is_dark=isdark).plot()
`;
}

