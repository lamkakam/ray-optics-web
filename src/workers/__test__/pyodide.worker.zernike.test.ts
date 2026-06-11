import { describe, it, expect } from "@jest/globals";
import { _getZernikeCoefficients } from "../pyodide.worker";
import type { ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const testModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: { weights: [[656.3, 1], [587, 2], [486.1, 1]], referenceIndex: 1 },
  },
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: -42 },
  surfaces: [
    { label: "Default", curvatureRadius: 23.713, thickness: 4.831, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 10.009 },
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "", semiDiameter: 8.3321 },
  ],
};

describe("_getZernikeCoefficients", () => {
  it("calls runPython with model script, correct import and function call", async () => {
    const mockData = {
      coefficients: [0.1, 0.2],
      rms_normalized_coefficients: [0.05, 0.1],
      rms_wfe: 0.15,
      pv_wfe: 0.5,
      strehl_ratio: 0.95,
      num_terms: 2,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    let capturedCode = "";
    const result = await _getZernikeCoefficients(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockData);
    }, testModel, 0, 1, "centroid", 56, "noll");
    expect(capturedCode).toContain("opm = OpticalModel()");
    expect(capturedCode).toContain("from rayoptics_web_utils.zernike import get_zernike_coefficients");
    expect(capturedCode).toContain("zernike_terms=json.loads(");
    expect(capturedCode).toContain("get_zernike_coefficients(_build_opm(), 0, 1, zernike_terms=zernike_terms, opd_aim_point='centroid')");
    expect(capturedCode).not.toContain("ordering=");
    expect(capturedCode).not.toContain("num_terms=");
    expect(capturedCode).toContain("json.dumps");
    expect(result).toMatchObject(mockData);
  });

  it("passes different fieldIndex and wvlIndex values correctly", async () => {
    const mockData = {
      coefficients: [],
      rms_normalized_coefficients: [],
      rms_wfe: 0,
      pv_wfe: 0,
      strehl_ratio: 1.0,
      num_terms: 22,
      field_index: 2,
      wavelength_nm: 486.1,
    };
    let capturedCode = "";
    await _getZernikeCoefficients(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockData);
    }, testModel, 2, 0);
    expect(capturedCode).toContain("get_zernike_coefficients(_build_opm(), 2, 0, zernike_terms=zernike_terms, opd_aim_point='chief_ray')");
  });

  it("defaults numTerms to 37 when not provided", async () => {
    const mockData = {
      coefficients: [],
      rms_normalized_coefficients: [],
      rms_wfe: 0,
      pv_wfe: 0,
      strehl_ratio: 1.0,
      num_terms: 37,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    let capturedCode = "";
    await _getZernikeCoefficients(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockData);
    }, testModel, 0, 0);
    expect(capturedCode).toContain("[[0,0],[1,1],[1,-1],[2,0]");
  });

  it("defaults ordering to noll when not provided", async () => {
    const mockData = {
      coefficients: [],
      rms_normalized_coefficients: [],
      rms_wfe: 0,
      pv_wfe: 0,
      strehl_ratio: 1.0,
      num_terms: 37,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    let capturedCode = "";
    await _getZernikeCoefficients(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockData);
    }, testModel, 0, 0);
    expect(capturedCode).toContain("[[0,0],[1,1],[1,-1],[2,0],[2,-2],[2,2]");
  });

  it("passes Fringe terms to Python when specified", async () => {
    const mockData = {
      coefficients: [],
      rms_normalized_coefficients: [],
      rms_wfe: 0,
      pv_wfe: 0,
      strehl_ratio: 1.0,
      num_terms: 37,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    const ordering: ZernikeOrdering = "fringe";
    let capturedCode = "";
    await _getZernikeCoefficients(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockData);
    }, testModel, 0, 0, undefined, 37, ordering);
    expect(capturedCode).toContain("[[0,0],[1,1],[1,-1],[2,0],[2,2],[2,-2]");
    expect(capturedCode).not.toContain("ordering='fringe'");
  });
});
