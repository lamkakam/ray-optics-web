import { renderHook } from "@testing-library/react";
import { useWebMCP } from "@/shared/hooks/useWebMCP";

function tool(execute: WebMCP.ToolExecuteCallback = jest.fn()) {
  return {
    name: "example_tool",
    description: "Example tool",
    inputSchema: { type: "object", additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute,
  } satisfies WebMCP.ModelContextTool;
}

function setModelContext(modelContext: Pick<WebMCP.ModelContext, "registerTool"> | undefined): void {
  Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
}

afterEach(() => {
  setModelContext(undefined);
  jest.restoreAllMocks();
});

describe("useWebMCP", () => {
  it("does nothing when the browser has no model context", () => {
    expect(() => renderHook(() => useWebMCP(tool()))).not.toThrow();
  });

  it("registers a same-origin tool and aborts its signal on unmount", () => {
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });

    const { unmount } = renderHook(() => useWebMCP(tool()));

    expect(registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "example_tool" }),
      { signal: expect.any(AbortSignal) },
    );
    const options = registerTool.mock.calls[0][1] as WebMCP.ModelContextRegisterToolOptions;
    expect(options).not.toHaveProperty("exposedTo");
    expect(options.signal?.aborted).toBe(false);

    unmount();
    expect(options.signal?.aborted).toBe(true);
  });

  it("uses the latest committed execute callback without re-registering", async () => {
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    const first = jest.fn().mockReturnValue("first");
    const second = jest.fn().mockReturnValue("second");
    const { rerender } = renderHook(({ execute }) => useWebMCP(tool(execute)), {
      initialProps: { execute: first },
    });
    const registered = registerTool.mock.calls[0][0] as WebMCP.ModelContextTool;

    rerender({ execute: second });

    expect(await registered.execute({}, { signal: new AbortController().signal })).toBe("second");
    expect(first).not.toHaveBeenCalled();
    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it("supplies a signal when the native callback omits execution options", async () => {
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    const execute = jest.fn().mockReturnValue("ok");
    renderHook(() => useWebMCP(tool(execute)));
    const registered = registerTool.mock.calls[0][0] as WebMCP.ModelContextTool;

    const result = await (registered.execute as unknown as (input: Record<string, unknown>) => unknown)({});

    expect(result).toBe("ok");
    expect(execute).toHaveBeenCalledWith({}, { signal: expect.any(AbortSignal) });
  });

  it("re-registers when an explicit dependency changes", () => {
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    const { rerender } = renderHook(({ revision }) => useWebMCP(tool(), [revision]), {
      initialProps: { revision: 1 },
    });
    const firstSignal = (registerTool.mock.calls[0][1] as WebMCP.ModelContextRegisterToolOptions).signal;

    rerender({ revision: 2 });

    expect(firstSignal?.aborted).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(2);
  });

  it.each(["synchronous", "asynchronous"])("contains %s registration failures", async (kind) => {
    const error = new Error("registration failed");
    const registerTool = kind === "synchronous"
      ? jest.fn(() => { throw error; })
      : jest.fn().mockRejectedValue(error);
    setModelContext({ registerTool });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => renderHook(() => useWebMCP(tool()))).not.toThrow();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("example_tool"), error);
  });
});
