import { describe, it, expect } from "@jest/globals";
import { _getAllGlassCatalogsData } from "../pyodide.worker";
import type { RawAllGlassCatalogsData } from "../../lib/glassMap";

const mockRawData: RawAllGlassCatalogsData = {
  Schott: {
    "N-BK7": {
      refractive_index_d: 1.5168,
      refractive_index_e: 1.519,
      abbe_number_d: 64.17,
      abbe_number_e: 63.96,
      partial_dispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
      dispersion_coeff_kind: 'Sellmeier3T' as const,
      dispersion_coeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
    },
  },
  CDGM: {},
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Sumita: {},
};

describe("_getAllGlassCatalogsData", () => {
  it("calls runPython with get_all_glass_catalogs_data() and parses JSON result", async () => {
    let capturedCode = "";
    const result = await _getAllGlassCatalogsData(async (code) => {
      capturedCode = code;
      return JSON.stringify(mockRawData);
    });
    expect(capturedCode).toContain("get_all_glass_catalogs_data()");
    expect(capturedCode).toContain("json.dumps");
    expect(result).toEqual(mockRawData);
  });

  it("returns parsed RawAllGlassCatalogsData", async () => {
    const result = await _getAllGlassCatalogsData(async () =>
      JSON.stringify(mockRawData)
    );
    expect(result.Schott["N-BK7"].refractive_index_d).toBe(1.5168);
  });
});
