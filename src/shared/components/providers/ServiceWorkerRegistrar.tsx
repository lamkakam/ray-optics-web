"use client";

import { useServiceWorkerRegistration } from "@/shared/hooks/useServiceWorkerRegistration";

export default function ServiceWorkerRegistrar() {
  useServiceWorkerRegistration();
  return null;
}
