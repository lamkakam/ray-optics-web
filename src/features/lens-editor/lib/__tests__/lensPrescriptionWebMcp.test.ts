import { createStore, type StoreApi } from "zustand";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { registerLensPrescriptionTools } from "@/features/lens-editor/lib/lensPrescriptionWebMcp";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";

const basePrescription = {
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [{ label: "Default" as const, curvatureRadius: 50, thickness: 5, medium: "air", manufacturer: "", semiDiameter: 10 }],
  image: { curvatureRadius: 0 },
};

type Registered = WebMCP.ModelContextTool & { options?: WebMCP.ModelContextRegisterToolOptions };

function setup() {
  const store = createStore<LensEditorState>(createLensEditorSlice);
  store.getState().setRows(surfacesToGridRows(basePrescription));
  const tools = new Map<string, Registered>();
  const registerTool = jest.fn(async (tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
    tools.set(tool.name, { ...tool, options });
  });
  const modelContext = { registerTool } as unknown as WebMCP.ModelContext;
  const controller = registerLensPrescriptionTools(store, modelContext);
  const execute = async (name: string, input: unknown, signal = new AbortController().signal) => {
    const tool = tools.get(name);
    if (!tool) throw new Error(`Missing tool ${name}`);
    return tool.execute(input as Record<string, unknown>, { signal });
  };
  return { store, tools, registerTool, controller, execute };
}

function snapshot(store: StoreApi<LensEditorState>) {
  const state = store.getState();
  return {
    rows: state.rows,
    revision: state.prescriptionRevision,
    selectedRowId: state.selectedRowId,
    optimizationSyncPolicy: state.optimizationSyncPolicy,
  };
}

