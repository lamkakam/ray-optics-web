import { describe, it, expect } from "@jest/globals";
import { type OpticalModel } from "@/shared/lib/types/opticalModel";
import {
  _focusByMonoRmsSpot,
  _focusByMonoStrehl,
  _focusByPolyRmsSpot,
  _focusByPolyStrehl,
  _init,
} from "../pyodide.worker";

const testModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: { weights: [[656.3, 1], [587, 2], [486.1, 1]], referenceIndex: 1 },
  },
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    { label: "Default", curvatureRadius: 23.713, thickness: 4.831, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 10.009 },
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "", semiDiameter: 8.3321 },
  ],
} as const;

const mockFocusingResult = { delta_thi: 0.5, metric_value: 0.01 };

describe("_focusByMonoRmsSpot", () => {
  it("returns parsed FocusingResult", async () => {
    const result = await _focusByMonoRmsSpot(
      async () => JSON.stringify(mockFocusingResult),
      testModel,
      0,
    );
    expect(result).toMatchObject(mockFocusingResult);
  });

  it("includes focus_by_mono_rms_spot in the python script", async () => {
    let capturedCode = "";
    await _focusByMonoRmsSpot(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 0);
    expect(capturedCode).toContain("focus_by_mono_rms_spot");
  });

  it("passes field_indices=[0] when fieldIndex=0", async () => {
    let capturedCode = "";
    await _focusByMonoRmsSpot(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 0);
    expect(capturedCode).toContain("field_indices=[0]");
  });

  it("passes field_indices=[2] when fieldIndex=2", async () => {
    let capturedCode = "";
    await _focusByMonoRmsSpot(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 2);
    expect(capturedCode).toContain("field_indices=[2]");
  });
});

describe("_focusByMonoStrehl", () => {
  it("returns parsed FocusingResult", async () => {
    const result = await _focusByMonoStrehl(
      async () => JSON.stringify(mockFocusingResult),
      testModel,
      0,
    );
    expect(result).toMatchObject(mockFocusingResult);
  });

  it("includes focus_by_mono_strehl in the python script", async () => {
    let capturedCode = "";
    await _focusByMonoStrehl(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 1);
    expect(capturedCode).toContain("focus_by_mono_strehl");
  });

  it("passes field_indices=[1] when fieldIndex=1", async () => {
    let capturedCode = "";
    await _focusByMonoStrehl(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 1);
    expect(capturedCode).toContain("field_indices=[1]");
  });
});

describe("_focusByPolyRmsSpot", () => {
  it("returns parsed FocusingResult", async () => {
    const result = await _focusByPolyRmsSpot(
      async () => JSON.stringify(mockFocusingResult),
      testModel,
      0,
    );
    expect(result).toMatchObject(mockFocusingResult);
  });

  it("includes focus_by_poly_rms_spot in the python script", async () => {
    let capturedCode = "";
    await _focusByPolyRmsSpot(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 0);
    expect(capturedCode).toContain("focus_by_poly_rms_spot");
  });

  it("passes field_indices=[0] when fieldIndex=0", async () => {
    let capturedCode = "";
    await _focusByPolyRmsSpot(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 0);
    expect(capturedCode).toContain("field_indices=[0]");
  });
});

describe("_focusByPolyStrehl", () => {
  it("returns parsed FocusingResult", async () => {
    const result = await _focusByPolyStrehl(
      async () => JSON.stringify(mockFocusingResult),
      testModel,
      0,
    );
    expect(result).toMatchObject(mockFocusingResult);
  });

  it("includes focus_by_poly_strehl in the python script", async () => {
    let capturedCode = "";
    await _focusByPolyStrehl(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 0);
    expect(capturedCode).toContain("focus_by_poly_strehl");
  });

  it("passes field_indices=[2] when fieldIndex=2", async () => {
    let capturedCode = "";
    await _focusByPolyStrehl(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockFocusingResult);
    }, testModel, 2);
    expect(capturedCode).toContain("field_indices=[2]");
  });
});

describe("_init — focusing imports", () => {
  const testWheelUrl = "http://localhost/rayoptics_web_utils-0.1.0-py3-none-any.whl";

  it("imports focusing functions from rayoptics_web_utils.focusing", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); }, testWheelUrl);
    const allCode = scripts.join("\n");
    expect(allCode).toContain(
      "from rayoptics_web_utils.focusing import focus_by_mono_rms_spot, focus_by_mono_strehl, focus_by_poly_rms_spot, focus_by_poly_strehl",
    );
  });
});
