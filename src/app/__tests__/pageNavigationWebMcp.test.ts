/** Exercises the shared page-definition lookup and global page WebMCP contract. */
import {
  getPageDefinition,
  getPageDefinitionForPathname,
  PAGE_DEFINITIONS,
} from "@/shared/lib/navigation/pageDefinitions";
import {
  createPageNavigationTools,
  type ActivePageResult,
  type PageNavigationResult,
  type OptimizationNavigationResult,
} from "@/app/pageNavigationWebMcp";

function setup() {
  let currentPage: ActivePageResult["page"] = "lens_editor";
  let pendingNavigation: ActivePageResult["pendingNavigation"];
  const navigateToPage = jest.fn<
    PageNavigationResult,
    [ActivePageResult["page"]]
  >((page) => ({ status: "navigated", page }));
  const resolveOptimizationNavigation = jest.fn<
    OptimizationNavigationResult,
    ["stay" | "leave" | "apply_to_editor", AbortSignal]
  >((action) => {
    if (action === "stay") return { status: "stayed" };
    if (action === "leave") return { status: "left", page: "about" };
    return { status: "applied_and_left", page: "about" };
  });
  const tools = createPageNavigationTools({
    getCurrentPage: () => currentPage,
    getPendingNavigation: () => pendingNavigation,
    navigateToPage,
    resolveOptimizationNavigation,
  });
  const execute = async (
    name: keyof typeof tools,
    input: unknown,
    signal = new AbortController().signal,
  ) => tools[name].execute(input as Record<string, unknown>, { signal });

  return {
    tools,
    execute,
    navigateToPage,
    resolveOptimizationNavigation,
    setCurrentPage: (page: ActivePageResult["page"]) => {
      currentPage = page;
    },
    setPendingNavigation: (page: ActivePageResult["pendingNavigation"]) => {
      pendingNavigation = page;
    },
  };
}

describe("page definitions", () => {
  it("contains the eight canonical routes in SideNav order", () => {
    expect(PAGE_DEFINITIONS).toEqual([
      {
        key: "lens_editor",
        path: "/",
        label: "Lens Editor",
        segment: null,
      },
      {
        key: "example_systems",
        path: "/example-systems",
        label: "Example Systems",
        segment: "example-systems",
      },
      {
        key: "optimization",
        path: "/optimization",
        label: "Optimization",
        segment: "optimization",
      },
      {
        key: "glass_map",
        path: "/glass-map",
        label: "Glass Map",
        segment: "glass-map",
      },
      {
        key: "import_custom_glass",
        path: "/import-custom-glass",
        label: "Import Custom Glass",
        segment: "import-custom-glass",
      },
      {
        key: "settings",
        path: "/settings",
        label: "Settings",
        segment: "settings",
      },
      {
        key: "privacy_policy",
        path: "/privacy-policy",
        label: "Privacy Policy",
        segment: "privacy-policy",
      },
      {
        key: "about",
        path: "/about",
        label: "About",
        segment: "about",
      },
    ]);
  });

  it("looks up pages by key and ignores query strings and hashes by path", () => {
    expect(getPageDefinition("optimization")).toEqual(
      expect.objectContaining({ key: "optimization", path: "/optimization" }),
    );
    expect(getPageDefinition("not-a-page")).toBeUndefined();
    expect(getPageDefinitionForPathname("/about?tab=help#details")).toEqual(
      expect.objectContaining({ key: "about" }),
    );
    expect(getPageDefinitionForPathname("/missing")).toBeUndefined();
  });
});

