"use client";

import { useAppShell } from "@/app/AppShellContext";
import { OptimizationPage } from "@/features/optimization/OptimizationPage";

export default function OptimizationRoutePage() {
  const { proxy, isReady, openErrorModal } = useAppShell();

  return (
    <OptimizationPage
      proxy={proxy}
      isReady={isReady}
      onError={openErrorModal}
    />
  );
}
