import { describe, it, expect } from "@jest/globals";
import { _getZernikeCoefficients } from "../pyodide.worker";

describe("_getZernikeCoefficients", () => {
  it("calls runPython with correct import and function call script", async () => {
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
    const capturedCodes: string[] = [];
    const result = await _getZernikeCoefficients(async (code) => {
      capturedCodes.push(code);
      return JSON.stringify(mockData);
    }, 0, 1, 56);
    // Should import get_zernike_coefficients
    const allCode = capturedCodes.join("\n");
    expect(allCode).toContain("from rayoptics_web_utils.zernike import get_zernike_coefficients");
    expect(allCode).toContain("get_zernike_coefficients(opm, 0, 1, num_terms=56)");
    expect(allCode).toContain("json.dumps");
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
    }, 2, 0, 22);
    expect(capturedCode).toContain("get_zernike_coefficients(opm, 2, 0, num_terms=22)");
  });

  it("defaults numTerms to 56 when not provided", async () => {
    const mockData = {
      coefficients: [],
      rms_normalized_coefficients: [],
      rms_wfe: 0,
      pv_wfe: 0,
      strehl_ratio: 1.0,
      num_terms: 56,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    let capturedCode = "";
    await _getZernikeCoefficients(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockData);
    }, 0, 0);
    expect(capturedCode).toContain("num_terms=56");
  });
});
