import {
  _resetGlassCatalogLoaderForTest,
  loadGlassCatalogs,
} from "@/features/glass-map/lib/glassCatalogLoader";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

const schottGlass = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
  dispersionCoeffKind: "Sellmeier3T" as const,
  dispersionCoeffs: [
    1.03961212,
    0.231792344,
    1.01046945,
    0.00600069867,
    0.0200179144,
    103.560653,
  ],
};

function makeProxy(
  getAllGlassCatalogsData: jest.Mock,
): PyodideWorkerAPI {
  return { getAllGlassCatalogsData } as unknown as PyodideWorkerAPI;
}

describe("loadGlassCatalogs", () => {
  beforeEach(() => {
    _resetGlassCatalogLoaderForTest();
    jest.clearAllMocks();
  });

  it("shares one worker request for concurrent calls with the same proxy", async () => {
    const getAllGlassCatalogsData = jest.fn().mockResolvedValue({ Schott: {} });
    const proxy = makeProxy(getAllGlassCatalogsData);

    const first = loadGlassCatalogs(proxy);
    const second = loadGlassCatalogs(proxy);

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({
      data: expect.objectContaining({ Schott: {} }),
      error: undefined,
    });
    expect(getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("normalizes successful worker payloads with all catalog keys", async () => {
    const getAllGlassCatalogsData = jest.fn().mockResolvedValue({
      Schott: { "N-BK7": schottGlass },
    });
    const proxy = makeProxy(getAllGlassCatalogsData);

    const result = await loadGlassCatalogs(proxy);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      CDGM: {},
      Hikari: {},
      Hoya: {},
      Ohara: {},
      Schott: { "N-BK7": schottGlass },
      Sumita: {},
      Special: {},
    });
  });

  it("returns an error result when the worker load fails", async () => {
    const getAllGlassCatalogsData = jest
      .fn()
      .mockRejectedValue(new Error("Catalog preload failed"));
    const proxy = makeProxy(getAllGlassCatalogsData);

    await expect(loadGlassCatalogs(proxy)).resolves.toEqual({
      data: undefined,
      error: "Catalog preload failed",
    });
  });

  it("starts a new worker request after a successful load settles", async () => {
    const getAllGlassCatalogsData = jest
      .fn()
      .mockResolvedValueOnce({ Schott: { "N-BK7": schottGlass } })
      .mockResolvedValueOnce({ Schott: {} });
    const proxy = makeProxy(getAllGlassCatalogsData);

    const first = await loadGlassCatalogs(proxy);
    const second = await loadGlassCatalogs(proxy);

    expect(first.data?.Schott).toHaveProperty("N-BK7");
    expect(second.data?.Schott).toEqual({});
    expect(getAllGlassCatalogsData).toHaveBeenCalledTimes(2);
  });

  it("starts a new worker request after a failed load settles", async () => {
    const getAllGlassCatalogsData = jest
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ Schott: {} });
    const proxy = makeProxy(getAllGlassCatalogsData);

    await expect(loadGlassCatalogs(proxy)).resolves.toEqual({
      data: undefined,
      error: "Temporary failure",
    });
    await expect(loadGlassCatalogs(proxy)).resolves.toEqual({
      data: expect.objectContaining({ Schott: {} }),
      error: undefined,
    });
    expect(getAllGlassCatalogsData).toHaveBeenCalledTimes(2);
  });
});
