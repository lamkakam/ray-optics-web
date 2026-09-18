import type { UserDefinedGlassData } from "@/features/glass-map/types/glassMap";
import {
  createCustomGlassWebMcpTools,
  type CustomGlassWebMcpDependencies,
} from "@/features/import-custom-glass/lib/customGlassWebMcp";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

const pairs = [
  [486.13, 1.5224],
  [546.07, 1.5187],
  [587.56, 1.5168],
  [656.27, 1.5143],
] as const;
const glass: UserDefinedGlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_fe: 0.4, P_Fd: 0.41, P_gF: 0.53 },
  dispersionCoeffKind: "tabulated",
  dispersionCoeffs: pairs,
};

function dependencies(
  overrides: Partial<CustomGlassWebMcpDependencies> = {},
): CustomGlassWebMcpDependencies {
  return {
    proxy: {
      addUserDefinedGlasses: jest.fn().mockResolvedValue({ NEW: glass }),
      updateUserDefinedGlasses: jest
        .fn()
        .mockResolvedValue({ EXISTING: glass }),
      deleteUserDefinedGlasses: jest.fn().mockResolvedValue(undefined),
    } as unknown as PyodideWorkerAPI,
    customGlasses: { EXISTING: glass },
    storeActions: {
      upsertCustomGlasses: jest.fn(),
      deleteCustomGlasses: jest.fn(),
    },
    persistInput: jest.fn().mockResolvedValue(undefined),
    deletePersisted: jest.fn().mockResolvedValue(undefined),
    onPersistenceWarning: jest.fn(),
    ...overrides,
  };
}

const signal = new AbortController().signal;

