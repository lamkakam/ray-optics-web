/**
 * Describes the Use Service Worker Registration module.
 *
 * @remarks
 * ## Dependencies
 *
 * - `useEffect` from React.
 * - `navigator.serviceWorker` browser API.
 * - `process.env.NEXT_PUBLIC_BASE_PATH` — Next.js public env var for the app's base path (e.g. `"/ray-optics-web"` on GitHub Pages).
 */
import { useEffect } from "react";

/**
 * Describes the Use Service Worker Registration module.
 *
 * @remarks
 * ### `registerServiceWorker()`
 *
 * 1. Guards against non-browser environments: returns immediately if `navigator` is `undefined` or `"serviceWorker"` is not in `navigator`.
 * 2. Reads `process.env.NEXT_PUBLIC_BASE_PATH` (defaults to `""` if unset) to construct the correct script URL: `${basePath}/pyodide-sw.js`.
 * 3. Registers with `updateViaCache: "none"`, forcing each app load to check the generated worker script rather than reusing an HTTP-cached deployment manifest.
 * 3. Calls `navigator.serviceWorker.register(url)`.
 * 4. Silently ignores any registration error (caught and discarded).
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    await navigator.serviceWorker.register(`${basePath}/pyodide-sw.js`, {
      updateViaCache: "none",
    });
  } catch {
    // Registration failed — silently ignore
  }
}

/**
 * Register the Pyodide service worker (file at`public/pyodide-sw.js`) so that the browser caches the Pyodide WASM bundle and the wheels of `rayoptics_web_utils` (local package in `python/`), `rayoptics` and its deps.
 *
 * @remarks
 * ## Behavior
 *
 * ### `useServiceWorkerRegistration()`
 *
 * - Calls `registerServiceWorker()` inside `useEffect` with an empty dependency array, so it runs exactly once after the component mounts.
 * - Returns `void`.
 *
 * ## Edge Cases / Error Handling
 *
 * - If `navigator.serviceWorker` is unavailable (e.g. non-HTTPS context, or the browser doesn't support service workers), the function returns without throwing.
 * - Registration failures (network error, script parse error, etc.) are silently swallowed — the app functions without caching; users just re-download assets on each visit.
 * - On the server `navigator` is `undefined`; the guard at the top of `registerServiceWorker` prevents any error.
 */
export function useServiceWorkerRegistration(): void {
  useEffect(() => {
    registerServiceWorker();
  }, []);
}
