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

/** Rejected inputs must leave the worker, persisted rows, and visible store untouched. */
function expectNoSideEffects(deps: CustomGlassWebMcpDependencies): void {
  expect(deps.proxy?.addUserDefinedGlasses).not.toHaveBeenCalled();
  expect(deps.proxy?.updateUserDefinedGlasses).not.toHaveBeenCalled();
  expect(deps.proxy?.deleteUserDefinedGlasses).not.toHaveBeenCalled();
  expect(deps.persistInput).not.toHaveBeenCalled();
  expect(deps.deletePersisted).not.toHaveBeenCalled();
  expect(deps.storeActions.upsertCustomGlasses).not.toHaveBeenCalled();
  expect(deps.storeActions.deleteCustomGlasses).not.toHaveBeenCalled();
  expect(deps.onPersistenceWarning).not.toHaveBeenCalled();
}

const signal = new AbortController().signal;

/** Valid calls exercise readiness independently of schema validation. */
const readinessCases = [
  ["getCustomGlasses", {}],
  ["getCustomGlasses", { name: "EXISTING" }],
  ["addCustomGlass", { name: "NEW", pairs }],
  ["updateCustomGlass", { currentName: "EXISTING", name: "NEW", pairs }],
  ["deleteCustomGlass", { name: "EXISTING" }],
] as const;

