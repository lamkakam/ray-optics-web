"use client";
import {
  getPyodideErrorMessage,
  OPTIMIZATION_DID_NOT_CONVERGE_MESSAGE,
} from "@/shared/lib/pyodideErrors";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { proxy as comlinkProxy } from "comlink";
import { useStore } from "zustand";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useOptimizationStore } from "./providers/OptimizationStoreProvider";
import {
  BottomDrawerContainer,
  OptimizationActionBar,
  OptimizationApplyConfirmModal,
  OptimizationEvaluationPanel,
  OptimizationInspectionModals,
  OptimizationProgressModal,
  AsphereVarModal,
  GlassVariableModal,
  RadiusModeModal,
  ThicknessModeModal,
  TiltDecenterVarModal,
} from "./components";
import { getOptimizationAlgorithmCapabilities } from "./lib/methodCapabilities";
import { applyOptimizationModelToEditor } from "./lib/applyOptimizationModelToEditor";
import { hasNonZeroOptimizationContribution } from "./stores/optimizationStore";
import {
  createEvaluationRow,
  type RadiusRow,
  type WeightRow,
} from "./lib/optimizationViewModels";
import {
  surfacesToGridRows,
  gridRowsToSurfaces,
} from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import {
  formatMissingGlassMessage,
  getMissingPrescriptionGlasses,
} from "@/shared/lib/lens-prescription-grid/lib/glassValidation";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type {
  OpticalModel,
  OpticalSpecs,
} from "@/shared/lib/types/opticalModel";
import type {
  OptimizationConfig,
  OptimizationProgressEntry,
  OptimizationReport,
  OptimizationRunConfig,
  OptimizationRunReport,
} from "./types/optimizationWorkerTypes";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useDebouncedCallback } from "@/shared/hooks/useDebouncedCallback";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { useImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import { useOptimizationWebMCP } from "./hooks/useOptimizationWebMCP";
import { assertWebMcpNotCancelled } from "@/shared/lib/webMcpValidation";

interface OptimizationPageProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  /** Forwards the failure to the shell for shared safe-message presentation. */
  readonly onError: (error?: unknown) => void;
  readonly onApplyToEditor?: (model: OpticalModel) => Promise<void> | void;
}

const ZERO_WEIGHT_WARNING_MESSAGE =
  "At least one effective optimization weight must be non-zero.";
const INITIAL_GUESS_OUTSIDE_BOUNDS_MESSAGE =
  "Initial guess is outside of provided bounds";
const LG_EVALUATION_RESERVED_HEIGHT_FALLBACK = 333;
const PYODIDE_INTERRUPT_SIGNAL = 2;

function buildCurrentEditorModel(
  rows: GridRow[],
  autoAperture: boolean,
  autoSemiDiameters: Readonly<Record<string, number>>,
  specs: OpticalSpecs,
): OpticalModel {
  const effectiveRows = autoAperture
    ? rows.map((row) =>
        row.kind === "surface"
          ? {
              ...row,
              semiDiameter: autoSemiDiameters[row.id] ?? row.semiDiameter,
            }
          : row,
      )
    : rows;
  const setAutoAperture = autoAperture
    ? ("autoAperture" as const)
    : ("manualAperture" as const);
  const surfaces = gridRowsToSurfaces(effectiveRows);
  return { setAutoAperture, specs, ...surfaces };
}

