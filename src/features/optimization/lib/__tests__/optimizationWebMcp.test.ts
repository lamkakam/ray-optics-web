/** Exercises the dependency-injected Optimization WebMCP descriptor factory. */
import { createStore } from "zustand";
import type { StoreApi } from "zustand";
import type {
  OptimizationConfig,
  OptimizationReport,
} from "@/features/optimization/types/optimizationWorkerTypes";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";
import { createOptimizationWebMcpTools } from "@/features/optimization/lib/optimizationWebMcp";

const report: OptimizationReport = {
  success: true,
  status: "evaluated",
  message: "ok",
  optimizer: { kind: "least_squares", method: "trf" },
  initial_values: [],
  final_values: [],
  pickups: [],
  residuals: [],
  merit_function: { sum_of_squares: 0, rss: 0 },
  optimization_progress: [],
};

const config: OptimizationConfig = {
  optimizer: {
    kind: "least_squares",
    method: "trf",
    max_nfev: 100,
    ftol: 1e-5,
    xtol: 1e-5,
    gtol: 1e-5,
  },
  variables: [],
  pickups: [],
  merit_function: {
    operands: [{ kind: "focal_length", target: 100, weight: 1 }],
  },
};

describe("optimization WebMCP tools", () => {
  it("creates the five tools in order with strict annotations", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate: jest.fn().mockResolvedValue(report),
      execute: jest.fn().mockResolvedValue(report),
      apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
    });

    expect(Object.values(tools).map((tool) => tool.name)).toEqual([
      "set_optimization_config",
      "get_optimization_config",
      "evaluate_optimization_operands",
      "execute_optimization",
      "apply_optimization_to_editor",
    ]);
    expect(tools.getOptimizationConfig.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    expect(tools.evaluateOptimizationOperands.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    expect(tools.setOptimizationConfig.annotations?.untrustedContentHint).toBe(
      false,
    );
    expect(tools.setOptimizationConfig.inputSchema).toEqual(
      expect.objectContaining({ type: "object", additionalProperties: false }),
    );
  });

  it("delegates every operation, returns JSON strings, and honors strict cancellation", async () => {
    const setOptimizationConfig = jest.fn();
    const buildOptimizationConfig = jest.fn().mockReturnValue(config);
    const store = {
      getState: () => ({ setOptimizationConfig, buildOptimizationConfig }),
    } as unknown as StoreApi<OptimizationState>;
    const evaluate = jest.fn().mockResolvedValue(report);
    const execute = jest.fn().mockResolvedValue(report);
    const apply = jest.fn().mockResolvedValue({ surfaceCount: 2 });
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate,
      execute,
      apply,
    });
    const signal = new AbortController().signal;

    await expect(
      tools.setOptimizationConfig.execute({ ...config }, { signal }),
    ).resolves.toBe(JSON.stringify({ configured: true, config }));
    expect(setOptimizationConfig).toHaveBeenCalledWith(config, undefined);
    await expect(
      tools.getOptimizationConfig.execute({}, { signal }),
    ).resolves.toBe(JSON.stringify(config));
    await expect(
      tools.evaluateOptimizationOperands.execute({}, { signal }),
    ).resolves.toBe(JSON.stringify(report));
    await expect(
      tools.executeOptimization.execute({}, { signal }),
    ).resolves.toBe(JSON.stringify(report));
    await expect(
      tools.applyOptimizationToEditor.execute({}, { signal }),
    ).resolves.toBe(JSON.stringify({ applied: true, surfaceCount: 2 }));
    expect(evaluate).toHaveBeenCalledWith(signal);
    expect(execute).toHaveBeenCalledWith(signal);
    expect(apply).toHaveBeenCalledWith(signal);

    await expect(
      tools.setOptimizationConfig.execute(
        { ...config, unexpected: true },
        { signal },
      ),
    ).rejects.toThrow(/Invalid input/);
    await expect(
      tools.getOptimizationConfig.execute({ unexpected: true }, { signal }),
    ).rejects.toThrow(/Invalid input/);
    expect(setOptimizationConfig).toHaveBeenCalledTimes(1);

    const controller = new AbortController();
    controller.abort();

    await expect(
      tools.getOptimizationConfig.execute({}, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      tools.evaluateOptimizationOperands.execute(
        {},
        {
          signal: controller.signal,
        },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
