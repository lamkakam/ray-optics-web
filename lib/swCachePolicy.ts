const CACHEABLE_PATTERNS = [
  "cdn.jsdelivr.net/pyodide/",
  "files.pythonhosted.org/",
];

export function shouldCache(url: string): boolean {
  return CACHEABLE_PATTERNS.some((pattern) => url.includes(pattern));
}