/**
 * Client page component for the optimization workflow. It initializes and continuously synchronizes a page-local optimization snapshot from the editor stores, orchestrates the extracted optimization view components, calls the Pyodide worker, and applies optimized results back to the editor on confirmation.
 *
 * @remarks
 * ## Behavior
 *
 * - On page mount, initializes the optimization slice from the current editor draft only when the optimization slice does not already have a model; persisted Optimization state survives route returns.
 * - Listens to live Lens Editor and Specs store changes and calls `syncFromOpticalModel(...)` so optimization reflects the latest prescription/spec state instead of staying stale.
 * - Includes neutral field samples and their `isRelative` interpretation in the synchronization dependencies so absolute-field mode changes are reflected in the optimization model.
 * - Builds the synchronized editor model through a pure `buildCurrentEditorModel(...)` helper whose explicit inputs are the reactive editor rows, reactive auto-aperture mode, reactive row-ID-keyed auto semi-diameter cache, and current optical specs.
 * - In auto-aperture mode, the synchronized model replaces each physical surface row's manual `semiDiameter` with its cached computed value and falls back to the manual value when that row ID is absent from the cache. In manual mode, the retained cache is ignored and the editable row values are synchronized unchanged.
 * - Both `editorAutoAperture` and `editorAutoSemiDiameters` are synchronization dependencies, so mode-only changes and new worker-computed cache values update `optimizationModel`. Consequently, evaluation and either optimizer run receive the effective semi-diameters without a separate Optimization worker request.
 * - Passes the Lens Editor `optimizationSyncPolicy` into `syncFromOpticalModel(...)` so normal editor prescription edits reset Optimization prescription modes, while Optimization Apply and Focusing-origin edits preserve those modes.
 * - Renders the extracted `OptimizationActionBar` above the tabs with:
 * - `Optimize`
 * - `Apply to Editor`
 * - Derives the action button size from `useScreenBreakpoint()` and passes it to `OptimizationActionBar`: `xs` on `screenSM`, `sm` otherwise. This matches Lens Editor's `Update System` responsive sizing.
 * - Renders the extracted `OptimizationEvaluationPanel` between the action row and the tabs. The table is driven by `evaluateOptimizationProblem(...)`, shows one row per returned residual whose effective `total_weight` is non-zero with `Operand Type`, `Target`, `Weight`, and `Value`, formats `Weight` and `Value` with 6 decimal places, can show a warning banner above the table or empty state, and switches between a live height-capped scroll body on large screens and a full-height body on small screens.
 * - When the current store state cannot build an optimization config, passes the thrown `buildOptimizationConfig()` error message into the evaluation panel so Operand Evaluation shows the specific invalid-config reason before either the table or the existing placeholder text.
 * - Before live operand evaluation or `Optimize` can call the worker, validates object/surface glasses in the current optimization model against the app-wide glass lookup map. Missing glasses clear the evaluation table, show the standard missing-glass message in Operand Evaluation, disable `Optimize`, and prevent both `evaluateOptimizationProblem(...)` and `optimizeOpm(...)`.
 * - Delegates controlled `BottomDrawer` tab construction and rendering to `BottomDrawerContainer`, with five sections:
 * - `Algorithm`
 * - `Half-Fields`
 * - `Wavelengths`
 * - `Lens Prescription`
 * - `Operands`
 * - Matches the Lens Editor drawer pattern responsively:
 * - on `screenLG`, renders a draggable `BottomDrawer` anchored to the bottom of the page with `mt-auto` and keeps the page shell `overflow-hidden` so the drawer panel owns tab-content scrolling
 * - on `screenLG`, observes the page shell height and listens to `BottomDrawer.onHeightChange(...)` so the operand evaluation table grows when the drawer is dragged downward and shrinks when the drawer is dragged upward
 * - on smaller screens, renders the same `BottomDrawer` in non-draggable mode while the page continues to scroll vertically
 * - on smaller screens, disables the evaluation panel's internal vertical scrollbar so the page owns the only vertical scroll position
 * - the page shell itself does not own outer padding; instead, a descendant wrapper pads the shared action/evaluation/modal section and a separate drawer wrapper keeps only the drawer bottom spacing so the drawer still spans edge to edge
 * - the optimization page passes `panelClassName="p-0"` to `BottomDrawer` so each tab keeps a single `p-4` content gutter that matches the rest of the page layout instead of stacking drawer padding with per-tab padding
 * - The tabs delegate their view rendering to feature components:
 * - `OptimizationAlgorithmTab`
 * - `OptimizationWeightsGrid` for `Half-Fields` and `Wavelengths`
 * - `OptimizationLensPrescriptionGrid`
 * - `OptimizationOperandsTab`
 * - The field and wavelength grid components render AG Grid tables where only the `Weight` column is editable.
 * - `OptimizationLensPrescriptionGrid` renders a read-only prescription view with:
 * - an `Index` column before `Surface` that is blank for `Object` and `Image` and shows `1..N` for real surface rows
 * - a `Var.` column after `Radius of Curvature` for radius variable/pickup configuration
 * - a second `Var.` column after `Thickness` for thickness variable/pickup configuration
 * - read-only `Medium`, `Semi-diam.`, `Asph.` columns
 * - read-only `Aperture` column after `Semi-diam.` that opens the aperture inspection modal
 * - a conditional fourth `Var.` column immediately after `Medium` for Object and physical-surface glass pools when Glass Expert is selected
 * - a third always-present `Var.` column after `Asph.` for asphere variable/pickup configuration (real surface rows only; opens `AsphereVarModal`)
 * - read-only `Tilt & Decenter`, followed by an always-visible fourth `Var.` column for five independent tilt/decenter targets on numbered surfaces and Image, and `Diffraction Grating`
 * - Passes the auto/manual mode from the synchronized optimization model through `BottomDrawerContainer` to `OptimizationLensPrescriptionGrid`, keeping the prescription display aligned with the model used by evaluation and optimization.
 * - `OptimizationOperandsTab` renders an add/delete AG Grid table with `Operand Kind`, `Target`, and `Weight`, including combined and axis-specific OPD Difference and Ray Fan operand options.
 * - The `Weight` column is editable, defaults to `"1"` for new rows, and is validated as a positive non-zero number when optimization config is built.
 * - Whenever the committed optimization config changes, the component immediately marks Operand Evaluation pending, clears the prior report, debounces a worker-side evaluation call through `useDebouncedCallback(...)`, passes the app-wide `imagePoint`, updates the static table from the returned residuals, and ignores stale async responses from older requests. Glass Expert is evaluated through a separately built bounded `least_squares/trf` config.
 * - Registers `set_optimization_config`, `get_optimization_config`, `evaluate_optimization_operands`, `execute_optimization`, and `apply_optimization_to_editor` only while this route is mounted. The descriptors retain the latest worker, catalog, store, and callback snapshots without re-registering on ordinary page renders.
 * - The WebMCP setter uses the store's atomic inverse adapter, while WebMCP evaluation, execution, stopping, and application call the same page operations as the automatic evaluation effect, `Optimize` button, progress-modal Stop control, and confirmed Apply action. Tool callers receive JSON worker reports and transport errors while the page keeps its existing safe warning behavior.
 * - A resolved failed evaluation report clears stale rows and displays the shared approved failure message. Initial-guess bounds validation retains its rollback report; a later successful evaluation clears warnings. Worker diagnostics are logged once at the boundary.
 * - Radius, thickness, asphere, and tilt/decenter variable/pickup dialogs keep edits in modal-local draft state. Committed asphere and tilt/decenter state are evaluation dependencies.
 * - The page derives one shared `canUseBounds` boolean from the selected optimizer kind/method and passes that boolean to the radius, thickness, and asphere modals so their `variable` mode rendering stays decoupled from algorithm details.
 * - When the user explicitly switches the Method select and the updated config fails `buildOptimizationConfig()`, `BottomDrawerContainer` reports the thrown error message through the page-local warning callback instead of filtering to one hardcoded `lm` warning.
 * - When the user switches Optimizer Kind, `BottomDrawerContainer` delegates to the store's `setOptimizerKind()` action so algorithm fields reset to the selected optimizer's defaults.
 * - Variable-bound affordances use optimizer-kind-aware capabilities, so bounded least-squares (`trf`), Differential Evolution, and Glass Expert use the min/max variable UI while `lm` remains unbounded.
 * - Invalid intermediate configs clear the evaluation table and show the current `buildOptimizationConfig()` error in Operand Evaluation.
 * - Missing-glass validation also clears the evaluation table; config-build errors take precedence when both a config error and a missing-glass error are present.
 * - Operand Evaluation loading and completion state updates must not re-render the bottom drawer grid subtree or reset active AG Grid editors; the page passes memoized drawer `layout`, `fields`, `wavelengths`, and `prescription` prop objects, with `onHeightChange` present only for large-screen drawer mode.
 * - `Optimize` is disabled when the current optimization config cannot be built, including fresh pages with no operands and malformed variable/pickup inputs.
 * - `Optimize` is disabled when the current optimization model references glasses missing from the loaded glass catalog.
 * - `Optimize` is also disabled when the current built merit function has no non-zero effective contribution after combining operand, field, and wavelength weights.
 * - `Optimize` is disabled until the current Operand Evaluation succeeds without a displayed error or warning, while any Optimization AG Grid cell edit is active, while a post-edit Operand Evaluation refresh is pending, and while Operand Evaluation is currently evaluating.
 * - Page-level AG Grid edit lifecycle tracking increments on `onCellEditingStarted`, decrements on `onCellEditingStopped`, increments an edit-stop revision so even no-op edits schedule a refresh, and marks the committed post-edit state as pending until the next debounced Operand Evaluation request settles; invalid config or missing worker prerequisites clear that pending gate without running an evaluation.
 * - `Optimize` does not blur active AG Grid editors to force a commit. If the handler is triggered programmatically while editing, waiting for post-edit evaluation, evaluating, invalid, or zero-contribution, it returns without calling either optimizer RPC.
 * - `Optimize` validates the store state against the live catalog snapshot, rejects zero-contribution configs with an Operand Evaluation warning even if the handler is triggered programmatically, opens `OptimizationProgressModal`, creates a per-run id and optional interrupt buffer, branches between `proxy.optimizeOpm` and `proxy.optimizeGlasses`, and streams merit-history updates into the modal chart through a Comlink progress callback. Rejected calls and resolved `status: "error"` reports display shared approved messages; unsuccessful completed solver reports display `Optimization did not converge.`. Logging belongs to the worker boundary. Locally generated configuration warnings remain specific.
 * - The page checks `proxy.canInterruptOptimization()` and disables the progress modal Stop control when Pyodide interrupt support or `SharedArrayBuffer` is unavailable.
 * - Clicking Stop is idempotent for the active run: it writes Pyodide's interrupt signal into the shared interrupt buffer immediately, calls `proxy.requestOptimizationStop(activeRunId)` for worker-side run validation, disables the Stop button while the run is settling, and leaves the progress modal open.
 * - A stopped report with `status: "stopped"` is treated as a successful partial optimization result: the page applies its `final_values`, preserves the final chart history, switches the modal to completed `OK` controls in the normal `finally` path, and does not show a warning for that user-requested status.
 * - Late or stale stop responses are ignored by the page orchestration because only the active run's worker promise can update the completed optimization state.
 * - The progress modal is blocking while optimization is active: there is no `OK` button and backdrop clicks are ignored until the worker promise settles.
 * - After the optimization run settles, the progress modal keeps the final chart visible, exposes an `OK` button, and can then be dismissed without mutating the optimization result.
 * - `Apply to Editor` asynchronously applies through `applyOptimizationModelToEditor()`, clearing the unapplied marker only after success. Synchronization failures retain the result and use the existing error UI.
 * - An aborted WebMCP execution sends the active run through the same interrupt-buffer and worker run-id Stop path as the modal, waits for the worker report to settle, mirrors any stopped partial result, and then rejects with `AbortError`.
 * - Modal rendering is delegated to extracted wrappers:
 * - `RadiusModeModal`
 * - `ThicknessModeModal`
 * - `AsphereVarModal`
 * - `OptimizationProgressModal`
 * - `OptimizationApplyConfirmModal`
 * - `OptimizationInspectionModals`
 * - Modal-backed prescription columns still open the existing lens-editor dialogs in `readOnly` mode so users can inspect, but not edit, those settings from optimization, including aperture settings.
 *
 *
 *
 * ## Key Conventions
 *
 * - The optimization page stays decoupled from the editor while open; it does not mutate the editor until the user confirms `Apply to Editor`.
 * - Half-field row labels convert relative samples through `maxField` and display absolute samples directly because those coordinates are already physical.
 * - Mount-time initialization preserves existing optimization weights, operands, algorithm settings, and variable/pickup modes when returning to the route without editor changes.
 * - Editor-driven optical-model changes propagate into optimization automatically; field, wavelength, and prescription differences are synchronized independently so only affected optimization defaults reset.
 * - Auto-aperture semi-diameter cache updates follow the same prescription synchronization policy as other editor-driven surface changes; disabling auto aperture restores manual values without clearing the Lens Editor cache.
 * - The live evaluation table uses the residual `total_weight` reported by Python and hides rows whose effective weight is zero, so field/wavelength-expanded operands appear only for active contributions.
 * - Large-screen evaluation height is derived from the observed page-shell height, the current live drawer height, and measured fixed overhead above the table, with a fallback reserve when DOM measurement is not yet available.
 * - The page treats zero-weight blocking generically based on optional `fields` and `wavelengths` arrays in the built optimization config instead of hardcoding operand kinds, so newly added operands inherit the rule automatically if they follow the same config shape.
 * - `OptimizationPage` remains responsible for deriving row data, evaluation state, warning text, modal state, worker calls, and the page-level Apply to Editor confirmation. The editor mutation itself is factored into `features/optimization/lib/applyOptimizationModelToEditor.ts` so the app shell navigation warning can reuse the same apply path.
 * - `BottomDrawerContainer` owns the drawer wrapper, tab assembly, active-tab state binding, optimizer handlers, field/wavelength weight handlers, prescription variable-modal handlers, operand handlers, and AG Grid edit lifecycle callback forwarding by reading the optimization store directly and receiving page-level lifecycle callbacks.
 * - Page-level optimization components are imported through their component-directory `index.ts` barrels. `BottomDrawerContainer` handles the narrow drawer-tab component imports, while `OptimizationInspectionModals` comes from its own nested directory barrel.
 * - Optimization worker report/progress types are imported from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - Changing the Method select updates the optimization store immediately, so evaluation config building and variable modal rendering switch between bounded `trf` and unbounded `lm` behavior in place.
 * - That method-switch warning is limited to explicit method changes, but it surfaces any config-build error produced by the switch inside Operand Evaluation instead of only one hardcoded residual-count message.
 * - AG Grid tabs keep `domLayout="autoHeight"` and avoid their own vertical scroll wrappers so the drawer panel is the single vertical scroller on large screens.
 * - The tabbed AG Grid tables also disable column reordering via `defaultColDef.suppressMovable` so users cannot swap column order between sessions or tabs.
 */
