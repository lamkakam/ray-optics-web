import { describe, it, expect } from "@jest/globals";
import { _getAllGlassCatalogsData } from "../pyodide.worker";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";

const mockRawData: AllGlassCatalogsData = {
  Schott: {
    "N-BK7": {
      refractiveIndexD: 1.5168,
      refractiveIndexE: 1.519,
      abbeNumberD: 64.17,
      abbeNumberE: 63.96,
      partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
      dispersionCoeffKind: 'Sellmeier3T' as const,
      dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
    },
  },
  CDGM: {},
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Sumita: {},
  Special: {},
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

  it("returns parsed AllGlassCatalogsData", async () => {
    const result = await _getAllGlassCatalogsData(async () =>
      JSON.stringify(mockRawData)
    );
    expect(result.Schott["N-BK7"].refractiveIndexD).toBe(1.5168);
  });
});
