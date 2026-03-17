const CACHEABLE_PATTERNS = [
  "cdn.jsdelivr.net/pyodide/",
  "files.pythonhosted.org/",
  "pypi.org/pypi/",
];

export function shouldCache(url: string, origin?: string): boolean {
  if (CACHEABLE_PATTERNS.some((pattern) => url.includes(pattern))) {
    return true;
  }
  // Cache same-origin .whl files (e.g., the rayoptics-web-utils wheel)
  if (origin && url.startsWith(origin) && url.endsWith(".whl")) {
    return true;
  }
  return false;
}