describe("lens prescription WebMCP tools", () => {
  it("registers five same-origin tools with annotations and a shared cleanup signal", () => {
    const { tools, registerTool, controller } = setup();
    expect(registerTool).toHaveBeenCalledTimes(5);
    expect([...tools.keys()]).toEqual([
      "get_lens_prescription", "set_lens_prescription", "insert_lens_surface", "update_lens_row", "delete_lens_surface",
    ]);
    expect(tools.get("get_lens_prescription")?.annotations?.readOnlyHint).toBe(true);
    expect(tools.get("set_lens_prescription")?.annotations?.readOnlyHint).toBe(false);
    for (const tool of tools.values()) {
      expect(tool.options).toEqual({ signal: controller?.signal });
      expect(tool.options).not.toHaveProperty("exposedTo");
      expect(tool.inputSchema).toEqual(expect.objectContaining({ type: "object", additionalProperties: false }));
    }
    controller?.abort();
    expect(controller?.signal.aborted).toBe(true);
  });

  it("skips registration when WebMCP is unavailable", () => {
    const store = createStore<LensEditorState>(createLensEditorSlice);
    expect(registerLensPrescriptionTools(store, undefined)).toBeUndefined();
  });

  it.each([
    [{}, basePrescription],
    [{ row: "object" }, basePrescription.object],
    [{ row: 1 }, basePrescription.surfaces[0]],
    [{ row: "image" }, basePrescription.image],
  ])("reads a validated selector %#", async (input, expected) => {
    const { execute } = setup();
    const result = await execute("get_lens_prescription", input);
    expect(JSON.parse(String(result))).toEqual(expected);
  });

  it.each([
    ["get_lens_prescription", { row: 0 }],
    ["get_lens_prescription", { row: "first" }],
    ["get_lens_prescription", { extra: true }],
    ["set_lens_prescription", { object: basePrescription.object, surfaces: [] }],
    ["insert_lens_surface", {}],
    ["insert_lens_surface", { after: "image" }],
    ["update_lens_row", { row: 1 }],
    ["update_lens_row", { row: 1, values: { thickness: "five" } }],
    ["delete_lens_surface", { surface: "1" }],
    ["delete_lens_surface", { surface: 1, extra: true }],
  ])("rejects invalid %s input without changing state", async (name, input) => {
    const { store, execute } = setup();
    const before = snapshot(store);
    await expect(execute(name, input)).rejects.toThrow(/input.*\//i);
    expect(snapshot(store)).toEqual(before);
  });

  it("replaces a fully validated prescription with one setRows call and one revision", async () => {
    const { store, execute } = setup();
    const spy = jest.spyOn(store.getState(), "setRows");
    const before = store.getState().prescriptionRevision;
    const replacement = { ...basePrescription, surfaces: [...basePrescription.surfaces, { ...basePrescription.surfaces[0], curvatureRadius: -30 }] };
    const result = JSON.parse(String(await execute("set_lens_prescription", replacement)));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.getState().prescriptionRevision).toBe(before + 1);
    expect(result).toEqual(expect.objectContaining({ revision: before + 1, surfaceCount: 2, systemUpdateRequired: true }));
  });

  it("inserts after object and resolves shifted visible surface selectors", async () => {
    const { store, execute } = setup();
    await execute("insert_lens_surface", { after: "object" });
    expect(store.getState().rows.filter((row) => row.kind === "surface")).toHaveLength(2);
    await execute("update_lens_row", { row: 2, values: { comment: "formerly first" } });
    expect(store.getState().rows[2]).toEqual(expect.objectContaining({ comment: "formerly first", curvatureRadius: 50 }));
  });

  it("updates simple and nested fields, and clears optional fields", async () => {
    const { store, execute } = setup();
    await execute("update_lens_row", {
      row: 1,
      values: {
        label: "Stop",
        aspherical: { kind: "Conic", conicConstant: -1 },
        decenter: { coordinateSystemStrategy: "reverse", alpha: 1, beta: 2, gamma: 3, offsetX: 4, offsetY: 5 },
        clear_aperture: { shape: "circular", offsetX: 0, offsetY: 0 },
        diffractiveElement: { diffractionGrating: { lpmm: 600, order: -1 } },
      },
    });
    await execute("update_lens_row", { row: 1, clear: ["aspherical", "decenter", "diffractiveElement"] });
    expect(store.getState().rows[1]).toEqual(expect.objectContaining({ label: "Stop", aspherical: undefined, decenter: undefined, diffractiveElement: undefined }));
  });

  it("updates object and image with only applicable values", async () => {
    const { store, execute } = setup();
    await execute("update_lens_row", { row: "object", values: { distance: 25, medium: "air", manufacturer: "" } });
    await execute("update_lens_row", { row: "image", values: { curvatureRadius: -100 } });
    expect(store.getState().rows[0]).toEqual(expect.objectContaining({ objectDistance: 25 }));
    expect(store.getState().rows.at(-1)).toEqual(expect.objectContaining({ curvatureRadius: -100 }));
    await expect(execute("update_lens_row", { row: "image", values: { thickness: 4 } })).rejects.toThrow(/not applicable/i);
  });

  it("validates the complete update candidate before calling updateRow", async () => {
    const { store, execute } = setup();
    const spy = jest.spyOn(store.getState(), "updateRow");
    await expect(execute("update_lens_row", {
      row: 1,
      values: { clear_aperture: { shape: "annular", obstructionRadius: 20, offsetX: 0, offsetY: 0 } },
    })).rejects.toThrow(/prescription/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("matches grid semi-diameter edit restrictions", async () => {
    const { store, execute } = setup();
    store.getState().setAutoAperture(true);
    await expect(execute("update_lens_row", { row: 1, values: { semiDiameter: 4 } })).rejects.toThrow(/auto aperture/i);
    store.getState().setAutoAperture(false);
    await execute("update_lens_row", { row: 1, values: { clear_aperture: { shape: "rectangular", xHalfWidth: 4, yHalfWidth: 3, rotation: 0, offsetX: 0, offsetY: 0 } } });
    await expect(execute("update_lens_row", { row: 1, values: { semiDiameter: 4 } })).rejects.toThrow(/rectangular/i);
  });

  it("deletes only a current positive surface index and clears its selection", async () => {
    const { store, execute } = setup();
    store.getState().setSelectedRowId(store.getState().rows[1].id);
    const result = JSON.parse(String(await execute("delete_lens_surface", { surface: 1 })));
    expect(store.getState().rows.filter((row) => row.kind === "surface")).toHaveLength(0);
    expect(store.getState().selectedRowId).toBeUndefined();
    expect(result).toEqual(expect.objectContaining({ surface: 1, surfaceCount: 0, systemUpdateRequired: true }));
    await expect(execute("delete_lens_surface", { surface: 1 })).rejects.toThrow(/does not exist/i);
  });

  it("honours execution cancellation before reading or mutating state", async () => {
    const { store, execute } = setup();
    const before = snapshot(store);
    const controller = new AbortController();
    controller.abort();
    await expect(execute("get_lens_prescription", {}, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    await expect(execute("insert_lens_surface", { after: "object" }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(snapshot(store)).toEqual(before);
  });
});
