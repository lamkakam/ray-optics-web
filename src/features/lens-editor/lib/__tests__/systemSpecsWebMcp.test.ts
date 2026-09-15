import { createStore } from "zustand";
import {
  createSpecsConfiguratorSlice,
  type SpecsConfiguratorState,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createSystemSpecsTools } from "@/features/lens-editor/lib/systemSpecsWebMcp";

function setup() {
  const store = createStore<SpecsConfiguratorState>(
    createSpecsConfiguratorSlice,
  );
  const tools = new Map(
    Object.values(createSystemSpecsTools(store)).map((tool) => [
      tool.name,
      tool,
    ]),
  );
  const execute = async (
    name: string,
    input: unknown,
    signal?: AbortSignal,
  ) => {
    const tool = tools.get(name);
    if (tool === undefined) throw new Error(`Missing tool ${name}`);
    return tool.execute(input as Record<string, unknown>, {
      signal: signal ?? new AbortController().signal,
    });
  };
  return { store, tools, execute };
}

function draftSnapshot(store: { getState: () => SpecsConfiguratorState }) {
  const state = store.getState();
  return {
    pupilSpace: state.pupilSpace,
    pupilType: state.pupilType,
    pupilValue: state.pupilValue,
    fieldSpace: state.fieldSpace,
    fieldType: state.fieldType,
    maxField: state.maxField,
    fields: state.fields,
    isRelative: state.isRelative,
    isWideAngle: state.isWideAngle,
    wavelengthWeights: state.wavelengthWeights,
    referenceIndex: state.referenceIndex,
    committedSpecs: state.committedSpecs,
  };
}

describe("System Specs WebMCP tools", () => {
  it("creates four strict descriptors in the public order", () => {
    const { tools } = setup();

    expect([...tools.keys()]).toEqual([
      "get_system_specs",
      "set_system_aperture",
      "set_half_field",
      "set_wavelengths",
    ]);
    expect(tools.get("get_system_specs")?.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    for (const tool of tools.values()) {
      expect(tool.inputSchema).toEqual(
        expect.objectContaining({
          type: "object",
        }),
      );
      expect(tool.annotations?.untrustedContentHint).toBe(false);
    }
  });

  it("reads the current draft and stages a supported aperture", async () => {
    const { store, execute } = setup();
    const beforeCommit = store.getState().committedSpecs;

    const result = JSON.parse(
      String(
        await execute("set_system_aperture", {
          space: "image",
          type: "f/#",
          value: 4,
        }),
      ),
    );

    expect(result).toEqual({
      pupil: { space: "image", type: "f/#", value: 4 },
      systemUpdateRequired: true,
    });
    expect(JSON.parse(String(await execute("get_system_specs", {})))).toEqual(
      expect.objectContaining({ pupil: result.pupil }),
    );
    expect(store.getState().committedSpecs).toBe(beforeCommit);
  });

  it("stages a relative half-field and wavelengths", async () => {
    const { execute, store } = setup();
    const field = {
      space: "object",
      type: "angle",
      maxField: 30,
      fields: [0, 0.5, 1],
      isRelative: true,
      isWideAngle: true,
    };
    const wavelengths = {
      weights: [
        [486.133, 1],
        [587.562, 1],
      ],
      referenceIndex: 1,
    };

    expect(JSON.parse(String(await execute("set_half_field", field)))).toEqual({
      field,
      systemUpdateRequired: true,
    });
    expect(store.getState().fields).toEqual(field.fields);
    expect(store.getState().isRelative).toBe(true);
    expect(
      JSON.parse(String(await execute("set_wavelengths", wavelengths))),
    ).toEqual({ wavelengths, systemUpdateRequired: true });
  });

  it("preserves an omitted optional wide-angle flag in the setter result", async () => {
    const { execute } = setup();
    const field = {
      space: "image",
      type: "height",
      maxField: 4,
      fields: [0, 1],
      isRelative: true,
    } as const;

    expect(JSON.parse(String(await execute("set_half_field", field)))).toEqual({
      field,
      systemUpdateRequired: true,
    });
  });

  it.each([
    ["set_system_aperture", { space: "image", type: "epd", value: 4 }],
    ["set_system_aperture", { space: "image", type: "f/#", value: NaN }],
    [
      "set_half_field",
      {
        space: "object",
        type: "angle",
        maxField: 1,
        fields: [0],
        isRelative: false,
      },
    ],
    [
      "set_half_field",
      {
        space: "image",
        type: "angle",
        maxField: 1,
        fields: [0],
        isRelative: true,
      },
    ],
    ["set_wavelengths", { weights: [], referenceIndex: 0 }],
    ["set_wavelengths", { weights: [[587.6, 1]], referenceIndex: 1 }],
    [
      "set_wavelengths",
      { weights: [[587.6, 1]], referenceIndex: 0, extra: true },
    ],
  ])("rejects invalid %s input without mutation", async (name, input) => {
    const { store, execute } = setup();
    const before = draftSnapshot(store);

    await expect(execute(name, input)).rejects.toThrow(/input.*\//i);

    expect(draftSnapshot(store)).toEqual(before);
  });

  it("rejects an already cancelled execution before changing draft state", async () => {
    const { store, execute } = setup();
    const before = draftSnapshot(store);
    const controller = new AbortController();
    controller.abort();

    await expect(
      execute(
        "set_system_aperture",
        { space: "object", type: "NA", value: 0.5 },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      execute(
        "set_half_field",
        {
          space: "object",
          type: "height",
          maxField: 10,
          fields: [0, 1],
          isRelative: true,
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      execute(
        "set_wavelengths",
        { weights: [[587.6, 1]], referenceIndex: 0 },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(draftSnapshot(store)).toEqual(before);
  });

  it("keeps setter mutations synchronous for callers that use the imperative API", async () => {
    const { store, execute } = setup();
    await execute("set_system_aperture", {
      space: "object",
      type: "NA",
      value: 0.25,
    });
    expect(store.getState().pupilType).toBe("NA");
  });
});
