/** Exercises page-scoped Optimization WebMCP registration and cleanup. */
import { renderHook } from "@testing-library/react";
import { useOptimizationWebMCP } from "@/features/optimization/hooks/useOptimizationWebMCP";

describe("useOptimizationWebMCP", () => {
  afterEach(() => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("registers all tools in order and aborts them on unmount", () => {
    const registrations: Array<{
      tool: WebMCP.ModelContextTool;
      signal: AbortSignal;
    }> = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: jest.fn(
          (
            tool: WebMCP.ModelContextTool,
            options?: WebMCP.ModelContextRegisterToolOptions,
          ) => {
            registrations.push({
              tool,
              signal: options?.signal as AbortSignal,
            });
            return Promise.resolve();
          },
        ),
      },
    });

    const { unmount } = renderHook(() =>
      useOptimizationWebMCP({
        optimizationStore: {
          getState: jest.fn(),
          getInitialState: jest.fn(),
          subscribe: jest.fn(),
          setState: jest.fn(),
        } as never,
        catalogs: undefined,
        evaluate: jest.fn().mockResolvedValue({}),
        execute: jest.fn().mockResolvedValue({}),
        apply: jest.fn().mockResolvedValue({ surfaceCount: 0 }),
      }),
    );

    expect(registrations.map(({ tool }) => tool.name)).toEqual([
      "set_optimization_config",
      "get_optimization_config",
      "evaluate_optimization_operands",
      "execute_optimization",
      "apply_optimization_to_editor",
    ]);
    unmount();
    expect(registrations.every(({ signal }) => signal.aborted)).toBe(true);
  });

  it("keeps registered descriptors on the latest dependency callbacks without re-registering", async () => {
    const registrations: WebMCP.ModelContextTool[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: jest.fn((tool: WebMCP.ModelContextTool) => {
          registrations.push(tool);
        }),
      },
    });
    const firstEvaluate = jest.fn().mockResolvedValue({ first: true });
    const secondEvaluate = jest.fn().mockResolvedValue({ second: true });
    const makeDependencies = (evaluate: typeof firstEvaluate) => ({
      optimizationStore: {
        getState: jest.fn(),
        getInitialState: jest.fn(),
        subscribe: jest.fn(),
        setState: jest.fn(),
      } as never,
      catalogs: undefined,
      evaluate,
      execute: jest.fn().mockResolvedValue({}),
      apply: jest.fn().mockResolvedValue({ surfaceCount: 0 }),
    });
    const initialDependencies = makeDependencies(firstEvaluate);
    const { rerender, unmount } = renderHook(
      ({ dependencies }) => useOptimizationWebMCP(dependencies),
      { initialProps: { dependencies: initialDependencies } },
    );
    const registeredEvaluationTool = registrations[2];
    rerender({ dependencies: makeDependencies(secondEvaluate) });

    await expect(
      registeredEvaluationTool?.execute(
        {},
        { signal: new AbortController().signal },
      ),
    ).resolves.toBe(JSON.stringify({ second: true }));
    expect(firstEvaluate).not.toHaveBeenCalled();
    expect(secondEvaluate).toHaveBeenCalledTimes(1);
    expect(registrations).toHaveLength(5);
    unmount();
  });
});
