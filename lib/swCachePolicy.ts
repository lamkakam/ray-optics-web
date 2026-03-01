const CACHEABLE_PATTERNS = [
  "cdn.jsdelivr.net/pyodide/",
  "files.pythonhosted.org/",
  "pypi.org/pypi/",
];

export function shouldCache(url: string): boolean {
  return CACHEABLE_PATTERNS.some((pattern) => url.includes(pattern));
}
