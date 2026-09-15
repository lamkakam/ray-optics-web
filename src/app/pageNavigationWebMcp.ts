/**
 * Dependency-injected WebMCP descriptors for application-page navigation.
 *
 * @remarks
 * The descriptors deliberately receive navigation callbacks instead of owning
 * a router. `AppShell` supplies those callbacks so WebMCP requests use the
 * same Optimization leave guard, modal, and apply synchronization path as
 * SideNav clicks.
 */
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  getPageDefinition,
  PAGE_DEFINITIONS,
  type PageKey,
} from "@/shared/lib/navigation/pageDefinitions";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/features/lens-editor/lib/webMcpValidation";

/** Result returned after a page navigation request is accepted or deferred. */
export type PageNavigationResult =
  | { readonly status: "navigated"; readonly page: PageKey }
  | {
      readonly status: "pending_optimization_confirmation";
      readonly currentPage: PageKey;
      readonly requestedPage: PageKey;
    };

/** Result returned by `get_active_page`. */
export interface ActivePageResult {
  readonly page: PageKey;
  readonly pendingNavigation?: PageKey;
}

/** Actions that resolve the shell-owned Optimization leave confirmation. */
export type OptimizationNavigationAction = "stay" | "leave" | "apply_to_editor";

/** Result returned by an Optimization navigation resolution. */
export type OptimizationNavigationResult =
  | { readonly status: "stayed" }
  | { readonly status: "left"; readonly page: PageKey }
  | { readonly status: "applied_and_left"; readonly page: PageKey }
  | { readonly status: "no_pending_navigation" };

/** Dependencies supplied by the persistent application shell. */
export interface PageNavigationWebMcpDependencies {
  /** Reads the current canonical page at execution time. */
  readonly getCurrentPage: () => PageKey;
  /** Reads the pending guarded destination at execution time. */
  readonly getPendingNavigation: () => PageKey | undefined;
  /** Uses the shell's guarded navigation callback for one canonical page. */
  readonly navigateToPage: (page: PageKey) => PageNavigationResult;
  /** Uses the shell's shared Stay/Leave/Apply resolution callbacks. */
  readonly resolveOptimizationNavigation: (
    action: OptimizationNavigationAction,
    signal: AbortSignal,
  ) => WebMCP.MaybePromise<OptimizationNavigationResult>;
}

/** Strict empty input accepted by `get_active_page`. */
export const getActivePageInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;

/** Strict page-key input accepted by `set_active_page`. */
export const setActivePageInputSchema = {
  type: "object",
  required: ["page"],
  additionalProperties: false,
  properties: {
    page: {
      type: "string",
      enum: PAGE_DEFINITIONS.map(({ key }) => key),
    },
  },
} as const;

/** Strict action input accepted by `resolve_optimization_navigation`. */
export const resolveOptimizationNavigationInputSchema = {
  type: "object",
  required: ["action"],
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["stay", "leave", "apply_to_editor"],
    },
  },
} as const;

interface SetActivePageInput {
  readonly page: PageKey;
}

interface GetActivePageInput {
  readonly [key: string]: never;
}

interface ResolveOptimizationNavigationInput {
  readonly action: OptimizationNavigationAction;
}

const validators = (() => {
  const ajv = createPrescriptionAjv();
  return {
    setActivePage: ajv.compile<SetActivePageInput>(setActivePageInputSchema),
    getActivePage: ajv.compile<GetActivePageInput>(getActivePageInputSchema),
    resolveOptimizationNavigation:
      ajv.compile<ResolveOptimizationNavigationInput>(
        resolveOptimizationNavigationInputSchema,
      ),
  };
})();

/** Named handles for the three globally registered page tools. */
export type PageNavigationTools = Readonly<{
  readonly setActivePage: WebMCP.ModelContextTool;
  readonly getActivePage: WebMCP.ModelContextTool;
  readonly resolveOptimizationNavigation: WebMCP.ModelContextTool;
}>;

/** Creates strict page-navigation descriptors bound to the persistent shell. */
export function createPageNavigationTools(
  dependencies: PageNavigationWebMcpDependencies,
): PageNavigationTools {
  return {
    setActivePage: {
      name: "set_active_page",
      description:
        "Navigate to one of the application's canonical pages by route key. Leaving Optimization with an unapplied result returns a pending confirmation instead of navigating immediately.",
      inputSchema: setActivePageInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.setActivePage, input);
        assertWebMcpNotCancelled(signal);
        const page = (input as SetActivePageInput).page;
        if (getPageDefinition(page) === undefined) {
          throw new Error(`Invalid input at /page: ${page}`);
        }
        return JSON.stringify(dependencies.navigateToPage(page));
      },
    },
    getActivePage: {
      name: "get_active_page",
      description:
        "Read the canonical active application page and any pending Optimization navigation confirmation destination.",
      inputSchema: getActivePageInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.getActivePage, input);
        assertWebMcpNotCancelled(signal);
        const pendingNavigation = dependencies.getPendingNavigation();
        const result: ActivePageResult = {
          page: dependencies.getCurrentPage(),
          ...(pendingNavigation === undefined ? {} : { pendingNavigation }),
        };
        return JSON.stringify(result);
      },
    },
    resolveOptimizationNavigation: {
      name: "resolve_optimization_navigation",
      description:
        "Resolve the pending Optimization leave confirmation with stay, leave, or apply_to_editor.",
      inputSchema: resolveOptimizationNavigationInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.resolveOptimizationNavigation, input);
        assertWebMcpNotCancelled(signal);
        const action = (input as ResolveOptimizationNavigationInput).action;
        const result = await dependencies.resolveOptimizationNavigation(
          action,
          signal,
        );
        assertWebMcpNotCancelled(signal);
        return JSON.stringify(result);
      },
    },
  };
}
