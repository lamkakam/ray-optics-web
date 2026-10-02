/** Exercises the dependency-injected Optimization WebMCP descriptor factory. */
import { createStore } from "zustand";
import type { StoreApi } from "zustand";
import type {
  OptimizationConfig,
  OptimizationProgressEntry,
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

const idleProgress = { isRunning: false, progress: [] };

function progressEntries(count: number): OptimizationProgressEntry[] {
  return Array.from({ length: count }, (_, iteration) => ({
    iteration,
    merit_function_value: 10 - iteration,
    log10_merit_function_value: Math.log10(10 - iteration),
  }));
}

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
  it("creates the eight tools in order with strict annotations", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate: jest.fn().mockResolvedValue(report),
      execute: jest.fn().mockResolvedValue(report),
      apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
      dismissProgress: jest.fn().mockReturnValue({ wasOpen: true }),
      stop: jest.fn().mockReturnValue({ state: "not_running" }),
      readProgress: jest.fn().mockReturnValue(idleProgress),
    });

    expect(Object.values(tools).map((tool) => tool.name)).toEqual([
      "set_optimization_config",
      "get_optimization_config",
      "evaluate_optimization_operands",
      "execute_optimization",
      "apply_optimization_to_editor",
      "dismiss_optimization_progress",
      "stop_optimization",
      "get_optimization_progress",
    ]);
    expect(tools.getOptimizationProgress.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    expect(tools.dismissOptimizationProgress.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
    expect(tools.stopOptimization.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
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
    const dismissProgress = jest.fn().mockReturnValue({ wasOpen: true });
    const stop = jest.fn().mockReturnValue({ state: "stop_requested" });
    const readProgress = jest.fn().mockReturnValue(idleProgress);
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate,
      execute,
      apply,
      dismissProgress,
      stop,
      readProgress,
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
    await expect(
      tools.dismissOptimizationProgress.execute({}, { signal }),
    ).resolves.toBe(JSON.stringify({ dismissed: true, wasOpen: true }));
    expect(evaluate).toHaveBeenCalledWith(signal);
    expect(execute).toHaveBeenCalledWith(signal);
    expect(apply).toHaveBeenCalledWith(signal);
    expect(dismissProgress).toHaveBeenCalledWith(signal);
    const stopped = await tools.stopOptimization.execute({}, { signal });
    expect(JSON.parse(String(stopped))).toEqual({
      stopRequested: true,
      state: "stop_requested",
      message: expect.any(String),
    });
    expect(stop).toHaveBeenCalledWith(signal);
    await expect(
      tools.getOptimizationProgress.execute({}, { signal }),
    ).resolves.toBe(JSON.stringify({ isRunning: false }));
    expect(readProgress).toHaveBeenCalledWith(signal);

    await expect(
      tools.setOptimizationConfig.execute(
        { ...config, unexpected: true },
        { signal },
      ),
    ).rejects.toThrow(/Invalid input/);
    await expect(
      tools.getOptimizationConfig.execute({ unexpected: true }, { signal }),
    ).rejects.toThrow(/Invalid input/);
    await expect(
      tools.dismissOptimizationProgress.execute(
        { unexpected: true },
        { signal },
      ),
    ).rejects.toThrow(/Invalid input/);
    await expect(
      tools.stopOptimization.execute({ unexpected: true }, { signal }),
    ).rejects.toThrow(/Invalid input/);
    await expect(
      tools.getOptimizationProgress.execute({ unexpected: true }, { signal }),
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
    await expect(
      tools.dismissOptimizationProgress.execute(
        {},
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      tools.stopOptimization.execute({}, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      tools.getOptimizationProgress.execute({}, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(dismissProgress).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(readProgress).toHaveBeenCalledTimes(1);
  });

  it("returns the dismiss operation error to the caller while optimization is running", async () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate: jest.fn().mockResolvedValue(report),
      execute: jest.fn().mockResolvedValue(report),
      apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
      dismissProgress: jest.fn(() => {
        throw new Error("Optimization is still running.");
      }),
      stop: jest.fn().mockReturnValue({ state: "not_running" }),
      readProgress: jest.fn().mockReturnValue(idleProgress),
    });

    await expect(
      tools.dismissOptimizationProgress.execute(
        {},
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow("Optimization is still running.");
  });

  it.each([
    ["stop_requested", true, /stop/i],
    ["already_stopping", false, /already been requested/i],
    ["already_stopped", false, /already been interrupted/i],
    ["already_completed", false, /already completed/i],
    ["not_running", false, /no optimization is running/i],
  ] as const)(
    "reports the %s stop state to the caller",
    async (state, stopRequested, messagePattern) => {
      const store = createStore<OptimizationState>(createOptimizationSlice);
      const tools = createOptimizationWebMcpTools({
        optimizationStore: store,
        catalogs: undefined,
        evaluate: jest.fn().mockResolvedValue(report),
        execute: jest.fn().mockResolvedValue(report),
        apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
        dismissProgress: jest.fn().mockReturnValue({ wasOpen: false }),
        stop: jest.fn().mockReturnValue({ state }),
        readProgress: jest.fn().mockReturnValue(idleProgress),
      });

      const result = JSON.parse(
        String(
          await tools.stopOptimization.execute(
            {},
            { signal: new AbortController().signal },
          ),
        ),
      ) as { stopRequested: boolean; state: string; message: string };

      expect(result.stopRequested).toBe(stopRequested);
      expect(result.state).toBe(state);
      expect(result.message).toMatch(messagePattern);
    },
  );

  it("returns the stop operation error to the caller when the run cannot be interrupted", async () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate: jest.fn().mockResolvedValue(report),
      execute: jest.fn().mockResolvedValue(report),
      apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
      dismissProgress: jest.fn().mockReturnValue({ wasOpen: false }),
      stop: jest.fn(() => {
        throw new Error("Cannot interrupt.");
      }),
      readProgress: jest.fn().mockReturnValue(idleProgress),
    });

    await expect(
      tools.stopOptimization.execute(
        {},
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow("Cannot interrupt.");
  });

  it.each([
    [0, true, {}],
    [
      1,
      true,
      {
        latestStep: { step: 0, meritFunctionValue: 10 },
        bestStep: { step: 0, meritFunctionValue: 10 },
      },
    ],
    [
      2,
      false,
      {
        latestStep: { step: 1, meritFunctionValue: 9 },
        previousStep: { step: 0, meritFunctionValue: 10 },
        bestStep: { step: 1, meritFunctionValue: 9 },
      },
    ],
    [
      5,
      true,
      {
        latestStep: { step: 4, meritFunctionValue: 6 },
        previousStep: { step: 3, meritFunctionValue: 7 },
        bestStep: { step: 4, meritFunctionValue: 6 },
      },
    ],
  ] as const)(
    "reports the latest, previous and best steps from %i progress entries",
    async (count, isRunning, steps) => {
      const store = createStore<OptimizationState>(createOptimizationSlice);
      const tools = createOptimizationWebMcpTools({
        optimizationStore: store,
        catalogs: undefined,
        evaluate: jest.fn().mockResolvedValue(report),
        execute: jest.fn().mockResolvedValue(report),
        apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
        dismissProgress: jest.fn().mockReturnValue({ wasOpen: false }),
        stop: jest.fn().mockReturnValue({ state: "not_running" }),
        readProgress: jest
          .fn()
          .mockReturnValue({ isRunning, progress: progressEntries(count) }),
      });

      const result: unknown = JSON.parse(
        String(
          await tools.getOptimizationProgress.execute(
            {},
            { signal: new AbortController().signal },
          ),
        ),
      );

      expect(result).toEqual({ isRunning, ...steps });
    },
  );

  it("reports the earliest lowest merit step as the best step of a noisy history", async () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    const progress = [10, 4, 7, 4, 12].map((meritFunctionValue, iteration) => ({
      iteration,
      merit_function_value: meritFunctionValue,
      log10_merit_function_value: Math.log10(meritFunctionValue),
    }));
    const tools = createOptimizationWebMcpTools({
      optimizationStore: store,
      catalogs: undefined,
      evaluate: jest.fn().mockResolvedValue(report),
      execute: jest.fn().mockResolvedValue(report),
      apply: jest.fn().mockResolvedValue({ surfaceCount: 2 }),
      dismissProgress: jest.fn().mockReturnValue({ wasOpen: false }),
      stop: jest.fn().mockReturnValue({ state: "not_running" }),
      readProgress: jest.fn().mockReturnValue({ isRunning: true, progress }),
    });

    const result: unknown = JSON.parse(
      String(
        await tools.getOptimizationProgress.execute(
          {},
          { signal: new AbortController().signal },
        ),
      ),
    );

    expect(result).toEqual({
      isRunning: true,
      latestStep: { step: 4, meritFunctionValue: 12 },
      previousStep: { step: 3, meritFunctionValue: 4 },
      bestStep: { step: 1, meritFunctionValue: 4 },
    });
  });
});
