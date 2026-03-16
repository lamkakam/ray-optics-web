import { useEffect } from "react";

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    await navigator.serviceWorker.register(`${basePath}/pyodide-sw.js`);
  } catch {
    // Registration failed — silently ignore
  }
}

export function useServiceWorkerRegistration(): void {
  useEffect(() => {
    registerServiceWorker();
  }, []);
}
