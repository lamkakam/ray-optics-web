/**
 * Successful auto-aperture updates request sequential semi-diameters alongside the analyses, validate Object/physical/Image alignment, and replace the ID-keyed cache. Successful manual updates clear it. Failed updates leave the committed model and cache unchanged.
 *
 * @remarks
 * ## State
 * | State | Type | Description |
 * |-------|------|-------------|
 * | `computing` | `boolean` | Submit in-progress flag |
 * | `validationErrorMessage` | `string \| undefined` | Lens-prescription glass validation error shown in a local `ErrorModal` |
 * | `seidelModalOpen` | `boolean` | Seidel modal visibility |
 * | `zernikeModalOpen` | `boolean` | Zernike modal visibility |
 *
 * ## Derived Store State
 * Read reactively via `useStore` / `useLensEditorStore`:
 * - From `useAnalysisPlotStore()`: `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`
 * - From `useLensLayoutImageStore()`: `layoutImage`, `layoutLoading`
 * - From `useAnalysisDataStore()`: `firstOrderData`, `seidelData`
 * - From `useLensEditorStore()`: `committedOpticalModel`
 * - From `useTheme()`: `theme`
 * - From `useImagePoint()`: `imagePoint`
 * - From `useGlassCatalogs()`: `lookupMaps`
 * - `hasAnalysisControls`: true when at least one analysis control or chip can render (`seidelData`, `committedOpticalModel`, or `firstOrderData`)
 *
 * Imperative access to actions is via the provider hooks (`useLensEditorStore`, `useSpecsConfiguratorStore`, `useAnalysisPlotStore`, `useAnalysisDataStore`, `useLensLayoutImageStore`) and then `store.getState()`.
 *
 * ## Callbacks
 * - `handleSubmit` — builds `OpticalModel`, validates object/surface glasses against the app-wide glass lookup map before setting loading state or calling the worker, derives `isDark` from `theme === "dark"`, clamps field/wavelength indices, loads first-order/layout/analysis/seidel data in parallel, passes the app-wide `imagePoint` into OPD-related analysis loading, updates committed state; calls `onError()` on compute failure
 * - `handleFetchZernikeData` — fetches Zernike coefficients for `ZernikeTermsModal` from the committed optical model and passes the app-wide `imagePoint`; ordering remains a frontend selection and is converted to explicit terms by the worker
 * - Zernike payload/order types are imported from `features/lens-editor/types/zernikeData`; Zernike term-count constants are imported from `features/lens-editor/lib/zernikeData`
 * - `getOpticalModel` — builds the current `OpticalModel` snapshot from the provider-backed stores
 * - `handleImportJson` — loads an imported `OpticalModel` into the specs and lens-editor stores
 * - `configToolbar` — `LensEditorConfigToolbar` bound to `getOpticalModel`, `handleImportJson`, `handleSubmit`, and disabled when `!isReady || computing`; the toolbar owns both JSON config import and Photons to Photos TXT import before delegating validated models to `handleImportJson`
 *
 * ## Layout
 *
 * ### LG (`isLG === true`)
 * - Controls row: always rendered so config actions are available before any optical system has been computed. Row order is `Update System`, `Load Config`, `Import a file from Photons to Photos`, `Download Config`, then optional `3rd Order Seidel Aberr.` and optional `Zernike Terms`; `border-b` is applied here when `firstOrderData` is undefined. `seidelButton` is guarded by `seidelData`; `zernikeButton` is guarded by `committedOpticalModel` (not `seidelData`)
 * - First-order chips row (border-bottom) — only rendered when `firstOrderData` is defined
 * - Split row: LensLayoutPanel (65%) | AnalysisPlotContainer (35%); the analysis panel wrapper has `overflow-hidden` (`data-testid="lg-analysis-plot-panel"`) to prevent content from bleeding over the BottomDrawer when viewport height is small
 * - BottomDrawerContainer (`draggable={true}`)
 * - SeidelAberrModal, ZernikeTermsModal
 *
 * ### SM (`isLG === false`)
 * - Outer scroll wrapper: `data-testid="sm-scroll-container"` with `flex-1 min-h-0 overflow-y-auto flex flex-col` — makes all content scrollable on small screens
 * - Controls section: always rendered so config actions are available before any optical system has been computed. It wraps naturally and orders controls as `Update System`, `Load Config`, `Import a file from Photons to Photos`, `Download Config`, then optional Seidel/Zernike buttons; first-order chips render below only when `firstOrderData` is defined
 * - `data-testid="lens-layout-container"` wrapping LensLayoutPanel
 * - `data-testid="analysis-plot-container"` wrapping AnalysisPlotContainer
 * - BottomDrawerContainer (`draggable={false}`)
 * - SeidelAberrModal, ZernikeTermsModal
 *
 * ## Notes
 * - `onError` delegates compute failures to `app/AppShell.tsx`, which owns the shared generic `ErrorModal`
 * - Missing prescription glasses are shown through a local `ErrorModal` with the standard glass-validation message and do not call `onError()`
 * - `ZernikeTermsModal` receives `specsStore.getState().getFieldOptions()` / `getWavelengthOptions()` as snapshots — intentional
 * - `handleSubmit` uses `loadAnalysisPlot(...)` from `features/analysis/lib/plotFunctions.ts`, so submit-time analysis updates use the same worker-path rules as `AnalysisPlotContainer.tsx`
 * - `handleSubmit` commits plot-store-backed results through `commitAnalysisPlotResult(...)`, including diffraction MTF data; `surfaceBySurface3rdOrder` is ignored by that helper because full Seidel data is committed separately from `proxy.get3rdOrderSeidelData(...)`
 * - `handleSubmit` passes `theme === "dark"` into `proxy.plotLensLayout(...)`; the worker then derives whether to enable wavelength ray-fan overlays from any `surface.diffractionGrating`
 * - Submit flows always store typed analysis chart data via the matching analysis-plot store setter; the legacy analysis PNG result path is no longer used
 * - Example-system loading now lives on `/example-systems`; LensEditor no longer renders the old example dropdown or overwrite confirmation.
 */
