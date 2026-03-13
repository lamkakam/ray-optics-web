/** Paths served locally that should be cached by the service worker. */
const LOCAL_PATH_PREFIXES = ["/pyodide/", "/wheels/"];

/** External hostnames that must never be cached (no longer used after self-hosting). */
const EXTERNAL_HOSTNAMES = ["cdn.jsdelivr.net", "files.pythonhosted.org", "pypi.org"];

export function shouldCache(url: string): boolean {
  // Fast path: relative URLs are always local
  if (LOCAL_PATH_PREFIXES.some((p) => url.startsWith(p))) return true;

  try {
    const { hostname, pathname } = new URL(url);
    if (EXTERNAL_HOSTNAMES.includes(hostname)) return false;
    return LOCAL_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}
