import { useEffect } from "react";

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/pyodide-sw.js");
  } catch {
    // Registration failed — silently ignore
  }
}

export function useServiceWorkerRegistration(): void {
  useEffect(() => {
    registerServiceWorker();
  }, []);
}