"use client";

import React, { useState, useCallback } from "react";
import { useStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import { NUM_NOLL_TERMS, NUM_FRINGE_TERMS } from "@/features/lens-editor/lib/zernikeData";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { formatMissingGlassMessage, getMissingPrescriptionGlasses } from "@/shared/lib/lens-prescription-grid/lib/glassValidation";
import { commitAnalysisPlotResult, loadAnalysisPlot } from "@/features/analysis/lib/plotFunctions";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { useAnalysisDataStore } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { useLensLayoutImageStore } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { AnalysisPlotContainer } from "@/features/analysis/components";
import {
  BottomDrawerContainer,
  FirstOrderChips,
  LensEditorConfigToolbar,
  LensLayoutPanel,
  SeidelAberrModal,
  ZernikeTermsModal,
} from "@/features/lens-editor/components";
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { useImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { mapPhysicalSurfaceSemiDiameters } from "@/features/lens-editor/lib/autoSemiDiameters";

export interface LensEditorProps {
  /** Pyodide worker proxy (undefined until ready) */
  readonly proxy: PyodideWorkerAPI | undefined;
  /** Whether Pyodide is initialised */
  readonly isReady: boolean;
  /** Called on submit compute error; opens page-level error modal */
  readonly onError: () => void;
}

/**
 * Page-level component (`"use client"`). Owns the home-view lens editor workflow: manual/import submit-compute behavior, Lens Editor config toolbar placement, Seidel/Zernike modal state, and layout for LG and SM breakpoints. Calls `useScreenBreakpoint()` internally to derive `isLG`. Delegates the compute error modal to `page.tsx` via `onError`.
 * Lens-editor child components are imported through the `features/lens-editor/components` root barrel so `LensEditor` depends on the component package surface rather than individual component directories.
 * `AnalysisPlotContainer` is imported through the `features/analysis/components` root barrel for the same reason.
 */
export function LensEditor({
  proxy,
  isReady,
  onError,
}: LensEditorProps) {
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";
  const { theme } = useTheme();
  const { imagePoint } = useImagePoint();
  const { lookupMaps } = useGlassCatalogs();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const analysisPlotStore = useAnalysisPlotStore();
  const analysisDataStore = useAnalysisDataStore();
  const lensLayoutImageStore = useLensLayoutImageStore();

  const selectedFieldIndex = useStore(analysisPlotStore, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(analysisPlotStore, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(analysisPlotStore, (s) => s.selectedPlotType);

  const layoutImage = useStore(lensLayoutImageStore, (s) => s.layoutImage);
  const layoutLoading = useStore(lensLayoutImageStore, (s) => s.layoutLoading);
  const firstOrderData = useStore(analysisDataStore, (s) => s.firstOrderData);
  const seidelData = useStore(analysisDataStore, (s) => s.seidelData);
  const committedOpticalModel = useStore(lensStore, (s) => s.committedOpticalModel);
  const [computing, setComputing] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string | undefined>();
  const [seidelModalOpen, setSeidelModalOpen] = useState(false);
  const [zernikeModalOpen, setZernikeModalOpen] = useState(false);

  const handleFetchZernikeData = useCallback(
    async (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering): Promise<ZernikeData> => {
      if (!proxy) throw new Error("Pyodide not ready");
      const committedOpticalModel = lensStore.getState().committedOpticalModel;
      if (!committedOpticalModel) throw new Error("No optical model computed yet");
      const numTerms = ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
      return proxy.getZernikeCoefficients(committedOpticalModel, fieldIndex, wvlIndex, imagePoint, numTerms, ordering);
    },
    [proxy, lensStore, imagePoint]
  );

  const handleSubmit = useCallback(async () => {
    if (!proxy) return;

    const autoAperture = lensStore.getState().autoAperture;
    const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
    const specs = specsStore.getState().toOpticalSpecs();
    const submittedRows = lensStore.getState().rows;
    const surfacesData = gridRowsToSurfaces(submittedRows);
    const model: OpticalModel = { setAutoAperture, specs, ...surfacesData };
    const missingGlassMessage = formatMissingGlassMessage(getMissingPrescriptionGlasses(model, lookupMaps));
    if (missingGlassMessage !== undefined) {
      setValidationErrorMessage(missingGlassMessage);
      return;
    }
    const isDark = theme === "dark";

    setComputing(true);
    lensLayoutImageStore.getState().setLayoutLoading(true);
    analysisPlotStore.getState().setPlotLoading(true);

    try {
      const clampedFieldIndex = specsStore.getState().clampFieldIndex(selectedFieldIndex, specs);
      const clampedWavelengthIndex = specsStore.getState().clampWavelengthIndex(selectedWavelengthIndex, specs);
      analysisPlotStore.getState().setSelectedFieldIndex(clampedFieldIndex, specs.field.fields.length);
      analysisPlotStore.getState().setSelectedWavelengthIndex(clampedWavelengthIndex, specs.wavelengths.weights.length);

      const [fod, layout, plotResult, seidel, sequentialSemiDiameters] = await Promise.all([
        proxy.getFirstOrderData(model),
        proxy.plotLensLayout(model, isDark),
        loadAnalysisPlot({
          plotType: selectedPlotType,
          proxy,
          model,
          fieldIndex: clampedFieldIndex,
          wavelengthIndex: clampedWavelengthIndex,
          imagePoint,
        }),
        proxy.get3rdOrderSeidelData(model),
        autoAperture ? proxy.getSurfaceSemiDiameters(model) : Promise.resolve(undefined),
      ]);

      const autoSemiDiameters = sequentialSemiDiameters === undefined
        ? undefined
        : mapPhysicalSurfaceSemiDiameters(submittedRows, sequentialSemiDiameters);

      analysisDataStore.getState().setFirstOrderData(fod);
      lensLayoutImageStore.getState().setLayoutImage(layout);
      commitAnalysisPlotResult(plotResult, analysisPlotStore);
      analysisDataStore.getState().setSeidelData(seidel);
      specsStore.getState().setCommittedSpecs(specs);
      lensStore.getState().setCommittedOpticalModel(model);
      if (autoSemiDiameters === undefined) {
        lensStore.getState().clearAutoSemiDiameters();
      } else {
        lensStore.getState().setAutoSemiDiameters(autoSemiDiameters);
      }
    } catch (err) {
      console.log("Update System failed:", err);
      onError();
    } finally {
      setComputing(false);
      lensLayoutImageStore.getState().setLayoutLoading(false);
      analysisPlotStore.getState().setPlotLoading(false);
    }
  }, [proxy, specsStore, lensStore, analysisPlotStore, lensLayoutImageStore, analysisDataStore, selectedFieldIndex, selectedWavelengthIndex, selectedPlotType, onError, theme, imagePoint, lookupMaps]);

  const getOpticalModel = useCallback((): OpticalModel => {
    const autoAperture = lensStore.getState().autoAperture;
    const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
    const specs = specsStore.getState().toOpticalSpecs();
    const surfaces = gridRowsToSurfaces(lensStore.getState().rows);
    return { setAutoAperture, specs, ...surfaces };
  }, [specsStore, lensStore]);

  const handleImportJson = useCallback((data: OpticalModel) => {
    specsStore.getState().loadFromSpecs(data.specs);
    lensStore.getState().setRows(surfacesToGridRows(data));
    lensStore.getState().setAutoAperture(data.setAutoAperture === "autoAperture");
  }, [specsStore, lensStore]);

  const seidelButton = seidelData && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View 3rd-order Seidel aberration coefficients" position="bottom" noTouch>
        <Button
          variant="secondary"
          aria-label="3rd Order Seidel Aberrations"
          onClick={() => setSeidelModalOpen(true)}
        >
          3rd Order Seidel Aberr.
        </Button>
      </Tooltip>
    </div>
  );

  const zernikeButton = committedOpticalModel && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View Zernike polynomial coefficients" position="bottom" noTouch>
        <Button
          variant="secondary"
          aria-label="Zernike Terms"
          onClick={() => setZernikeModalOpen(true)}
        >
          Zernike Terms
        </Button>
      </Tooltip>
    </div>
  );

  const configToolbar = (
    <LensEditorConfigToolbar
      getOpticalModel={getOpticalModel}
      onImportJson={handleImportJson}
      onUpdateSystem={handleSubmit}
      isUpdateSystemDisabled={!isReady || computing}
    />
  );
  const hasAnalysisControls = Boolean(seidelData || committedOpticalModel);
  const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

  const lensLayoutPanel = (
    <LensLayoutPanel imageBase64={layoutImage} loading={layoutLoading} />
  );

  const analysisPlotContainer = (
    <AnalysisPlotContainer
      proxy={proxy}
      onError={onError}
      autoHeight={!isLG}
    />
  );

  const bottomDrawer = (
    <BottomDrawerContainer
      getOpticalModel={getOpticalModel}
      onUpdateSystem={handleSubmit}
      isReady={isReady}
      computing={computing}
      proxy={proxy}
      onError={onError}
      draggable={isLG}
    />
  );

  const seidelModal = seidelData && (
    <SeidelAberrModal
      isOpen={seidelModalOpen}
      data={seidelData}
      onClose={() => setSeidelModalOpen(false)}
    />
  );

  const zernikeModal = committedOpticalModel && (
    <ZernikeTermsModal
      isOpen={zernikeModalOpen}
      fieldOptions={specsStore.getState().getFieldOptions()}
      wavelengthOptions={specsStore.getState().getWavelengthOptions()}
      onFetchData={handleFetchZernikeData}
      onClose={() => setZernikeModalOpen(false)}
    />
  );

  const lgContent = (
    <>
      {hasAnalysisControls && (
        <div className={`flex shrink-0 items-center gap-4 px-4 py-2${!firstOrderData ? " border-b border-gray-200 dark:border-gray-700" : ""}`}>
          {configToolbar}
          {seidelButton}
          {zernikeButton}
        </div>
      )}
      {!hasAnalysisControls && (
        <div className={`flex shrink-0 items-center gap-4 px-4 py-2${!firstOrderData ? " border-b border-gray-200 dark:border-gray-700" : ""}`}>
          {configToolbar}
        </div>
      )}
      {firstOrderData && (
        <div className="flex shrink-0 gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          {firstOrderChips}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 w-[65%]">
          {lensLayoutPanel}
        </div>
        <div data-testid="lg-analysis-plot-panel" className="flex flex-1 flex-col min-h-0 overflow-hidden p-4 border-l border-gray-200 dark:border-gray-700 w-[35%]">
          {analysisPlotContainer}
        </div>
      </div>

      {bottomDrawer}
      {seidelModal}
      {zernikeModal}
      <ErrorModal
        isOpen={validationErrorMessage !== undefined}
        message={validationErrorMessage}
        onClose={() => setValidationErrorMessage(undefined)}
      />
    </>
  );

  const smContent = (
    <div data-testid="sm-scroll-container" className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {configToolbar}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {seidelButton}
          {zernikeButton}
        </div>
        {firstOrderData && (
          <div className="flex flex-wrap gap-2 mt-2">
            {firstOrderChips}
          </div>
        )}
      </div>
      <div data-testid="lens-layout-container" className="w-full px-2 py-3">
        {lensLayoutPanel}
      </div>
      <div data-testid="analysis-plot-container" className="w-full px-2 py-3 border-t border-gray-200 dark:border-gray-700">
        {analysisPlotContainer}
      </div>
      {bottomDrawer}
      {seidelModal}
      {zernikeModal}
      <ErrorModal
        isOpen={validationErrorMessage !== undefined}
        message={validationErrorMessage}
        onClose={() => setValidationErrorMessage(undefined)}
      />
    </div>
  );

  return isLG ? lgContent : smContent;
}
