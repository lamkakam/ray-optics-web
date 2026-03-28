import { describe, it, expect } from "@jest/globals";
import { _getZernikeCoefficients } from "../pyodide.worker";
import type { ZernikeOrdering } from "../../lib/zernikeData";
import type { OpticalModel } from "../../lib/opticalModel";

const testModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: { weights: [[656.3, 1], [587, 2], [486.1, 1]], referenceIndex: 1 },
  },
  object: { distance: 1e10 },
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
    }, testModel, 0, 1, 56);
    expect(capturedCode).toContain("opm = OpticalModel()");
    expect(capturedCode).toContain("from rayoptics_web_utils.zernike import get_zernike_coefficients");
    expect(capturedCode).toContain("get_zernike_coefficients(_build_opm(), 0, 1, num_terms=56, ordering='noll')");
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
    }, testModel, 2, 0, 22);
    expect(capturedCode).toContain("get_zernike_coefficients(_build_opm(), 2, 0, num_terms=22, ordering='noll')");
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
    expect(capturedCode).toContain("num_terms=37");
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
    expect(capturedCode).toContain("ordering='noll'");
  });

  it("passes ordering=fringe to Python when specified", async () => {
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
    }, testModel, 0, 0, 37, ordering);
    expect(capturedCode).toContain("ordering='fringe'");
  });
});
