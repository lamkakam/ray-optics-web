/**
 * Canonical definitions for every page exposed by the application shell.
 *
 * @remarks
 * The side navigation and page-level WebMCP tools both consume this ordered
 * list. Keeping the route key, URL path, label, and App Router segment in one
 * place prevents an agent-facing page name from drifting away from the
 * visible navigation.
 */

/** Ordered application pages and their canonical route metadata. */
export const PAGE_DEFINITIONS = [
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
] as const;

/** A stable key identifying one of the pages in {@link PAGE_DEFINITIONS}. */
export type PageKey = (typeof PAGE_DEFINITIONS)[number]["key"];

/** The shape shared by each canonical page definition. */
export type PageDefinition = (typeof PAGE_DEFINITIONS)[number];

/** Finds a canonical page definition by its WebMCP route key. */
export function getPageDefinition(key: string): PageDefinition | undefined {
  return PAGE_DEFINITIONS.find((page) => page.key === key);
}

/** Removes query and hash suffixes before comparing a browser pathname. */
function getCanonicalPathname(pathname: string): string {
  const queryIndex = pathname.indexOf("?");
  const hashIndex = pathname.indexOf("#");
  const suffixIndex = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  return suffixIndex === undefined ? pathname : pathname.slice(0, suffixIndex);
}

/** Finds the canonical page represented by a pathname, ignoring query/hash. */
export function getPageDefinitionForPathname(
  pathname: string,
): PageDefinition | undefined {
  const canonicalPathname = getCanonicalPathname(pathname);
  return PAGE_DEFINITIONS.find((page) => page.path === canonicalPathname);
}
