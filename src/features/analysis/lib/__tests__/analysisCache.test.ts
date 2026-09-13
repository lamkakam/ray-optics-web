import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import {
  _resetAnalysisCache,
  getCachedAnalysis,
} from "@/features/analysis/lib/analysisCache";
import {
  loadAnalysisPlot,
  loadSeidelData,
  loadZernikeData,
} from "@/features/analysis/lib/plotFunctions";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

const model = {} as OpticalModel;

describe("analysisCache", () => {
  beforeEach(() => _resetAnalysisCache());

  it("coalesces identical in-flight requests for the same model instance and aim point", async () => {
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((done) => {
      resolve = done;
    });
    const load = jest.fn(() => pending);

    const first = getCachedAnalysis(model, "chief_ray", "rayFan:1", load);
    const second = getCachedAnalysis(model, "chief_ray", "rayFan:1", load);

    expect(first).toBe(second);
    expect(load).toHaveBeenCalledTimes(1);
    resolve("result");
    await expect(first).resolves.toBe("result");
  });

  it("partitions structurally equal models, aim points, and request selectors", async () => {
    const equalModel = {} as OpticalModel;
    const load = jest.fn().mockResolvedValue("result");

    await getCachedAnalysis(model, "chief_ray", "rayFan:1", load);
    await getCachedAnalysis(equalModel, "chief_ray", "rayFan:1", load);
    await getCachedAnalysis(model, "centroid", "rayFan:1", load);
    await getCachedAnalysis(model, "chief_ray", "rayFan:2", load);

    expect(load).toHaveBeenCalledTimes(4);
  });

  it("refreshes recency and evicts the least recently used fourth model-aim pair", async () => {
    const models = [{}, {}, {}, {}] as OpticalModel[];
    const loads = models.map((_, index) => jest.fn().mockResolvedValue(index));

    await getCachedAnalysis(models[0], "chief_ray", "firstOrder", loads[0]);
    await getCachedAnalysis(models[1], "chief_ray", "firstOrder", loads[1]);
    await getCachedAnalysis(models[2], "chief_ray", "firstOrder", loads[2]);
    await getCachedAnalysis(models[0], "chief_ray", "firstOrder", loads[0]);
    await getCachedAnalysis(models[3], "chief_ray", "firstOrder", loads[3]);
    await getCachedAnalysis(models[1], "chief_ray", "firstOrder", loads[1]);

    expect(loads[0]).toHaveBeenCalledTimes(1);
    expect(loads[1]).toHaveBeenCalledTimes(2);
  });

  it("evicts rejected requests so they can be retried", async () => {
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce("recovered");

    await expect(
      getCachedAnalysis(model, "chief_ray", "firstOrder", load),
    ).rejects.toThrow("failed");
    await expect(
      getCachedAnalysis(model, "chief_ray", "firstOrder", load),
    ).resolves.toBe("recovered");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares the complete Seidel computation with the surface-by-surface plot", async () => {
    const seidel = { surfaceBySurface: { data: [] } };
    const proxy = {
      get3rdOrderSeidelData: jest.fn().mockResolvedValue(seidel),
    } as unknown as PyodideWorkerAPI;

    const full = loadSeidelData({ proxy, model, imagePoint: "centroid" });
    const surface = loadAnalysisPlot({
      plotType: "surfaceBySurface3rdOrder",
      proxy,
      model,
      fieldIndex: 0,
      wavelengthIndex: 0,
      imagePoint: "centroid",
    });

    await expect(full).resolves.toBe(seidel);
    await expect(surface).resolves.toEqual({
      kind: "surfaceBySurface3rdOrder",
      surfaceBySurface3rdOrderData: seidel.surfaceBySurface,
    });
    expect(proxy.get3rdOrderSeidelData).toHaveBeenCalledTimes(1);
  });

  it("keys Zernike payloads by field, wavelength, ordering, term count, and pupil space", async () => {
    const proxy = {
      getZernikeCoefficients: jest.fn().mockResolvedValue({}),
    } as unknown as PyodideWorkerAPI;
    const base = {
      proxy,
      model,
      imagePoint: "chief_ray" as const,
      fieldIndex: 0,
      wavelengthIndex: 0,
      ordering: "noll" as const,
      numTerms: 37,
      pupilSpace: "entrance" as const,
    };

    await loadZernikeData(base);
    await loadZernikeData(base);
    await loadZernikeData({ ...base, fieldIndex: 1 });
    await loadZernikeData({ ...base, wavelengthIndex: 1 });
    await loadZernikeData({ ...base, ordering: "fringe", numTerms: 36 });
    await loadZernikeData({ ...base, numTerms: 36 });
    await loadZernikeData({ ...base, pupilSpace: "exit" });

    expect(proxy.getZernikeCoefficients).toHaveBeenCalledTimes(6);
  });
});
