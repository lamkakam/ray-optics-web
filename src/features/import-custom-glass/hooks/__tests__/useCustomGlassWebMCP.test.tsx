import { renderHook } from "@testing-library/react";
import { useCustomGlassWebMCP } from "@/features/import-custom-glass/hooks/useCustomGlassWebMCP";
import type { CustomGlassWebMcpDependencies } from "@/features/import-custom-glass/lib/customGlassWebMcp";

function dependencies(
  customGlasses: CustomGlassWebMcpDependencies["customGlasses"] = {},
): CustomGlassWebMcpDependencies {
  return {
    proxy: {} as CustomGlassWebMcpDependencies["proxy"],
    customGlasses,
    storeActions: {
      upsertCustomGlasses: jest.fn(),
      deleteCustomGlasses: jest.fn(),
    },
    persistInput: jest.fn(),
    deletePersisted: jest.fn(),
    onPersistenceWarning: jest.fn(),
  };
}

describe("useCustomGlassWebMCP", () => {
  afterEach(() => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("registers in public order and aborts every registration on unmount", () => {
    const registrations: Array<{ name: string; signal: AbortSignal }> = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: jest.fn(
          (
            tool: WebMCP.ModelContextTool,
            options?: WebMCP.ModelContextRegisterToolOptions,
          ) => {
            registrations.push({
              name: tool.name,
              signal: options?.signal as AbortSignal,
            });
          },
        ),
      },
    });
    const { unmount } = renderHook(() => useCustomGlassWebMCP(dependencies()));
    expect(registrations.map(({ name }) => name)).toEqual([
      "get_custom_glasses",
      "add_custom_glass",
      "update_custom_glass",
      "delete_custom_glass",
    ]);
    unmount();
    expect(registrations.every(({ signal }) => signal.aborted)).toBe(true);
  });

  it("uses latest dependencies without re-registering", async () => {
    const registrations: WebMCP.ModelContextTool[] = [];
    const registerTool = jest.fn((tool: WebMCP.ModelContextTool) =>
      registrations.push(tool),
    );
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });
    const first = dependencies({});
    const second = dependencies({ LATEST: {} as never });
    const { rerender } = renderHook(({ deps }) => useCustomGlassWebMCP(deps), {
      initialProps: { deps: first },
    });
    rerender({ deps: second });
    await expect(
      registrations[0]?.execute({}, { signal: new AbortController().signal }),
    ).resolves.toBe(JSON.stringify({ customGlasses: second.customGlasses }));
    expect(registerTool).toHaveBeenCalledTimes(4);
  });
});
