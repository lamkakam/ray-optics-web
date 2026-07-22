"use client";

import { useAppShell } from "@/app/AppShellContext";
import { ExampleSystemsPage } from "@/features/example-systems/ExampleSystemsPage";

/**
 *
 * @remarks
 * ## Behavior
 *
 * - Reads `proxy` and `openErrorModal` from `AppShellContext`.
 * - Renders `ExampleSystemsPage`.
 */
export default function ExampleSystemsRoute() {
  const { proxy, openErrorModal } = useAppShell();

  return (
    <ExampleSystemsPage
      proxy={proxy}
      onError={openErrorModal}
    />
  );
}
