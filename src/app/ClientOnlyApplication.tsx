"use client";

import type React from "react";
import dynamic from "next/dynamic";

/** The interactive application, omitted from server rendering and static HTML. */
const ClientApplication = dynamic(() => import("@/app/ClientApplication"), {
  ssr: false,
  loading: () => undefined,
});

/**
 * Establishes the no-SSR boundary around the complete interactive application.
 *
 * @remarks
 * Next.js prerenders ordinary Client Components. Keeping `next/dynamic` with
 * `ssr: false` inside this small Client Component leaves only the root document
 * and Next.js bootstrap shell in server-generated HTML. The application,
 * providers, worker integration, service-worker registrar, and routed content
 * mount in the browser after JavaScript loads.
 */
export default function ClientOnlyApplication({ children }: ClientOnlyApplicationProps) {
  return <ClientApplication>{children}</ClientApplication>;
}
/** Routed content deferred until the interactive application mounts. */
interface ClientOnlyApplicationProps {
  readonly children: React.ReactNode;
}
