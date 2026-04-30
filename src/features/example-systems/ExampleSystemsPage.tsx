"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { ExampleSystems } from "@/shared/lib/data/exampleSystems";
import { Button } from "@/shared/components/primitives/Button";
import { DescriptionContainer } from "@/shared/components/primitives/DescriptionContainer";
import { Header } from "@/shared/components/primitives/Header";
import { MenuContainer } from "@/shared/components/primitives/MenuContainer";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { ConfirmOverwriteModal } from "@/shared/components/primitives/ConfirmOverwriteModal";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { useAnalysisDataStore } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { useLensLayoutImageStore } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { applyExampleSystem } from "@/features/example-systems/lib/applyExampleSystem";
import { getExampleSystemDescription, stripExamplePrefix } from "@/features/example-systems/lib/exampleSystemDescriptions";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

interface ExampleSystemsPageProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly onError: () => void;
}

export function ExampleSystemsPage({ proxy, onError }: ExampleSystemsPageProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const screenSize = useScreenBreakpoint();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const analysisPlotStore = useAnalysisPlotStore();
  const analysisDataStore = useAnalysisDataStore();
  const lensLayoutImageStore = useLensLayoutImageStore();
  const [selectedExampleKey, setSelectedExampleKey] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const exampleButtonRefs = useRef<Record<string, HTMLButtonElement | undefined>>({});
  const exampleKeys = useMemo(() => Object.keys(ExampleSystems), []);
  const selectedDescription = selectedExampleKey === undefined
    ? <Paragraph variant="body">Select an example system to review its source and apply it to the Lens Editor.</Paragraph>
    : getExampleSystemDescription(selectedExampleKey);
  const isLargeScreen = screenSize === "screenLG";

  useEffect(() => {
    if (selectedExampleKey === undefined) {
      return;
    }

    exampleButtonRefs.current[selectedExampleKey]?.focus();
  }, [selectedExampleKey]);

  const handleExampleButtonRef = useCallback((key: string, button: HTMLButtonElement | null) => {
    if (button === null) {
      delete exampleButtonRefs.current[key];
      return;
    }

    exampleButtonRefs.current[key] = button;
  }, []);

  const handleSelectExample = useCallback((key: string) => {
    setSelectedExampleKey(key);
  }, []);

  const handleMenuKeyDown = useCallback((event: KeyboardEvent<HTMLMenuElement>) => {
    if (event.key !== "Enter" || selectedExampleKey === undefined || applying) {
      return;
    }

    event.preventDefault();
    setConfirmOpen(true);
  }, [applying, selectedExampleKey]);

  const handleConfirm = useCallback(async () => {
    if (selectedExampleKey === undefined || applying) {
      return;
    }

    const model = ExampleSystems[selectedExampleKey];
    if (model === undefined) {
      return;
    }

    setApplying(true);
    setConfirmOpen(false);
    try {
      await applyExampleSystem({
        model,
        proxy,
        isDark: theme === "dark",
        lensStore,
        specsStore,
        analysisPlotStore,
        analysisDataStore,
        lensLayoutImageStore,
      });
      router.push("/");
    } catch (error) {
      console.log("Apply example system failed:", error);
      onError();
    } finally {
      setApplying(false);
    }
  }, [
    analysisDataStore,
    analysisPlotStore,
    applying,
    lensLayoutImageStore,
    lensStore,
    onError,
    proxy,
    router,
    selectedExampleKey,
    specsStore,
    theme,
  ]);

  const applyButton = (
    <Button
      variant="primary"
      aria-label="Apply"
      disabled={selectedExampleKey === undefined || applying}
      onClick={() => setConfirmOpen(true)}
    >
      Apply
    </Button>
  );

  const menuItems = exampleKeys.map((key) => {
    const name = stripExamplePrefix(key);
    const selected = key === selectedExampleKey;
    return (
      <li key={key}>
        <button
          ref={(button) => handleExampleButtonRef(key, button)}
          type="button"
          aria-label={name}
          aria-pressed={selected}
          className={clsx(
            "w-full rounded-md px-3 py-2 text-left text-sm transition",
            selected
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
          )}
          onClick={() => handleSelectExample(key)}
          onFocus={() => handleSelectExample(key)}
        >
          {name}
        </button>
      </li>
    );
  });

  const confirmModal = (
    <ConfirmOverwriteModal
      isOpen={confirmOpen}
      onConfirm={() => void handleConfirm()}
      onCancel={() => setConfirmOpen(false)}
    />
  );

  if (!isLargeScreen) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-4">
        <div className="flex h-full w-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <Header level={2}>Example Systems</Header>
            {applyButton}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <MenuContainer
              aria-label="Example systems"
              className="w-full min-h-0 flex-1 overflow-y-auto !max-h-none"
              onKeyDown={handleMenuKeyDown}
            >
              {menuItems}
            </MenuContainer>
            <DescriptionContainer className="w-full min-h-0 flex-1 overflow-y-auto">
              {selectedDescription}
            </DescriptionContainer>
          </div>
        </div>
        {confirmModal}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
      <div className="flex w-full min-w-[calc(100vw-2rem)] flex-col gap-4">
        <Header level={2}>Example Systems</Header>
        <div className="grid w-full grid-cols-[minmax(0,calc(50vw-1.5rem))_minmax(0,calc(50vw-1.5rem))] gap-4">
          <MenuContainer
            aria-label="Example systems"
            className="h-[calc(100dvh-8rem)] w-[calc(50vw-1.5rem)] !max-h-[calc(100dvh-8rem)]"
            onKeyDown={handleMenuKeyDown}
          >
            {menuItems}
          </MenuContainer>
          <div className="flex w-[calc(50vw-1.5rem)] min-h-0 flex-col gap-4">
            <div className="flex justify-end">
              {applyButton}
            </div>
            <DescriptionContainer className="h-[50dvh] w-[calc(50vw-1.5rem)] overflow-y-auto">
              {selectedDescription}
            </DescriptionContainer>
          </div>
        </div>
      </div>
      {confirmModal}
    </div>
  );
}
