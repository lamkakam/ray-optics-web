"use client";

import { useCallback, useMemo, useState } from "react";
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

interface ExampleSystemsPageProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly onError: () => void;
}

export function ExampleSystemsPage({ proxy, onError }: ExampleSystemsPageProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const analysisPlotStore = useAnalysisPlotStore();
  const analysisDataStore = useAnalysisDataStore();
  const lensLayoutImageStore = useLensLayoutImageStore();
  const [selectedExampleKey, setSelectedExampleKey] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const exampleKeys = useMemo(() => Object.keys(ExampleSystems), []);
  const selectedDescription = selectedExampleKey === undefined
    ? "Select an example system to review its source and apply it to the Lens Editor."
    : getExampleSystemDescription(selectedExampleKey);

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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Header level={2}>Example Systems</Header>
        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <MenuContainer aria-label="Example systems">
            {exampleKeys.map((key) => {
              const name = stripExamplePrefix(key);
              const selected = key === selectedExampleKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-label={name}
                    aria-pressed={selected}
                    className={clsx(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition",
                      selected
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
                    )}
                    onClick={() => setSelectedExampleKey(key)}
                  >
                    {name}
                  </button>
                </li>
              );
            })}
          </MenuContainer>
          <div className="flex min-h-[20rem] flex-col gap-4">
            <div className="flex justify-end">
              <Button
                variant="primary"
                aria-label="Apply"
                disabled={selectedExampleKey === undefined || applying}
                onClick={() => setConfirmOpen(true)}
              >
                Apply
              </Button>
            </div>
            <DescriptionContainer className="flex-1">
              <Paragraph variant="body">{selectedDescription}</Paragraph>
            </DescriptionContainer>
          </div>
        </div>
      </div>
      <ConfirmOverwriteModal
        isOpen={confirmOpen}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
