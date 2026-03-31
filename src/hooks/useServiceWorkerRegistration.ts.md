# `hooks/useServiceWorkerRegistration.ts`

## Purpose

Register the Pyodide service worker (file at`public/pyodide-sw.js`) so that the browser caches the Pyodide WASM bundle and the wheels of `rayoptics_web_utils` (local package in `python/`), `rayoptics` and its deps.

## Exports

| Export | Kind | Description |
|--------|------|-------------|
| `registerServiceWorker` | `async function` | Standalone async function that performs the registration. Can be called outside of React if needed. |
| `useServiceWorkerRegistration` | React hook | Calls `registerServiceWorker()` once on mount via `useEffect`. Returns `void`. |

## Behavior

### `registerServiceWorker()`

1. Guards against non-browser environments: returns immediately if `navigator` is `undefined` or `"serviceWorker"` is not in `navigator`.
2. Reads `process.env.NEXT_PUBLIC_BASE_PATH` (defaults to `""` if unset) to construct the correct script URL: `${basePath}/pyodide-sw.js`.
3. Calls `navigator.serviceWorker.register(url)`.
4. Silently ignores any registration error (caught and discarded).

### `useServiceWorkerRegistration()`

- Calls `registerServiceWorker()` inside `useEffect` with an empty dependency array, so it runs exactly once after the component mounts.
- Returns `void`.

## Dependencies

- `useEffect` from React.
- `navigator.serviceWorker` browser API.
- `process.env.NEXT_PUBLIC_BASE_PATH` — Next.js public env var for the app's base path (e.g. `"/ray-optics-web"` on GitHub Pages).

## Edge Cases / Error Handling

- If `navigator.serviceWorker` is unavailable (e.g. non-HTTPS context, or the browser doesn't support service workers), the function returns without throwing.
- Registration failures (network error, script parse error, etc.) are silently swallowed — the app functions without caching; users just re-download assets on each visit.
- On the server `navigator` is `undefined`; the guard at the top of `registerServiceWorker` prevents any error.

## Usages

**1. Via the `ServiceWorkerRegistrar` component (recommended):**

```tsx
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
```

**2. Directly in a component:**

```tsx
"use client";

import { useServiceWorkerRegistration } from "@/hooks/useServiceWorkerRegistration";

export function AppRoot() {
  useServiceWorkerRegistration(); // Runs once on mount

  return <div>{/* app content */}</div>;
}
```

**3. Standalone async function (outside React):**

```ts
import { registerServiceWorker } from "@/hooks/useServiceWorkerRegistration";

async function setupApp() {
  await registerServiceWorker();
  // Service worker is now registered
}
```
