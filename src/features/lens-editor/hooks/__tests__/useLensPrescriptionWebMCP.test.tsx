import { act, renderHook } from "@testing-library/react";
import { createStore } from "zustand";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import { useLensPrescriptionWebMCP } from "@/features/lens-editor/hooks/useLensPrescriptionWebMCP";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";

const prescription = {
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [{
    label: "Default" as const,
    curvatureRadius: 50,
    thickness: 5,
    medium: "custom_a",
    manufacturer: "wrong",
    semiDiameter: 10,
  }],
  image: { curvatureRadius: 0 },
};

describe("useLensPrescriptionWebMCP", () => {
  it("routes executions through the latest lookup maps without re-registering tools", async () => {
    const registrations: WebMCP.ModelContextTool[] = [];
    const registerTool = jest.fn((tool: WebMCP.ModelContextTool) => {
      registrations.push(tool);
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });
    const store = createStore<LensEditorState>(createLensEditorSlice);
    const customMaps: GlassLookupMaps = {
      manufacturerMap: new Map(),
      mediumMap: new Map(),
      customMediumMap: new Map([[
        "custom_a",
        { medium: "CUSTOM_A", manufacturer: "Custom" },
      ]]),
    };
    const { rerender, unmount } = renderHook(
      ({ lookupMaps }: { lookupMaps: GlassLookupMaps | undefined }) => {
        useLensPrescriptionWebMCP(store, lookupMaps);
      },
      { initialProps: { lookupMaps: undefined as GlassLookupMaps | undefined } },
    );
    expect(registerTool).toHaveBeenCalledTimes(5);
    const registeredSet = registrations.find((tool) => tool.name === "set_lens_prescription");
    if (registeredSet === undefined) throw new Error("set_lens_prescription was not registered");

    rerender({ lookupMaps: customMaps });
    expect(registerTool).toHaveBeenCalledTimes(5);
    await act(async () => {
      await registeredSet.execute(prescription, { signal: new AbortController().signal });
    });

    expect(store.getState().rows[1]).toEqual(expect.objectContaining({
      medium: "CUSTOM_A",
      manufacturer: "Custom",
    }));
    unmount();
    Object.defineProperty(document, "modelContext", { configurable: true, value: undefined });
  });
});
