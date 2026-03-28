"use client";

import { useServiceWorkerRegistration } from "@/hooks/useServiceWorkerRegistration";

export default function ServiceWorkerRegistrar() {
  useServiceWorkerRegistration();
  return null;
}