describe("custom-glass WebMCP tools", () => {
  it("publishes strict schemas, nanometre guidance, and standard annotations", () => {
    const tools = createCustomGlassWebMcpTools(dependencies());
    expect(Object.values(tools).map((tool) => tool.name)).toEqual([
      "get_custom_glasses",
      "add_custom_glass",
      "update_custom_glass",
      "delete_custom_glass",
    ]);
    expect(tools.getCustomGlasses.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    for (const tool of [
      tools.addCustomGlass,
      tools.updateCustomGlass,
      tools.deleteCustomGlass,
    ]) {
      expect(tool.annotations).toEqual({
        readOnlyHint: false,
        untrustedContentHint: false,
      });
    }
    expect(tools.addCustomGlass.description).toMatch(/nanometres/i);
    expect(
      (tools.addCustomGlass.inputSchema as { additionalProperties?: boolean })
        .additionalProperties,
    ).toBe(false);
  });

  it("reads all glasses or one requested glass and rejects unknown names", async () => {
    const tools = createCustomGlassWebMcpTools(dependencies());
    await expect(tools.getCustomGlasses.execute({}, { signal })).resolves.toBe(
      JSON.stringify({ customGlasses: { EXISTING: glass } }),
    );
    await expect(
      tools.getCustomGlasses.execute({ name: "EXISTING" }, { signal }),
    ).resolves.toBe(JSON.stringify({ customGlasses: { EXISTING: glass } }));
    await expect(
      tools.getCustomGlasses.execute({ name: "MISSING" }, { signal }),
    ).rejects.toThrow("Invalid input at /name: unknown custom glass MISSING");
  });

  it("rejects unknown properties, three pairs, duplicates, conflicts, and missing mutations", async () => {
    const tools = createCustomGlassWebMcpTools(dependencies());
    await expect(
      tools.addCustomGlass.execute(
        { name: "NEW", pairs, extra: true },
        { signal },
      ),
    ).rejects.toThrow("Invalid input at /extra");
    await expect(
      tools.addCustomGlass.execute(
        { name: "NEW", pairs: pairs.slice(0, 3) },
        { signal },
      ),
    ).rejects.toThrow("Invalid input at /pairs");
    await expect(
      tools.addCustomGlass.execute(
        { name: "NEW", pairs: [...pairs.slice(0, 3), pairs[0]] },
        { signal },
      ),
    ).rejects.toThrow("Invalid input at /pairs");
    await expect(
      tools.addCustomGlass.execute({ name: "EXISTING", pairs }, { signal }),
    ).rejects.toThrow("Invalid input at /name: custom glass already exists");
    await expect(
      tools.updateCustomGlass.execute(
        { currentName: "MISSING", name: "NEW", pairs },
        { signal },
      ),
    ).rejects.toThrow("Invalid input at /currentName");
    await expect(
      tools.deleteCustomGlass.execute({ name: "MISSING" }, { signal }),
    ).rejects.toThrow("Invalid input at /name");
  });

  it("creates, updates, renames, and deletes through worker-first shared operations", async () => {
    const deps = dependencies();
    const tools = createCustomGlassWebMcpTools(deps);

    await expect(
      tools.addCustomGlass.execute({ name: "NEW", pairs }, { signal }),
    ).resolves.toBe(JSON.stringify({ name: "NEW", glass }));
    await expect(
      tools.updateCustomGlass.execute(
        { currentName: "EXISTING", name: "EXISTING", pairs },
        { signal },
      ),
    ).resolves.toBe(
      JSON.stringify({ currentName: "EXISTING", name: "EXISTING", glass }),
    );

    const renamedDeps = dependencies({
      proxy: {
        addUserDefinedGlasses: jest.fn().mockResolvedValue({ RENAMED: glass }),
        deleteUserDefinedGlasses: jest.fn().mockResolvedValue(undefined),
      } as unknown as PyodideWorkerAPI,
    });
    const renameTools = createCustomGlassWebMcpTools(renamedDeps);
    await expect(
      renameTools.updateCustomGlass.execute(
        { currentName: "EXISTING", name: "RENAMED", pairs },
        { signal },
      ),
    ).resolves.toBe(
      JSON.stringify({ currentName: "EXISTING", name: "RENAMED", glass }),
    );
    await expect(
      tools.deleteCustomGlass.execute({ name: "EXISTING" }, { signal }),
    ).resolves.toBe(JSON.stringify({ name: "EXISTING" }));
  });

  it("returns persistence warnings, mirrors them to the UI callback, and does not roll back", async () => {
    const deps = dependencies({
      persistInput: jest.fn().mockRejectedValue(new Error("storage failed")),
    });
    const tools = createCustomGlassWebMcpTools(deps);
    await expect(
      tools.addCustomGlass.execute({ name: "NEW", pairs }, { signal }),
    ).resolves.toBe(
      JSON.stringify({
        name: "NEW",
        glass,
        persistenceWarnings: ["storage failed"],
      }),
    );
    expect(deps.onPersistenceWarning).toHaveBeenCalledWith("storage failed");
    expect(deps.storeActions.upsertCustomGlasses).toHaveBeenCalledWith({
      NEW: glass,
    });
  });

  it("checks cancellation before mutation but finishes synchronization after a mutation starts", async () => {
    const before = new AbortController();
    before.abort();
    const cancelledDeps = dependencies();
    const cancelledTools = createCustomGlassWebMcpTools(cancelledDeps);
    await expect(
      cancelledTools.addCustomGlass.execute(
        { name: "NEW", pairs },
        { signal: before.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelledDeps.proxy?.addUserDefinedGlasses).not.toHaveBeenCalled();

    const during = new AbortController();
    const deps = dependencies({
      proxy: {
        addUserDefinedGlasses: jest.fn().mockImplementation(async () => {
          during.abort();
          return { NEW: glass };
        }),
      } as unknown as PyodideWorkerAPI,
    });
    const tools = createCustomGlassWebMcpTools(deps);
    await expect(
      tools.addCustomGlass.execute(
        { name: "NEW", pairs },
        { signal: during.signal },
      ),
    ).resolves.toBe(JSON.stringify({ name: "NEW", glass }));
    expect(deps.persistInput).toHaveBeenCalled();
    expect(deps.storeActions.upsertCustomGlasses).toHaveBeenCalled();
  });

  it("forwards worker failures without persistence or store changes", async () => {
    const deps = dependencies({
      proxy: {
        addUserDefinedGlasses: jest
          .fn()
          .mockRejectedValue(new Error("worker failed")),
      } as unknown as PyodideWorkerAPI,
    });
    const tools = createCustomGlassWebMcpTools(deps);
    await expect(
      tools.addCustomGlass.execute({ name: "NEW", pairs }, { signal }),
    ).rejects.toThrow("worker failed");
    expect(deps.persistInput).not.toHaveBeenCalled();
    expect(deps.storeActions.upsertCustomGlasses).not.toHaveBeenCalled();
  });
});