describe("page navigation WebMCP tools", () => {
  it("creates strict descriptors with stable names and annotations", () => {
    const { tools } = setup();

    expect(Object.keys(tools)).toEqual([
      "setActivePage",
      "getActivePage",
      "resolveOptimizationNavigation",
    ]);
    expect(tools.setActivePage.name).toBe("set_active_page");
    expect(tools.getActivePage.name).toBe("get_active_page");
    expect(tools.resolveOptimizationNavigation.name).toBe(
      "resolve_optimization_navigation",
    );
    expect(tools.setActivePage.inputSchema).toEqual(
      expect.objectContaining({
        type: "object",
        required: ["page"],
        additionalProperties: false,
      }),
    );
    expect(tools.getActivePage.inputSchema).toEqual({
      type: "object",
      additionalProperties: false,
    });
    expect(tools.resolveOptimizationNavigation.inputSchema).toEqual(
      expect.objectContaining({
        type: "object",
        required: ["action"],
        additionalProperties: false,
      }),
    );
    expect(tools.getActivePage.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    expect(tools.setActivePage.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
    expect(tools.resolveOptimizationNavigation.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
  });

  it("validates page and action inputs strictly before invoking callbacks", async () => {
    const { execute, navigateToPage, resolveOptimizationNavigation } = setup();

    await expect(execute("setActivePage", {})).rejects.toThrow(
      /input.*\/page/i,
    );
    await expect(
      execute("setActivePage", { page: "not-a-page" }),
    ).rejects.toThrow(/input.*\/page/i);
    await expect(
      execute("setActivePage", { page: "about", extra: true }),
    ).rejects.toThrow(/input.*\/extra/i);
    await expect(execute("getActivePage", { extra: true })).rejects.toThrow(
      /input.*\/extra/i,
    );
    await expect(
      execute("resolveOptimizationNavigation", { action: "discard" }),
    ).rejects.toThrow(/input.*\/action/i);
    await expect(
      execute("resolveOptimizationNavigation", {
        action: "stay",
        extra: true,
      }),
    ).rejects.toThrow(/input.*\/extra/i);

    expect(navigateToPage).not.toHaveBeenCalled();
    expect(resolveOptimizationNavigation).not.toHaveBeenCalled();
  });

  it("reads the canonical active page and pending guarded destination", async () => {
    const { execute, setCurrentPage, setPendingNavigation } = setup();

    expect(JSON.parse(String(await execute("getActivePage", {})))).toEqual({
      page: "lens_editor",
    });

    setCurrentPage("optimization");
    setPendingNavigation("about");
    expect(JSON.parse(String(await execute("getActivePage", {})))).toEqual({
      page: "optimization",
      pendingNavigation: "about",
    });
  });

  it("reports direct and guarded page navigation results", async () => {
    const { execute, navigateToPage } = setup();

    expect(
      JSON.parse(String(await execute("setActivePage", { page: "about" }))),
    ).toEqual({ status: "navigated", page: "about" });
    expect(navigateToPage).toHaveBeenCalledWith("about");

    navigateToPage.mockReturnValueOnce({
      status: "pending_optimization_confirmation",
      currentPage: "optimization",
      requestedPage: "settings",
    });
    expect(
      JSON.parse(String(await execute("setActivePage", { page: "settings" }))),
    ).toEqual({
      status: "pending_optimization_confirmation",
      currentPage: "optimization",
      requestedPage: "settings",
    });
  });

  it.each([
    ["stay", { status: "stayed" }],
    ["leave", { status: "left", page: "about" }],
    ["apply_to_editor", { status: "applied_and_left", page: "about" }],
  ] as const)(
    "reports the %s Optimization resolution",
    async (action, expected) => {
      const { execute, resolveOptimizationNavigation } = setup();

      expect(
        JSON.parse(
          String(
            await execute("resolveOptimizationNavigation", {
              action,
            }),
          ),
        ),
      ).toEqual(expected);
      expect(resolveOptimizationNavigation).toHaveBeenCalledWith(
        action,
        expect.any(AbortSignal),
      );
    },
  );

  it("returns the documented no-op result when no Optimization navigation is pending", async () => {
    const { execute, resolveOptimizationNavigation } = setup();
    resolveOptimizationNavigation.mockReturnValue({
      status: "no_pending_navigation",
    });

    expect(
      JSON.parse(
        String(
          await execute("resolveOptimizationNavigation", { action: "leave" }),
        ),
      ),
    ).toEqual({ status: "no_pending_navigation" });
  });

  it("rejects cancelled calls before reading or changing navigation state", async () => {
    const { execute, navigateToPage, resolveOptimizationNavigation } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(
      execute("setActivePage", { page: "about" }, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      execute("getActivePage", {}, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      execute(
        "resolveOptimizationNavigation",
        { action: "apply_to_editor" },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(navigateToPage).not.toHaveBeenCalled();
    expect(resolveOptimizationNavigation).not.toHaveBeenCalled();
  });
});
