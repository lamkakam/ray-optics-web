/**
# `app/example-systems/page.tsx`
*/
"use client";

import { useAppShell } from "@/app/AppShellContext";
import { ExampleSystemsPage } from "@/features/example-systems/ExampleSystemsPage";

/**
## Behavior

- Reads `proxy` and `openErrorModal` from `AppShellContext`.
- Renders `ExampleSystemsPage`.
*/
/**
Next.js App Router page for `/example-systems`.
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