export function OptimizationPage({
  proxy,
  isReady,
  onError,
  onApplyToEditor,
}: OptimizationPageProps) {
  const defaultLgDrawerHeight =
    typeof window === "undefined" ? 300 : Math.round(window.innerHeight * 0.4);
  const screenSize = useScreenBreakpoint();
  const { imagePoint } = useImagePoint();
  const { catalogs, lookupMaps } = useGlassCatalogs();
  const isLG = screenSize === "screenLG";
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const optimizationStore = useOptimizationStore();
  const editorRows = useStore(lensStore, (state) => state.rows);
  const prescriptionRevision = useStore(
    lensStore,
    (state) => state.prescriptionRevision,
  );
  const optimizationSyncPolicy = useStore(
    lensStore,
    (state) => state.optimizationSyncPolicy,
  );
  const editorAutoAperture = useStore(lensStore, (state) => state.autoAperture);
  const editorAutoSemiDiameters = useStore(
    lensStore,
    (state) => state.autoSemiDiameters,
  );
  const pupilSpace = useStore(specsStore, (state) => state.pupilSpace);
  const pupilType = useStore(specsStore, (state) => state.pupilType);
  const pupilValue = useStore(specsStore, (state) => state.pupilValue);
  const fieldSpace = useStore(specsStore, (state) => state.fieldSpace);
  const fieldType = useStore(specsStore, (state) => state.fieldType);
  const maxField = useStore(specsStore, (state) => state.maxField);
  const fields = useStore(specsStore, (state) => state.fields);
  const isRelative = useStore(specsStore, (state) => state.isRelative);
  const isWideAngle = useStore(specsStore, (state) => state.isWideAngle);
  const wavelengthWeightsFromEditor = useStore(
    specsStore,
    (state) => state.wavelengthWeights,
  );
  const referenceIndex = useStore(specsStore, (state) => state.referenceIndex);

  const optimizationModel = useStore(
    optimizationStore,
    (state) => state.optimizationModel,
  );
  const optimizer = useStore(optimizationStore, (state) => state.optimizer);
  const fieldWeights = useStore(
    optimizationStore,
    (state) => state.fieldWeights,
  );
  const wavelengthWeights = useStore(
    optimizationStore,
    (state) => state.wavelengthWeights,
  );
  const radiusModes = useStore(optimizationStore, (state) => state.radiusModes);
  const glassModes = useStore(optimizationStore, (state) => state.glassModes);
  const operands = useStore(optimizationStore, (state) => state.operands);
  const canBuildOptimizationConfig = useStore(optimizationStore, (state) => {
    try {
      state.buildOptimizationConfig(catalogs);
      return true;
    } catch {
      return false;
    }
  });
  const invalidConfigMessage = useStore(optimizationStore, (state) => {
    try {
      state.buildOptimizationConfig(catalogs);
      return undefined;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Optimization config is invalid.";
    }
  });
  const hasNonZeroContribution = useStore(optimizationStore, (state) => {
    try {
      return hasNonZeroOptimizationContribution(
        state.buildOptimizationConfig(catalogs),
      );
    } catch {
      return false;
    }
  });
  const isOptimizing = useStore(
    optimizationStore,
    (state) => state.isOptimizing,
  );
  const applyConfirmOpen = useStore(
    optimizationStore,
    (state) => state.applyConfirmOpen,
  );
  const radiusModal = useStore(optimizationStore, (state) => state.radiusModal);
  const thicknessModal = useStore(
    optimizationStore,
    (state) => state.thicknessModal,
  );
  const thicknessModes = useStore(
    optimizationStore,
    (state) => state.thicknessModes,
  );
  const asphereStates = useStore(
    optimizationStore,
    (state) => state.asphereStates,
  );
  const decenterStates = useStore(
    optimizationStore,
    (state) => state.decenterStates,
  );
  const asphereModal = useStore(
    optimizationStore,
    (state) => state.asphereModal,
  );
  const glassModal = useStore(optimizationStore, (state) => state.glassModal);
  const decenterVarModal = useStore(
    optimizationStore,
    (state) => state.decenterVarModal,
  );
  const [mediumModalRow, setMediumModalRow] = useState<GridRow | undefined>();
  const [asphericalModalRow, setAsphericalModalRow] = useState<
    GridRow | undefined
  >();
  const [apertureModalRow, setApertureModalRow] = useState<
    GridRow | undefined
  >();
  const [decenterModalRow, setDecenterModalRow] = useState<
    GridRow | undefined
  >();
  const [diffractionGratingModalRow, setDiffractionGratingModalRow] = useState<
    GridRow | undefined
  >();
  const [evaluationReport, setEvaluationReport] = useState<
    OptimizationReport | undefined
  >();
  const [optimizationWarningMessage, setOptimizationWarningMessage] = useState<
    string | undefined
  >();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeGridEditCount, setActiveGridEditCount] = useState(0);
  const [isPostEditEvaluationPending, setIsPostEditEvaluationPending] =
    useState(false);
  const [gridEditStopRevision, setGridEditStopRevision] = useState(0);
  const [optimizationProgress, setOptimizationProgress] = useState<
    ReadonlyArray<OptimizationProgressEntry>
  >([]);
  const [optimizationProgressModalOpen, setOptimizationProgressModalOpen] =
    useState(false);
  const [optimizationRunComplete, setOptimizationRunComplete] = useState(false);
  const [canStopOptimization, setCanStopOptimization] = useState(false);
  const [isStoppingOptimization, setIsStoppingOptimization] = useState(false);
  const [liveDrawerHeight, setLiveDrawerHeight] = useState(
    defaultLgDrawerHeight,
  );
  const [pageShellHeight, setPageShellHeight] = useState(0);
  const pageShellRef = useRef<HTMLDivElement | null>(null);
  const sharedContentRef = useRef<HTMLDivElement | null>(null);
  const evaluationPanelRef = useRef<HTMLDivElement | null>(null);
  const evaluationRequestIdRef = useRef(0);
  const evaluatedOptimizationRunConfigSignatureRef = useRef<string | undefined>(
    undefined,
  );
  const optimizationRunIdRef = useRef<string | undefined>(undefined);
  const optimizationInterruptBufferRef = useRef<SharedArrayBuffer | undefined>(
    undefined,
  );
  const optimizationStopRequestedRunIdRef = useRef<string | undefined>(
    undefined,
  );
  const optimizationStopPromiseRef = useRef<Promise<void> | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    if (!isLG) {
      return;
    }

    const pageShell = pageShellRef.current;
    if (pageShell === null) {
      return;
    }

    const updatePageShellHeight = () => {
      const nextHeight = Math.round(pageShell.getBoundingClientRect().height);
      setPageShellHeight(nextHeight);
    };

    updatePageShellHeight();
    const resizeObserver = new ResizeObserver(updatePageShellHeight);
    resizeObserver.observe(pageShell);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLG]);

  useEffect(() => {
    const currentEditorModel = buildCurrentEditorModel(
      editorRows,
      editorAutoAperture,
      editorAutoSemiDiameters,
      specsStore.getState().toOpticalSpecs(),
    );
    if (optimizationStore.getState().optimizationModel === undefined) {
      optimizationStore
        .getState()
        .initializeFromOpticalModel(currentEditorModel);
      return;
    }

    optimizationStore.getState().syncFromOpticalModel(currentEditorModel, {
      prescriptionSyncPolicy: optimizationSyncPolicy,
    });
  }, [
    editorRows,
    prescriptionRevision,
    optimizationSyncPolicy,
    editorAutoAperture,
    editorAutoSemiDiameters,
    pupilSpace,
    pupilType,
    pupilValue,
    fieldSpace,
    fieldType,
    maxField,
    fields,
    isRelative,
    isWideAngle,
    wavelengthWeightsFromEditor,
    referenceIndex,
    optimizationStore,
    specsStore,
  ]);

  useEffect(() => {
    let canceled = false;

    if (proxy === undefined) {
      setCanStopOptimization(false);
      return;
    }

    void proxy
      .canInterruptOptimization()
      .then((isSupported) => {
        if (!canceled) {
          setCanStopOptimization(
            isSupported && typeof SharedArrayBuffer !== "undefined",
          );
        }
      })
      .catch(() => {
        if (!canceled) {
          setCanStopOptimization(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [proxy]);

  const fieldRows = useMemo<WeightRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }

    const fieldSpec = optimizationModel.specs.field;
    const unit = fieldSpec.type === "angle" ? "°" : " mm";
    return fieldSpec.fields.map((field, index) => ({
      id: `field-${index}`,
      index,
      label: `${(fieldSpec.isRelative ? field * fieldSpec.maxField : field).toPrecision(3)}${unit}`,
      weight: fieldWeights[index] ?? 1,
    }));
  }, [fieldWeights, optimizationModel]);

  const wavelengthRows = useMemo<WeightRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }

    return optimizationModel.specs.wavelengths.weights.map(
      ([wavelength], index) => ({
        id: `wavelength-${index}`,
        index,
        label: `${wavelength} nm`,
        weight: wavelengthWeights[index] ?? 1,
      }),
    );
  }, [optimizationModel, wavelengthWeights]);

  const radiusRows = useMemo<RadiusRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }

    return surfacesToGridRows(optimizationModel).map((row, index) => ({
      id: `optimization-row-${index}`,
      radiusSurfaceIndex: index === 0 ? undefined : index,
      thicknessSurfaceIndex: row.kind === "surface" ? index : undefined,
      row,
    }));
  }, [optimizationModel]);

  const selectedRadiusMode =
    radiusModal.surfaceIndex === undefined
      ? undefined
      : radiusModes.find(
          (mode) => mode.surfaceIndex === radiusModal.surfaceIndex,
        );

  const selectedThicknessMode =
    thicknessModal.surfaceIndex === undefined
      ? undefined
      : thicknessModes.find(
          (mode) => mode.surfaceIndex === thicknessModal.surfaceIndex,
        );

  const selectedAsphereState =
    asphereModal.surfaceIndex === undefined
      ? undefined
      : asphereStates.find(
          (state) => state.surfaceIndex === asphereModal.surfaceIndex,
        );

  const selectedGlassMode =
    glassModal.surfaceIndex === undefined
      ? undefined
      : glassModes.find(
          (mode) => mode.surfaceIndex === glassModal.surfaceIndex,
        );
  const selectedDecenterState =
    decenterVarModal.surfaceIndex === undefined
      ? undefined
      : decenterStates.find(
          (state) => state.surfaceIndex === decenterVarModal.surfaceIndex,
        );

  const evaluationRows = useMemo(
    () =>
      evaluationReport?.residuals.flatMap((residual, index) => {
        const row = createEvaluationRow(residual, index);
        return row === undefined ? [] : [row];
      }) ?? [],
    [evaluationReport],
  );

  const evaluationTableRows = useMemo(
    () =>
      evaluationRows.map(
        (row) => [row.operandType, row.target, row.weight, row.value] as const,
      ),
    [evaluationRows],
  );
  const missingGlassMessage = useMemo(
    () =>
      optimizationModel === undefined
        ? undefined
        : formatMissingGlassMessage(
            getMissingPrescriptionGlasses(optimizationModel, lookupMaps),
          ),
    [lookupMaps, optimizationModel],
  );
  const evaluationWarningMessage =
    invalidConfigMessage ?? missingGlassMessage ?? optimizationWarningMessage;

  const hasActiveGridEdit = activeGridEditCount > 0;
  const canOptimize =
    isReady &&
    proxy !== undefined &&
    optimizationModel !== undefined &&
    missingGlassMessage === undefined &&
    canBuildOptimizationConfig &&
    hasNonZeroContribution &&
    evaluationReport?.success === true &&
    evaluationWarningMessage === undefined &&
    !hasActiveGridEdit &&
    !isPostEditEvaluationPending &&
    !isEvaluating;
  const { canUseBounds } = getOptimizationAlgorithmCapabilities(
    optimizer.kind === "least_squares"
      ? { kind: optimizer.kind, method: optimizer.method }
      : { kind: optimizer.kind },
  );

  const evaluationReservedHeight = !isLG
    ? undefined
    : (() => {
        const sharedContentHeight =
          sharedContentRef.current?.getBoundingClientRect().height ?? 0;
        const evaluationPanelHeight =
          evaluationPanelRef.current?.getBoundingClientRect().height ?? 0;
        const measuredReservedHeight =
          sharedContentHeight > 0 && evaluationPanelHeight > 0
            ? Math.round(sharedContentHeight - evaluationPanelHeight)
            : 0;

        return measuredReservedHeight > 0
          ? measuredReservedHeight
          : LG_EVALUATION_RESERVED_HEIGHT_FALLBACK;
      })();

  const evaluationMaxBodyHeight = useMemo(() => {
    if (
      !isLG ||
      pageShellHeight <= 0 ||
      evaluationReservedHeight === undefined
    ) {
      return undefined;
    }

    return Math.max(
      120,
      pageShellHeight - liveDrawerHeight - evaluationReservedHeight,
    );
  }, [evaluationReservedHeight, isLG, liveDrawerHeight, pageShellHeight]);

  const evaluateOptimizationOperation = useCallback(
    async ({
      requestId,
      model,
      currentImagePoint,
      catalogSnapshot,
      signal,
    }: {
      readonly requestId: number;
      readonly model: OpticalModel;
      readonly currentImagePoint: typeof imagePoint;
      readonly catalogSnapshot: AllGlassCatalogsData | undefined;
      readonly signal?: AbortSignal;
    }): Promise<OptimizationReport> => {
      if (evaluationRequestIdRef.current === requestId) {
        evaluatedOptimizationRunConfigSignatureRef.current = undefined;
      }
      let config: OptimizationConfig;
      let runConfig: OptimizationRunConfig;
      try {
        const state = optimizationStore.getState();
        runConfig = state.buildOptimizationConfig(catalogSnapshot);
        config = state.buildOptimizationEvaluationConfig(catalogSnapshot);
      } catch (error) {
        if (evaluationRequestIdRef.current === requestId) {
          setEvaluationReport(undefined);
          setIsEvaluating(false);
          setIsPostEditEvaluationPending(false);
        }
        throw error;
      }

      if (proxy === undefined) {
        if (evaluationRequestIdRef.current === requestId) {
          setEvaluationReport(undefined);
          setIsEvaluating(false);
          setIsPostEditEvaluationPending(false);
        }
        throw new Error("Pyodide is not ready.");
      }

      try {
        const report = await proxy.evaluateOptimizationProblem(
          model,
          config,
          currentImagePoint,
        );
        assertWebMcpNotCancelled(signal);
        if (evaluationRequestIdRef.current !== requestId) {
          return report;
        }

        if (!report.success) {
          if (
            report.status === "error" &&
            report.message === INITIAL_GUESS_OUTSIDE_BOUNDS_MESSAGE
          ) {
            setEvaluationReport(report);
            setOptimizationWarningMessage(INITIAL_GUESS_OUTSIDE_BOUNDS_MESSAGE);
            return report;
          }

          setEvaluationReport(undefined);
          setOptimizationWarningMessage(getPyodideErrorMessage(report.message));
          return report;
        }

        setOptimizationWarningMessage(undefined);
        setEvaluationReport(report);
        evaluatedOptimizationRunConfigSignatureRef.current =
          JSON.stringify(runConfig);
        return report;
      } catch (error: unknown) {
        if (evaluationRequestIdRef.current === requestId) {
          const errorName = error instanceof Error ? error.name : undefined;
          if (errorName !== "AbortError") {
            setEvaluationReport(undefined);
            setOptimizationWarningMessage(getPyodideErrorMessage(error));
          }
        }
        throw error;
      } finally {
        if (evaluationRequestIdRef.current === requestId) {
          setIsEvaluating(false);
          setIsPostEditEvaluationPending(false);
        }
      }
    },
    [imagePoint, optimizationStore, proxy],
  );

  const { run: runDebouncedEvaluation, cancel: cancelDebouncedEvaluation } =
    useDebouncedCallback(
      (
        requestId: number,
        model: OpticalModel,
        currentImagePoint: typeof imagePoint,
        catalogSnapshot: AllGlassCatalogsData | undefined,
      ) => {
        void evaluateOptimizationOperation({
          requestId,
          model,
          currentImagePoint,
          catalogSnapshot,
        }).catch(() => undefined);
      },
      200,
    );

  useEffect(() => {
    if (
      !isReady ||
      proxy === undefined ||
      optimizationModel === undefined ||
      !canBuildOptimizationConfig ||
      missingGlassMessage !== undefined
    ) {
      cancelDebouncedEvaluation();
      evaluationRequestIdRef.current += 1;
      evaluatedOptimizationRunConfigSignatureRef.current = undefined;
      setEvaluationReport(undefined);
      setIsEvaluating(false);
      setIsPostEditEvaluationPending(false);
      return;
    }

    const requestId = evaluationRequestIdRef.current + 1;
    evaluationRequestIdRef.current = requestId;
    setEvaluationReport(undefined);
    setIsEvaluating(true);
    runDebouncedEvaluation(requestId, optimizationModel, imagePoint, catalogs);

    return () => {
      cancelDebouncedEvaluation();
    };
  }, [
    isReady,
    proxy,
    optimizationModel,
    optimizationStore,
    canBuildOptimizationConfig,
    missingGlassMessage,
    catalogs,
    optimizer,
    fieldWeights,
    wavelengthWeights,
    radiusModes,
    thicknessModes,
    glassModes,
    asphereStates,
    decenterStates,
    operands,
    gridEditStopRevision,
    imagePoint,
    runDebouncedEvaluation,
    cancelDebouncedEvaluation,
  ]);

  const evaluateCurrentOptimization = useCallback(
    async (signal: AbortSignal): Promise<OptimizationReport> => {
      assertWebMcpNotCancelled(signal);
      if (optimizationStore.getState().isOptimizing) {
        throw new Error(
          "Cannot evaluate operands while optimization is running.",
        );
      }
      if (!isReady || proxy === undefined || optimizationModel === undefined) {
        throw new Error("Optimization is not ready for operand evaluation.");
      }
      if (missingGlassMessage !== undefined) {
        throw new Error(missingGlassMessage);
      }

      cancelDebouncedEvaluation();
      const requestId = evaluationRequestIdRef.current + 1;
      evaluationRequestIdRef.current = requestId;
      setEvaluationReport(undefined);
      setIsEvaluating(true);
      return evaluateOptimizationOperation({
        requestId,
        model: optimizationModel,
        currentImagePoint: imagePoint,
        catalogSnapshot: catalogs,
        signal,
      });
    },
    [
      cancelDebouncedEvaluation,
      catalogs,
      evaluateOptimizationOperation,
      imagePoint,
      isReady,
      missingGlassMessage,
      optimizationModel,
      optimizationStore,
      proxy,
    ],
  );

  const handleGridCellEditingStarted = useCallback(() => {
    setActiveGridEditCount((count) => count + 1);
  }, []);

  const handleGridCellEditingStopped = useCallback(() => {
    setActiveGridEditCount((count) => Math.max(0, count - 1));
    setIsPostEditEvaluationPending(true);
    setGridEditStopRevision((revision) => revision + 1);
  }, []);

  const requestOptimizationStop = useCallback(
    (requestedRunId?: string): Promise<void> => {
      const runId = requestedRunId ?? optimizationRunIdRef.current;
      if (proxy === undefined || runId === undefined) {
        return Promise.resolve();
      }
      if (optimizationStopRequestedRunIdRef.current === runId) {
        return optimizationStopPromiseRef.current ?? Promise.resolve();
      }

      optimizationStopRequestedRunIdRef.current = runId;
      const interruptBuffer = optimizationInterruptBufferRef.current;
      if (interruptBuffer !== undefined) {
        Atomics.store(
          new Int32Array(interruptBuffer),
          0,
          PYODIDE_INTERRUPT_SIGNAL,
        );
      }

      setIsStoppingOptimization(true);
      let stopPromise: Promise<void>;
      try {
        stopPromise = proxy
          .requestOptimizationStop(runId)
          .then(() => undefined)
          .catch(() => undefined);
      } catch {
        stopPromise = Promise.resolve();
      }
      optimizationStopPromiseRef.current = stopPromise;
      return stopPromise;
    },
    [proxy],
  );

  const executeOptimizationOperation = useCallback(
    async (signal: AbortSignal): Promise<OptimizationRunReport> => {
      assertWebMcpNotCancelled(signal);
      if (
        optimizationStore.getState().isOptimizing ||
        optimizationRunIdRef.current !== undefined
      ) {
        throw new Error("Optimization is already running.");
      }
      if (
        !canOptimize ||
        proxy === undefined ||
        optimizationModel === undefined ||
        missingGlassMessage !== undefined
      ) {
        throw new Error("Optimization is not ready to run.");
      }

      const runId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `optimization-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const interruptBuffer =
        canStopOptimization && typeof SharedArrayBuffer !== "undefined"
          ? new SharedArrayBuffer(4)
          : undefined;
      const config = optimizationStore
        .getState()
        .buildOptimizationConfig(catalogs);
      if (
        evaluatedOptimizationRunConfigSignatureRef.current !==
        JSON.stringify(config)
      ) {
        throw new Error(
          "Optimization requires a successful evaluation of the current configuration.",
        );
      }
      if (!hasNonZeroOptimizationContribution(config)) {
        setOptimizationWarningMessage(ZERO_WEIGHT_WARNING_MESSAGE);
        throw new Error(ZERO_WEIGHT_WARNING_MESSAGE);
      }

      optimizationRunIdRef.current = runId;
      optimizationInterruptBufferRef.current = interruptBuffer;
      optimizationStopRequestedRunIdRef.current = undefined;
      optimizationStopPromiseRef.current = undefined;
      setOptimizationWarningMessage(undefined);
      setOptimizationProgress([]);
      setOptimizationProgressModalOpen(true);
      setOptimizationRunComplete(false);
      setIsStoppingOptimization(false);
      optimizationStore.getState().setIsOptimizing(true);

      const progressCallback = comlinkProxy(
        (progress: ReadonlyArray<OptimizationProgressEntry>) => {
          if (optimizationRunIdRef.current === runId) {
            setOptimizationProgress(progress);
          }
        },
      );
      const abortHandler = () => {
        void requestOptimizationStop(runId);
      };
      signal.addEventListener("abort", abortHandler, { once: true });
      if (signal.aborted) {
        abortHandler();
      }

      try {
        const report = await ("glass_variables" in config
          ? proxy.optimizeGlasses(
              optimizationModel,
              config,
              imagePoint,
              progressCallback,
              runId,
              interruptBuffer,
            )
          : proxy.optimizeOpm(
              optimizationModel,
              config,
              imagePoint,
              progressCallback,
              runId,
              interruptBuffer,
            ));
        setOptimizationProgress(report.optimization_progress ?? []);
        if (report.status === "error") {
          setOptimizationWarningMessage(getPyodideErrorMessage(report.message));
        } else {
          optimizationStore.getState().applyOptimizationResult(report);
          if (!report.success && report.status !== "stopped") {
            setOptimizationWarningMessage(
              OPTIMIZATION_DID_NOT_CONVERGE_MESSAGE,
            );
          }
        }
        assertWebMcpNotCancelled(signal);
        return report;
      } catch (error: unknown) {
        if (signal.aborted) {
          throw new DOMException("Tool execution was cancelled", "AbortError");
        }
        setOptimizationWarningMessage(getPyodideErrorMessage(error));
        onError(error);
        throw error;
      } finally {
        signal.removeEventListener("abort", abortHandler);
        setOptimizationRunComplete(true);
        setIsStoppingOptimization(false);
        optimizationRunIdRef.current = undefined;
        optimizationInterruptBufferRef.current = undefined;
        optimizationStopRequestedRunIdRef.current = undefined;
        optimizationStopPromiseRef.current = undefined;
        optimizationStore.getState().setIsOptimizing(false);
      }
    },
    [
      canOptimize,
      canStopOptimization,
      catalogs,
      imagePoint,
      missingGlassMessage,
      onError,
      optimizationModel,
      optimizationStore,
      proxy,
      requestOptimizationStop,
    ],
  );

  const handleOptimize = useCallback(() => {
    void executeOptimizationOperation(new AbortController().signal).catch(
      () => undefined,
    );
  }, [executeOptimizationOperation]);

  const handleStopOptimization = useCallback(() => {
    void requestOptimizationStop();
  }, [requestOptimizationStop]);

  /** Forwards cancellation to the editor commit boundary; a cancelled pending Apply retains the result and skips the completion callback. */
  const applyOptimizationOperation = useCallback(
    async (signal: AbortSignal): Promise<{ readonly surfaceCount: number }> => {
      assertWebMcpNotCancelled(signal);
      if (
        optimizationStore.getState().isOptimizing ||
        optimizationRunIdRef.current !== undefined
      ) {
        throw new Error(
          "Cannot apply optimization while a run is already running.",
        );
      }
      const model = optimizationStore.getState().optimizationModel;
      if (model === undefined) {
        throw new Error("No optimized optical model is available.");
      }
      if (proxy === undefined) {
        throw new Error("Pyodide is not ready.");
      }
      await applyOptimizationModelToEditor({
        model,
        lensStore,
        specsStore,
        proxy,
        signal,
      });
      assertWebMcpNotCancelled(signal);
      await onApplyToEditor?.(model);
      assertWebMcpNotCancelled(signal);
      optimizationStore.getState().closeApplyConfirm();
      optimizationStore.getState().markOptimizationResultAppliedToEditor();
      return { surfaceCount: model.surfaces.length };
    },
    [lensStore, onApplyToEditor, optimizationStore, proxy, specsStore],
  );

  const handleApplyToEditor = useCallback(async () => {
    try {
      await applyOptimizationOperation(new AbortController().signal);
    } catch (error) {
      onError(error);
    }
  }, [applyOptimizationOperation, onError]);

  useOptimizationWebMCP({
    optimizationStore,
    catalogs,
    evaluate: evaluateCurrentOptimization,
    execute: executeOptimizationOperation,
    apply: applyOptimizationOperation,
  });

  const bottomDrawerFields = useMemo(
    () => ({
      rows: fieldRows,
    }),
    [fieldRows],
  );

  const bottomDrawerWavelengths = useMemo(
    () => ({
      rows: wavelengthRows,
    }),
    [wavelengthRows],
  );

  const bottomDrawerPrescription = useMemo(
    () => ({
      autoAperture: optimizationModel?.setAutoAperture === "autoAperture",
      rows: radiusRows,
      onOpenMediumModal: setMediumModalRow,
      onOpenAsphericalModal: setAsphericalModalRow,
      onOpenApertureModal: setApertureModalRow,
      onOpenDecenterModal: setDecenterModalRow,
      onOpenDiffractionGratingModal: setDiffractionGratingModalRow,
    }),
    [optimizationModel?.setAutoAperture, radiusRows],
  );

  const bottomDrawerLayout = useMemo(
    () => (isLG ? { isLG, onHeightChange: setLiveDrawerHeight } : { isLG }),
    [isLG],
  );

  const gridEditLifecycle = useMemo(
    () => ({
      onCellEditingStarted: handleGridCellEditingStarted,
      onCellEditingStopped: handleGridCellEditingStopped,
    }),
    [handleGridCellEditingStarted, handleGridCellEditingStopped],
  );

  const sharedContent = (
    <div
      ref={sharedContentRef}
      data-testid="optimization-shared-content-wrapper"
      className="p-4 pb-0"
    >
      <OptimizationProgressModal
        isOpen={optimizationProgressModalOpen}
        isOptimizing={isOptimizing}
        progress={optimizationProgress}
        onStop={handleStopOptimization}
        isStopping={isStoppingOptimization}
        canStop={canStopOptimization}
        onClose={() => {
          if (!optimizationRunComplete) {
            return;
          }
          setOptimizationProgressModalOpen(false);
        }}
      />

      <OptimizationActionBar
        canOptimize={canOptimize}
        canApplyToEditor={optimizationModel !== undefined}
        isOptimizing={isOptimizing}
        onOptimize={() => void handleOptimize()}
        onApplyToEditor={() => optimizationStore.getState().openApplyConfirm()}
      />

      <div ref={evaluationPanelRef}>
        <OptimizationEvaluationPanel
          rows={evaluationTableRows}
          isEvaluating={isEvaluating}
          invalidConfigMessage={invalidConfigMessage}
          warningMessage={evaluationWarningMessage}
          maxBodyHeight={evaluationMaxBodyHeight}
          allowBodyScroll={isLG}
        />
      </div>

      <RadiusModeModal
        isOpen={radiusModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={radiusModal.surfaceIndex}
        selectedMode={selectedRadiusMode}
        canUseBounds={canUseBounds}
        onSetMode={(surfaceIndex, mode) =>
          optimizationStore.getState().setRadiusMode(surfaceIndex, mode)
        }
        onClose={() => optimizationStore.getState().closeRadiusModal()}
      />

      <ThicknessModeModal
        isOpen={thicknessModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={thicknessModal.surfaceIndex}
        selectedMode={selectedThicknessMode}
        canUseBounds={canUseBounds}
        onSetMode={(surfaceIndex, mode) =>
          optimizationStore.getState().setThicknessMode(surfaceIndex, mode)
        }
        onClose={() => optimizationStore.getState().closeThicknessModal()}
      />

      <AsphereVarModal
        isOpen={asphereModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={asphereModal.surfaceIndex}
        asphereState={selectedAsphereState}
        canUseBounds={canUseBounds}
        onSave={(surfaceIndex, state) =>
          optimizationStore.getState().replaceAsphereState(surfaceIndex, state)
        }
        onClose={() => optimizationStore.getState().closeAsphereModal()}
      />

      <GlassVariableModal
        isOpen={glassModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={glassModal.surfaceIndex}
        selectedMode={selectedGlassMode}
        catalogs={catalogs}
        onSetMode={(surfaceIndex, mode) =>
          optimizationStore.getState().setGlassMode(surfaceIndex, mode)
        }
        onClose={() => optimizationStore.getState().closeGlassModal()}
      />

      <TiltDecenterVarModal
        isOpen={decenterVarModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={decenterVarModal.surfaceIndex}
        decenterState={selectedDecenterState}
        canUseBounds={canUseBounds}
        onSave={(surfaceIndex, state) =>
          optimizationStore.getState().replaceDecenterState(surfaceIndex, state)
        }
        onClose={() => optimizationStore.getState().closeDecenterVarModal()}
      />

      <OptimizationApplyConfirmModal
        isOpen={applyConfirmOpen}
        onCancel={() => optimizationStore.getState().closeApplyConfirm()}
        onConfirm={() => void handleApplyToEditor()}
      />

      <OptimizationInspectionModals
        mediumModalRow={mediumModalRow}
        asphericalModalRow={asphericalModalRow}
        apertureModalRow={apertureModalRow}
        decenterModalRow={decenterModalRow}
        diffractionGratingModalRow={diffractionGratingModalRow}
        onCloseMediumModal={() => setMediumModalRow(undefined)}
        onCloseAsphericalModal={() => setAsphericalModalRow(undefined)}
        onCloseApertureModal={() => setApertureModalRow(undefined)}
        onCloseDecenterModal={() => setDecenterModalRow(undefined)}
        onCloseDiffractionGratingModal={() =>
          setDiffractionGratingModalRow(undefined)
        }
      />
    </div>
  );

  if (isLG) {
    return (
      <div
        ref={pageShellRef}
        className="relative flex flex-1 min-h-0 flex-col overflow-hidden"
      >
        {sharedContent}
        <BottomDrawerContainer
          fields={bottomDrawerFields}
          wavelengths={bottomDrawerWavelengths}
          prescription={bottomDrawerPrescription}
          layout={bottomDrawerLayout}
          gridEditLifecycle={gridEditLifecycle}
          onWarning={setOptimizationWarningMessage}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 min-h-0 flex-col overflow-y-auto">
      {sharedContent}
      <BottomDrawerContainer
        fields={bottomDrawerFields}
        wavelengths={bottomDrawerWavelengths}
        prescription={bottomDrawerPrescription}
        layout={bottomDrawerLayout}
        gridEditLifecycle={gridEditLifecycle}
        onWarning={setOptimizationWarningMessage}
      />
    </div>
  );
}