describe("custom-glass WebMCP tools", () => {
  it.each(readinessCases)(
    "rejects %s before catalog hydration for %p",
    async (key, input) => {
      const deps = dependencies({ customGlasses: undefined });
      const tools = createCustomGlassWebMcpTools(deps);

      await expect(tools[key].execute(input, { signal })).rejects.toThrow(
        "Custom-glass catalog is not ready.",
      );
      expectNoSideEffects(deps);
    },
  );

  it.each(readinessCases)(
    "validates input and cancellation before readiness for %s with %p",
    async (key, input) => {
      const deps = dependencies({ customGlasses: undefined });
      const tools = createCustomGlassWebMcpTools(deps);
      const cancelled = new AbortController();
      cancelled.abort();

      await expect(
        tools[key].execute(
          { ...input, extra: true },
          { signal: cancelled.signal },
        ),
      ).rejects.toThrow("Invalid input at /extra");
      await expect(
        tools[key].execute(input, { signal: cancelled.signal }),
      ).rejects.toMatchObject({ name: "AbortError" });
      expectNoSideEffects(deps);
    },
  );

  it("permits adding to a hydrated empty catalog", async () => {
    const deps = dependencies({ customGlasses: {} });
    const tools = createCustomGlassWebMcpTools(deps);

    await expect(
      tools.addCustomGlass.execute({ name: "NEW", pairs }, { signal }),
    ).resolves.toBe(JSON.stringify({ name: "NEW", glass }));
    expect(deps.storeActions.upsertCustomGlasses).toHaveBeenCalledWith({
      NEW: glass,
    });
  });

  describe.each(["constructor", "toString", "__proto__"])(
    "catalog label %s",
    (name) => {
      it.each(["read", "update", "rename", "delete"] as const)(
        "rejects a missing %s target without side effects",
        async (operation) => {
          const deps = dependencies({ customGlasses: {} });
          const tools = createCustomGlassWebMcpTools(deps);
          const calls = {
            read: () => tools.getCustomGlasses.execute({ name }, { signal }),
            update: () =>
              tools.updateCustomGlass.execute(
                { currentName: name, name, pairs },
                { signal },
              ),
            rename: () =>
              tools.updateCustomGlass.execute(
                { currentName: name, name: "NEW", pairs },
                { signal },
              ),
            delete: () => tools.deleteCustomGlass.execute({ name }, { signal }),
          };
          const path =
            operation === "update" || operation === "rename"
              ? "/currentName"
              : "/name";

          await expect(calls[operation]()).rejects.toThrow(
            `Invalid input at ${path}: unknown custom glass ${name}`,
          );
          expectNoSideEffects(deps);
          expect(deps.customGlasses).toEqual({});
        },
      );

      it("allows addition when the label is only inherited", async () => {
        const deps = dependencies({ customGlasses: {} });
        jest
          .mocked((deps.proxy as PyodideWorkerAPI).addUserDefinedGlasses)
          .mockResolvedValue({ [name]: glass });
        const tools = createCustomGlassWebMcpTools(deps);

        await expect(
          tools.addCustomGlass.execute({ name, pairs }, { signal }),
        ).resolves.toBe(JSON.stringify({ name, glass }));
        expect(deps.proxy?.addUserDefinedGlasses).toHaveBeenCalledWith([
          { name, pairs },
        ]);
        expect(deps.persistInput).toHaveBeenCalledWith({ name, pairs });
        expect(deps.storeActions.upsertCustomGlasses).toHaveBeenCalledWith({
          [name]: glass,
        });
      });

      it("allows a rename destination when the label is only inherited", async () => {
        const deps = dependencies();
        jest
          .mocked((deps.proxy as PyodideWorkerAPI).addUserDefinedGlasses)
          .mockResolvedValue({ [name]: glass });
        const tools = createCustomGlassWebMcpTools(deps);

        await expect(
          tools.updateCustomGlass.execute(
            { currentName: "EXISTING", name, pairs },
            { signal },
          ),
        ).resolves.toBe(
          JSON.stringify({ currentName: "EXISTING", name, glass }),
        );
        expect(deps.proxy?.addUserDefinedGlasses).toHaveBeenCalledWith([
          { name, pairs },
        ]);
        expect(deps.proxy?.deleteUserDefinedGlasses).toHaveBeenCalledWith([
          "EXISTING",
        ]);
        expect(deps.persistInput).toHaveBeenCalledWith({ name, pairs });
        expect(deps.deletePersisted).toHaveBeenCalledWith(["EXISTING"]);
        expect(deps.storeActions.upsertCustomGlasses).toHaveBeenCalledWith({
          [name]: glass,
        });
        expect(deps.storeActions.deleteCustomGlasses).toHaveBeenCalledWith([
          "EXISTING",
        ]);
      });

      it("rejects actual duplicate additions and rename destinations", async () => {
        const deps = dependencies({
          customGlasses: { EXISTING: glass, [name]: glass },
        });
        const tools = createCustomGlassWebMcpTools(deps);

        await expect(
          tools.addCustomGlass.execute({ name, pairs }, { signal }),
        ).rejects.toThrow(
          "Invalid input at /name: custom glass already exists",
        );
        await expect(
          tools.updateCustomGlass.execute(
            { currentName: "EXISTING", name, pairs },
            { signal },
          ),
        ).rejects.toThrow(
          "Invalid input at /name: custom glass already exists",
        );
        expectNoSideEffects(deps);
      });

      it("reads, updates, and deletes actual catalog entries", async () => {
        const deps = dependencies({ customGlasses: { [name]: glass } });
        jest
          .mocked((deps.proxy as PyodideWorkerAPI).updateUserDefinedGlasses)
          .mockResolvedValue({ [name]: glass });
        const tools = createCustomGlassWebMcpTools(deps);

        await expect(
          tools.getCustomGlasses.execute({ name }, { signal }),
        ).resolves.toBe(JSON.stringify({ customGlasses: { [name]: glass } }));
        await expect(
          tools.updateCustomGlass.execute(
            { currentName: name, name, pairs },
            { signal },
          ),
        ).resolves.toBe(JSON.stringify({ currentName: name, name, glass }));
        expect(deps.proxy?.updateUserDefinedGlasses).toHaveBeenCalledWith([
          { name, pairs },
        ]);
        expect(deps.persistInput).toHaveBeenCalledWith({ name, pairs });
        expect(deps.storeActions.upsertCustomGlasses).toHaveBeenCalledWith({
          [name]: glass,
        });

        await expect(
          tools.deleteCustomGlass.execute({ name }, { signal }),
        ).resolves.toBe(JSON.stringify({ name }));
        expect(deps.proxy?.deleteUserDefinedGlasses).toHaveBeenCalledWith([
          name,
        ]);
        expect(deps.deletePersisted).toHaveBeenCalledWith([name]);
        expect(deps.storeActions.deleteCustomGlasses).toHaveBeenCalledWith([
          name,
        ]);
      });
    },
  );

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
