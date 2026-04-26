import type { ZernikeData, ZernikeOrdering } from "../zernikeData";

describe("ZernikeOrdering type", () => {
  it("accepts noll and fringe values", () => {
    const noll: ZernikeOrdering = "noll";
    const fringe: ZernikeOrdering = "fringe";
    expect(noll).toBe("noll");
    expect(fringe).toBe("fringe");
  });
});

describe("ZernikeData type", () => {
  it("can be constructed with all required fields", () => {
    const data: ZernikeData = {
      coefficients: [0.1, 0.2],
      rms_normalized_coefficients: [0.05, 0.1],
      rms_wfe: 0.15,
      pv_wfe: 0.5,
      strehl_ratio: 0.95,
      num_terms: 2,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    expect(data.coefficients).toHaveLength(2);
    expect(data.strehl_ratio).toBe(0.95);
  });
});
