"use client";

import { useServiceWorkerRegistration } from "@/shared/hooks/useServiceWorkerRegistration";

/**
 * Headless client component that triggers service worker registration on mount by calling `useServiceWorkerRegistration`. Renders nothing — exists solely to invoke the hook in the component tree.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Renders `null`.
 * - `"use client"` boundary ensures the hook runs only in the browser.
 * - Placed near the root of the layout tree so registration happens as early as possible.
 */
export default function ServiceWorkerRegistrar() {
  useServiceWorkerRegistration();
  return null;
}
