"use client";

import { useAppShell } from "@/app/AppShellContext";
import { ExampleSystemsPage } from "@/features/example-systems/ExampleSystemsPage";

export default function ExampleSystemsRoute() {
  const { proxy, openErrorModal } = useAppShell();

  return (
    <ExampleSystemsPage
      proxy={proxy}
      onError={openErrorModal}
    />
  );
}
