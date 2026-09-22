"use client";

import { useState, useCallback } from "react";
import { useStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type {
  ZernikeData,
  ZernikeOrdering,
  ZernikePupilSpace,
} from "@/features/lens-editor/types/zernikeData";
import {
  NUM_NOLL_TERMS,
  NUM_FRINGE_TERMS,
} from "@/features/lens-editor/lib/zernikeData";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { loadZernikeData } from "@/features/analysis/lib/plotFunctions";
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
  ParaxialDataModal,
  SeidelAberrModal,
  ZernikeTermsModal,
} from "@/features/lens-editor/components";
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { useImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import {
  buildDraftOpticalModel,
  computeOpticalSystem,
  isMissingPrescriptionGlassError,
} from "@/features/lens-editor/lib/opticalSystemComputation";
import { useLensEditorWebMCP } from "@/features/lens-editor/hooks/useLensEditorWebMCP";

/** Worker readiness and error-handling dependencies for the page-level editor. */
export interface LensEditorProps {
  /** Pyodide worker proxy (undefined until ready) */
  readonly proxy: PyodideWorkerAPI | undefined;
  /** Whether Pyodide is initialised */
  readonly isReady: boolean;
  /** Called on submit or imperative focus compute error; opens page-level error modal */
  /** Forwards the failure to the shell for shared safe-message presentation. */
  readonly onError: (error?: unknown) => void;
}

/**
 * Page-level component (`"use client"`). Owns the home-view lens editor workflow: manual/import submit-compute behavior, Lens Editor config toolbar placement, Paraxial/Seidel/Zernike modal state, focus lifecycle and overlay state, and layout for LG and SM breakpoints. Calls `useScreenBreakpoint()` internally to derive `isLG`. Delegates the compute error modal to `page.tsx` via `onError`.
 * Lens-editor child components are imported through the `features/lens-editor/components` root barrel so `LensEditor` depends on the component package surface rather than individual component directories.
 * `AnalysisPlotContainer` is imported through the `features/analysis/components` root barrel for the same reason.
 *
 *
 * Successful auto-aperture updates request sequential semi-diameters alongside the analyses, validate Object/physical/Image alignment, and replace the ID-keyed cache. Successful manual updates clear it. Failed updates leave the committed model and cache unchanged.
 *
 * Imperative access to actions is via the provider hooks (`useLensEditorStore`, `useSpecsConfiguratorStore`, `useAnalysisPlotStore`, `useAnalysisDataStore`, `useLensLayoutImageStore`) and then `store.getState()`.
 *
 * ## Layout
 *
 * ### LG (`isLG === true`)
 * - Controls row: always rendered so config actions are available before any optical system has been computed. Row order is `Update System`, `Load Config`, `Import a file from Photons to Photos`, `Download Config`, then optional `Paraxial Data`, optional `3rd Order Seidel Aberr.`, and optional `Zernike Terms`; `border-b` is applied here when `firstOrderData` is undefined. The Paraxial control is guarded by `firstOrderData`, the Seidel control by `seidelData`, and the Zernike control by `committedOpticalModel`.
 * - The controls row and config toolbar stay mounted as analysis controls appear, preserving pending imports and their confirmation dialogs when the first results arrive.
 * - First-order chips row (border-bottom) — only rendered when `firstOrderData` is defined
 * - Split row: LensLayoutPanel (65%) | AnalysisPlotContainer (35%); the analysis panel wrapper has `overflow-hidden` (`data-testid="lg-analysis-plot-panel"`) to prevent content from bleeding over the BottomDrawer when viewport height is small
 * - BottomDrawerContainer (`draggable={true}`)
 * - ParaxialDataModal, SeidelAberrModal, ZernikeTermsModal
 *
 * ### SM (`isLG === false`)
 * - Outer scroll wrapper: `data-testid="sm-scroll-container"` with `flex-1 min-h-0 overflow-y-auto flex flex-col` — makes all content scrollable on small screens
 * - Controls section: always rendered so config actions are available before any optical system has been computed. It wraps naturally and orders controls as `Update System`, `Load Config`, `Import a file from Photons to Photos`, `Download Config`, then optional Paraxial/Seidel/Zernike buttons; first-order chips render below only when `firstOrderData` is defined
 * - `data-testid="lens-layout-container"` wrapping LensLayoutPanel
 * - `data-testid="analysis-plot-container"` wrapping AnalysisPlotContainer
 * - BottomDrawerContainer (`draggable={false}`)
 * - ParaxialDataModal, SeidelAberrModal, ZernikeTermsModal
 *
 * ## Notes
 * - `onError` delegates submit and imperative focus failures to `app/AppShell.tsx`, which owns the shared sanitized `ErrorModal`
 * - Missing prescription glasses from submit or imperative focus are shown through a local `ErrorModal` with the standard glass-validation message and do not call `onError()`
 * - `ZernikeTermsModal` receives `specsStore.getState().getFieldOptions()` / `getWavelengthOptions()` as snapshots — intentional
 * - `handleSubmit` delegates to the throwing `computeOpticalSystem` core, so submit-time first-order, Seidel, plot, layout, selection, specs, model, and auto-aperture updates use one complete commit pipeline shared with WebMCP.
 * - `handleSubmit` commits plot-store-backed results through `commitAnalysisPlotResult(...)`, including diffraction MTF data; `surfaceBySurface3rdOrder` is ignored by that helper because it derives from the same complete cached Seidel payload committed separately.
 * - Zernike modal requests cache the complete payload by model instance, aim point, field, wavelength, ordering, term count, and pupil space. The final physical surface's image-gap thickness determines whether Exit is available using RayOptics' `abs(thickness) > 1e8` infinite-conjugate rule.
 * - `handleSubmit` passes `theme === "dark"` into `proxy.plotLensLayout(...)`; the worker then derives whether to enable wavelength ray-fan overlays from any `surface.diffractiveElement.diffractionGrating`
 * - Submit flows always store typed analysis chart data via the matching analysis-plot store setter; the legacy analysis PNG result path is no longer used
 * - Example-system loading now lives on `/example-systems`; LensEditor no longer renders the old example dropdown or overwrite confirmation.
 * - `useLensEditorWebMCP(...)` supplies all twenty-four imperative descriptors: five prescription tools, four System Specs tools, recomputation, focusing, and thirteen committed-analysis getters. Analysis tools share chart/dialog caches and capture current sampling and image-reference settings without changing displayed data, selections, loading flags, or preferences. Descriptor executions observe newly loaded catalogs and current worker/theme/store snapshots through the latest-descriptor ref; focus execution also drives this component's focus overlay and computation loading lifecycle. Unsupported browsers are skipped and each registration is aborted on cleanup.
 */
export function LensEditor({ proxy, isReady, onError }: LensEditorProps) {
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

  const selectedFieldIndex = useStore(
    analysisPlotStore,
    (s) => s.selectedFieldIndex,
  );
  const selectedWavelengthIndex = useStore(
    analysisPlotStore,
    (s) => s.selectedWavelengthIndex,
  );
  const selectedPlotType = useStore(
    analysisPlotStore,
    (s) => s.selectedPlotType,
  );

  const layoutImage = useStore(lensLayoutImageStore, (s) => s.layoutImage);
  const layoutLoading = useStore(lensLayoutImageStore, (s) => s.layoutLoading);
  const firstOrderData = useStore(analysisDataStore, (s) => s.firstOrderData);
  const seidelData = useStore(analysisDataStore, (s) => s.seidelData);
  const committedOpticalModel = useStore(
    lensStore,
    (s) => s.committedOpticalModel,
  );
  /** Whether an Update System computation is in progress. */
  const [computing, setComputing] = useState(false);
  /** Whether a focus request, including its final Update System computation, is in progress. */
  const [focusing, setFocusing] = useState(false);
  /** Missing-glass validation error displayed by the editor-local error modal. */
  const [validationErrorMessage, setValidationErrorMessage] = useState<
    string | undefined
  >();
  /** Visibility of the read-only paraxial first-order data modal. */
  const [paraxialDataModalOpen, setParaxialDataModalOpen] = useState(false);
  /** Visibility of the third-order Seidel modal. */
  const [seidelModalOpen, setSeidelModalOpen] = useState(false);
  /** Visibility of the Zernike terms modal. */
  const [zernikeModalOpen, setZernikeModalOpen] = useState(false);

  /** Starts the shared Update System loading lifecycle. */
  const handleComputationStart = useCallback(() => {
    setComputing(true);
    lensLayoutImageStore.getState().setLayoutLoading(true);
    analysisPlotStore.getState().setPlotLoading(true);
  }, [analysisPlotStore, lensLayoutImageStore]);

  /** Clears the shared Update System loading lifecycle. */
  const handleComputationEnd = useCallback(() => {
    setComputing(false);
    lensLayoutImageStore.getState().setLayoutLoading(false);
    analysisPlotStore.getState().setPlotLoading(false);
  }, [analysisPlotStore, lensLayoutImageStore]);

  /** Starts the Lens Editor-level focus lifecycle for both UI and WebMCP calls. */
  const handleFocusStart = useCallback(() => {
    setFocusing(true);
  }, []);

  /** Clears the Lens Editor-level focus lifecycle for both UI and WebMCP calls. */
  const handleFocusEnd = useCallback(() => {
    setFocusing(false);
  }, []);

  /** Routes imperative focus failures through the same editor error surfaces as submit. */
  const handleWebMcpError = useCallback(
    (error: unknown) => {
      if (isMissingPrescriptionGlassError(error)) {
        setValidationErrorMessage(error.message);
      } else {
        onError(error);
      }
    },
    [onError],
  );

  useLensEditorWebMCP({
    lensStore,
    specsStore,
    analysisPlotStore,
    analysisDataStore,
    lensLayoutImageStore,
    lookupMaps,
    proxy,
    isDark: theme === "dark",
    imagePoint,
    onFocusStart: handleFocusStart,
    onFocusEnd: handleFocusEnd,
    onComputationStart: handleComputationStart,
    onComputationEnd: handleComputationEnd,
    onError: handleWebMcpError,
  });

  /** Fetches Zernike coefficients for the committed model and current image reference. */
  const handleFetchZernikeData = useCallback(
    async (
      fieldIndex: number,
      wvlIndex: number,
      ordering: ZernikeOrdering,
      pupilSpace: ZernikePupilSpace,
    ): Promise<ZernikeData> => {
      if (!proxy) throw new Error("Pyodide not ready");
      const committedOpticalModel = lensStore.getState().committedOpticalModel;
      if (!committedOpticalModel)
        throw new Error("No optical model computed yet");
      const numTerms = ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
      return loadZernikeData({
        proxy,
        model: committedOpticalModel,
        fieldIndex,
        wavelengthIndex: wvlIndex,
        imagePoint,
        numTerms,
        ordering,
        pupilSpace,
      });
    },
    [proxy, lensStore, imagePoint],
  );

  /**
   * Validates and computes the current optical system, then atomically commits its
   * model, layout, first-order, Seidel, plot, and auto-aperture results.
   */
  const handleSubmit = useCallback(async () => {
    if (!proxy) return;

    handleComputationStart();

    try {
      await computeOpticalSystem({
        proxy,
        lensStore,
        specsStore,
        analysisPlotStore,
        analysisDataStore,
        lensLayoutImageStore,
        lookupMaps,
        selectedFieldIndex,
        selectedWavelengthIndex,
        selectedPlotType,
        isDark: theme === "dark",
        imagePoint,
      });
    } catch (err: unknown) {
      if (isMissingPrescriptionGlassError(err)) {
        setValidationErrorMessage(err.message);
      } else {
        onError(err);
      }
    } finally {
      handleComputationEnd();
    }
  }, [
    proxy,
    specsStore,
    lensStore,
    analysisPlotStore,
    lensLayoutImageStore,
    analysisDataStore,
    selectedFieldIndex,
    selectedWavelengthIndex,
    selectedPlotType,
    onError,
    theme,
    imagePoint,
    lookupMaps,
    handleComputationStart,
    handleComputationEnd,
  ]);

  /** Builds the current optical-model snapshot from the provider-backed stores. */
  const getOpticalModel = useCallback((): OpticalModel => {
    return buildDraftOpticalModel(lensStore, specsStore).model;
  }, [specsStore, lensStore]);

  /** Loads a validated imported optical model into both editor stores. */
  const handleImportJson = useCallback(
    (data: OpticalModel) => {
      specsStore.getState().loadFromSpecs(data.specs);
      lensStore.getState().setRows(surfacesToGridRows(data));
      lensStore
        .getState()
        .setAutoAperture(data.setAutoAperture === "autoAperture");
    },
    [specsStore, lensStore],
  );

  const seidelButton = seidelData && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip
        text="View 3rd-order Seidel aberration coefficients"
        position="bottom"
        noTouch
      >
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

  const paraxialDataButton = firstOrderData && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View paraxial first-order data" position="bottom" noTouch>
        <Button
          variant="secondary"
          aria-label="Paraxial Data"
          onClick={() => setParaxialDataModalOpen(true)}
        >
          Paraxial Data
        </Button>
      </Tooltip>
    </div>
  );

  const zernikeButton = committedOpticalModel && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip
        text="View Zernike polynomial coefficients"
        position="bottom"
        noTouch
      >
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

  /** Config toolbar bound to import, export, and compute operations. */
  const configToolbar = (
    <LensEditorConfigToolbar
      getOpticalModel={getOpticalModel}
      onImportJson={handleImportJson}
      onUpdateSystem={handleSubmit}
      isUpdateSystemDisabled={!isReady || computing || focusing}
    />
  );
  const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

  const lensLayoutPanel = (
    <LensLayoutPanel imageBase64={layoutImage} loading={layoutLoading} />
  );

  const analysisPlotContainer = (
    <AnalysisPlotContainer proxy={proxy} onError={onError} autoHeight={!isLG} />
  );

  const bottomDrawer = (
    <BottomDrawerContainer
      getOpticalModel={getOpticalModel}
      onUpdateSystem={handleSubmit}
      isReady={isReady}
      computing={computing}
      focusing={focusing}
      onFocusStart={handleFocusStart}
      onFocusEnd={handleFocusEnd}
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

  const paraxialDataModal = firstOrderData && (
    <ParaxialDataModal
      isOpen={paraxialDataModalOpen}
      data={firstOrderData}
      onClose={() => setParaxialDataModalOpen(false)}
    />
  );

  const zernikeModal = committedOpticalModel && (
    <ZernikeTermsModal
      isOpen={zernikeModalOpen}
      fieldOptions={specsStore.getState().getFieldOptions()}
      wavelengthOptions={specsStore.getState().getWavelengthOptions()}
      isFiniteImageSpace={
        Math.abs(committedOpticalModel.surfaces.at(-1)?.thickness ?? 0) <= 1e8
      }
      onFetchData={handleFetchZernikeData}
      onClose={() => setZernikeModalOpen(false)}
    />
  );

  const lgContent = (
    <>
      <div
        className={`flex shrink-0 items-center gap-4 px-4 py-2${!firstOrderData ? " border-b border-gray-200 dark:border-gray-700" : ""}`}
      >
        {configToolbar}
        {paraxialDataButton}
        {seidelButton}
        {zernikeButton}
      </div>
      {firstOrderData && (
        <div className="flex shrink-0 gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          {firstOrderChips}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 w-[65%]">
          {lensLayoutPanel}
        </div>
        <div
          data-testid="lg-analysis-plot-panel"
          className="flex flex-1 flex-col min-h-0 overflow-hidden p-4 border-l border-gray-200 dark:border-gray-700 w-[35%]"
        >
          {analysisPlotContainer}
        </div>
      </div>

      {bottomDrawer}
      {paraxialDataModal}
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
    <div
      data-testid="sm-scroll-container"
      className="flex-1 min-h-0 overflow-y-auto flex flex-col"
    >
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">{configToolbar}</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {paraxialDataButton}
          {seidelButton}
          {zernikeButton}
        </div>
        {firstOrderData && (
          <div className="flex flex-wrap gap-2 mt-2">{firstOrderChips}</div>
        )}
      </div>
      <div data-testid="lens-layout-container" className="w-full px-2 py-3">
        {lensLayoutPanel}
      </div>
      <div
        data-testid="analysis-plot-container"
        className="w-full px-2 py-3 border-t border-gray-200 dark:border-gray-700"
      >
        {analysisPlotContainer}
      </div>
      {bottomDrawer}
      {paraxialDataModal}
      {seidelModal}
      {zernikeModal}
      <ErrorModal
        isOpen={validationErrorMessage !== undefined}
        message={validationErrorMessage}
        onClose={() => setValidationErrorMessage(undefined)}
      />
    </div>
  );

  return (
    <>
      {isLG ? lgContent : smContent}
      {focusing && (
        <LoadingOverlay
          title="Focusing…"
          contents="Optimizing image plane position…"
        />
      )}
    </>
  );
}
