"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useOptimizationStore } from "@/features/optimization/providers/OptimizationStoreProvider";
import type { OptimizationOperandKind } from "@/shared/lib/types/optimization";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { MediumCell } from "@/features/lens-editor/components/MediumCell";
import { AsphericalCell } from "@/features/lens-editor/components/AsphericalCell";
import { DecenterCell } from "@/features/lens-editor/components/DecenterCell";
import { DiffractionGratingCell } from "@/features/lens-editor/components/DiffractionGratingCell";
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";
import { AsphericalModal } from "@/features/lens-editor/components/AsphericalModal";
import { DecenterModal } from "@/features/lens-editor/components/DecenterModal";
import { DiffractionGratingModal } from "@/features/lens-editor/components/DiffractionGratingModal";
import { Tabs, type TabItem } from "@/shared/components/primitives/Tabs";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Select } from "@/shared/components/primitives/Select";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import { SetButton } from "@/shared/components/primitives/SetButton";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import { gridRowsToSurfaces, surfacesToGridRows } from "@/shared/lib/utils/gridTransform";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

interface OptimizationPageProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly onError: () => void;
  readonly onApplyToEditor?: (model: OpticalModel) => Promise<void> | void;
}

type RadiusChoice = "constant" | "variable" | "pickup";

interface WeightRow {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly weight: number;
}

interface OperandRowView {
  readonly id: string;
  kind: OptimizationOperandKind;
  target: string;
  weight: string;
}

interface RadiusRow {
  readonly id: string;
  readonly radiusSurfaceIndex?: number;
  readonly thicknessSurfaceIndex?: number;
  readonly row: GridRow;
}

function ActionWrapper({
  children,
  onAction,
}: {
  readonly children: React.ReactNode;
  readonly onAction: () => void;
}) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    onAction();
  };

  return (
    <div className="flex h-full w-full cursor-pointer items-center" onClick={handleClick}>
      {children}
    </div>
  );
}

function buildCurrentEditorModel(lensStore: ReturnType<typeof useLensEditorStore>, specsStore: ReturnType<typeof useSpecsConfiguratorStore>) {
  const autoAperture = lensStore.getState().autoAperture;
  const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
  const specs = specsStore.getState().toOpticalSpecs();
  const surfaces = gridRowsToSurfaces(lensStore.getState().rows);
  return { setAutoAperture, specs, ...surfaces };
}

function getRadiusLabel(surfaceIndex: number, model: OpticalModel): string {
  if (surfaceIndex === model.surfaces.length + 1) {
    return "Image";
  }
  return model.surfaces[surfaceIndex - 1]?.label ?? `Surface ${surfaceIndex}`;
}

function getRadiusValue(model: OpticalModel, surfaceIndex: number): number {
  if (surfaceIndex === model.surfaces.length + 1) {
    return model.image.curvatureRadius;
  }
  return model.surfaces[surfaceIndex - 1]?.curvatureRadius ?? 0;
}

export function OptimizationPage({
  proxy,
  isReady,
  onError,
  onApplyToEditor,
}: OptimizationPageProps) {
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const optimizationStore = useOptimizationStore();
  const gridTheme = useAgGridTheme();
  const editorRows = useStore(lensStore, (state) => state.rows);
  const editorAutoAperture = useStore(lensStore, (state) => state.autoAperture);
  const pupilSpace = useStore(specsStore, (state) => state.pupilSpace);
  const pupilType = useStore(specsStore, (state) => state.pupilType);
  const pupilValue = useStore(specsStore, (state) => state.pupilValue);
  const fieldSpace = useStore(specsStore, (state) => state.fieldSpace);
  const fieldType = useStore(specsStore, (state) => state.fieldType);
  const maxField = useStore(specsStore, (state) => state.maxField);
  const relativeFields = useStore(specsStore, (state) => state.relativeFields);
  const isWideAngle = useStore(specsStore, (state) => state.isWideAngle);
  const wavelengthWeightsFromEditor = useStore(specsStore, (state) => state.wavelengthWeights);
  const referenceIndex = useStore(specsStore, (state) => state.referenceIndex);

  const activeTabId = useStore(optimizationStore, (state) => state.activeTabId);
  const optimizationModel = useStore(optimizationStore, (state) => state.optimizationModel);
  const optimizer = useStore(optimizationStore, (state) => state.optimizer);
  const fieldWeights = useStore(optimizationStore, (state) => state.fieldWeights);
  const wavelengthWeights = useStore(optimizationStore, (state) => state.wavelengthWeights);
  const radiusModes = useStore(optimizationStore, (state) => state.radiusModes);
  const operands = useStore(optimizationStore, (state) => state.operands);
  const isOptimizing = useStore(optimizationStore, (state) => state.isOptimizing);
  const warningModal = useStore(optimizationStore, (state) => state.warningModal);
  const applyConfirmOpen = useStore(optimizationStore, (state) => state.applyConfirmOpen);
  const radiusModal = useStore(optimizationStore, (state) => state.radiusModal);
  const thicknessModal = useStore(optimizationStore, (state) => state.thicknessModal);
  const thicknessModes = useStore(optimizationStore, (state) => state.thicknessModes);
  const [mediumModalRow, setMediumModalRow] = useState<GridRow | undefined>();
  const [asphericalModalRow, setAsphericalModalRow] = useState<GridRow | undefined>();
  const [decenterModalRow, setDecenterModalRow] = useState<GridRow | undefined>();
  const [diffractionGratingModalRow, setDiffractionGratingModalRow] = useState<GridRow | undefined>();

  useEffect(() => {
    const currentEditorModel = buildCurrentEditorModel(lensStore, specsStore);
    const optimizationModelState = optimizationStore.getState().optimizationModel;
    if (optimizationModelState === undefined) {
      optimizationStore.getState().initializeFromOpticalModel(currentEditorModel);
      return;
    }

    optimizationStore.getState().syncFromOpticalModel(currentEditorModel);
  }, [
    editorRows,
    editorAutoAperture,
    pupilSpace,
    pupilType,
    pupilValue,
    fieldSpace,
    fieldType,
    maxField,
    relativeFields,
    isWideAngle,
    wavelengthWeightsFromEditor,
    referenceIndex,
    lensStore,
    optimizationStore,
    specsStore,
  ]);

  const fieldRows = useMemo<WeightRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }
    const unit = optimizationModel.specs.field.type === "angle" ? "°" : " mm";
    return optimizationModel.specs.field.fields.map((field, index) => ({
      id: `field-${index}`,
      index,
      label: `${(field * optimizationModel.specs.field.maxField).toPrecision(3)}${unit}`,
      weight: fieldWeights[index] ?? 1,
    }));
  }, [fieldWeights, optimizationModel]);

  const wavelengthRows = useMemo<WeightRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }
    return optimizationModel.specs.wavelengths.weights.map(([wavelength], index) => ({
      id: `wavelength-${index}`,
      index,
      label: `${wavelength} nm`,
      weight: wavelengthWeights[index] ?? 1,
    }));
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

  const selectedRadiusMode = radiusModal.surfaceIndex === undefined
    ? undefined
    : radiusModes.find((mode) => mode.surfaceIndex === radiusModal.surfaceIndex);
  const selectedThicknessMode = thicknessModal.surfaceIndex === undefined
    ? undefined
    : thicknessModes.find((mode) => mode.surfaceIndex === thicknessModal.surfaceIndex);

  const handleOptimize = async () => {
    if (proxy === undefined || optimizationModel === undefined) {
      return;
    }

    optimizationStore.getState().setIsOptimizing(true);
    try {
      const config = optimizationStore.getState().buildOptimizationConfig();
      const report = await proxy.optimizeOpm(optimizationModel, config);
      optimizationStore.getState().applyOptimizationResult(report);
      if (!report.success) {
        optimizationStore.getState().openWarningModal(report.message);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Optimization failed.";
      optimizationStore.getState().openWarningModal(message);
      onError();
    } finally {
      optimizationStore.getState().setIsOptimizing(false);
    }
  };

  const handleApplyToEditor = async () => {
    const model = optimizationStore.getState().optimizationModel;
    if (model === undefined) {
      return;
    }

    specsStore.getState().loadFromSpecs(model.specs);
    specsStore.getState().setCommittedSpecs(model.specs);
    lensStore.getState().setRows(surfacesToGridRows(model));
    lensStore.getState().setAutoAperture(model.setAutoAperture === "autoAperture");
    lensStore.getState().setCommittedOpticalModel(model);
    optimizationStore.getState().closeApplyConfirm();
    await onApplyToEditor?.(model);
  };

  const algorithmTab = (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      <div>
        <Label htmlFor="optimizer-kind">Optimizer Kind</Label>
        <Select
          id="optimizer-kind"
          aria-label="Optimizer Kind"
          value={optimizer.kind}
          options={[{ label: "Least Squares", value: "least_squares" }]}
          onChange={() => undefined}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-method">Method</Label>
        <Select
          id="optimizer-method"
          aria-label="Method"
          value={optimizer.method}
          options={[{ label: "Trust Region Reflective", value: "trf" }]}
          onChange={() => undefined}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-max-steps">Max. num of steps</Label>
        <Input
          id="optimizer-max-steps"
          aria-label="Max. num of steps"
          value={optimizer.maxNumSteps}
          onChange={(event) =>
            optimizationStore.getState().optimizer.maxNumSteps !== event.target.value &&
            optimizationStore.setState((state) => ({
              optimizer: { ...state.optimizer, maxNumSteps: event.target.value },
            }))
          }
        />
      </div>
      <div>
        <Label htmlFor="optimizer-ftol">Merit function change tolerance</Label>
        <Input
          id="optimizer-ftol"
          aria-label="Merit function change tolerance"
          value={optimizer.meritFunctionTolerance}
          onChange={(event) =>
            optimizationStore.setState((state) => ({
              optimizer: { ...state.optimizer, meritFunctionTolerance: event.target.value },
            }))
          }
        />
      </div>
      <div>
        <Label htmlFor="optimizer-xtol">Independent variable change tolerance</Label>
        <Input
          id="optimizer-xtol"
          aria-label="Independent variable change tolerance"
          value={optimizer.independentVariableTolerance}
          onChange={(event) =>
            optimizationStore.setState((state) => ({
              optimizer: { ...state.optimizer, independentVariableTolerance: event.target.value },
            }))
          }
        />
      </div>
      <div>
        <Label htmlFor="optimizer-gtol">Gradient tolerance</Label>
        <Input
          id="optimizer-gtol"
          aria-label="Gradient tolerance"
          value={optimizer.gradientTolerance}
          onChange={(event) =>
            optimizationStore.setState((state) => ({
              optimizer: { ...state.optimizer, gradientTolerance: event.target.value },
            }))
          }
        />
      </div>
    </div>
  );

  const weightColumns: ColDef<WeightRow>[] = [
    {
      headerName: "Index",
      valueGetter: (params) => params.data?.index,
    },
    {
      headerName: "Value",
      valueGetter: (params) => params.data?.label,
    },
    {
      headerName: "Weight",
      editable: true,
      valueGetter: (params) => params.data?.weight,
      valueParser: (params) => Number.parseFloat(params.newValue),
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }

        if (params.data.id.startsWith("field-")) {
          optimizationStore.getState().setFieldWeight(params.data.index, params.newValue as number);
        } else {
          optimizationStore.getState().setWavelengthWeight(params.data.index, params.newValue as number);
        }
        return true;
      },
    },
  ];

  const lensColumns: ColDef<RadiusRow>[] = [
    {
      headerName: "Surface",
      valueGetter: (params) => {
        if (params.data === undefined) {
          return "";
        }
        if (params.data.row.kind === "object") {
          return "Object";
        }
        if (params.data.row.kind === "image") {
          return "Image";
        }
        return params.data.row.label;
      },
    },
    {
      headerName: "Radius of Curvature",
      valueGetter: (params) => {
        if (params.data?.row.kind === "object") {
          return undefined;
        }
        return params.data?.row.curvatureRadius;
      },
    },
    {
      headerName: "Var.",
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.radiusSurfaceIndex === undefined) {
          return null;
        }
        const mode = radiusModes.find((entry) => entry.surfaceIndex === params.data.radiusSurfaceIndex);
        return (
          <SetButton
            isSet={mode?.mode !== "constant"}
            onClick={() => optimizationStore.getState().openRadiusModal(params.data.radiusSurfaceIndex!)}
            aria-label={`Radius mode for surface ${params.data.radiusSurfaceIndex}`}
            setLabel="Edit"
            unsetLabel="Set"
          />
        );
      },
    },
    {
      headerName: "Thickness",
      valueGetter: (params) => {
        if (params.data?.row.kind === "object") {
          return params.data.row.objectDistance;
        }
        if (params.data?.row.kind === "image") {
          return undefined;
        }
        return params.data?.row.thickness;
      },
    },
    {
      headerName: "Var.",
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.thicknessSurfaceIndex === undefined) {
          return null;
        }
        const mode = thicknessModes.find((entry) => entry.surfaceIndex === params.data.thicknessSurfaceIndex);
        return (
          <SetButton
            isSet={mode?.mode !== "constant"}
            onClick={() => optimizationStore.getState().openThicknessModal(params.data.thicknessSurfaceIndex!)}
            aria-label={`Thickness mode for surface ${params.data.thicknessSurfaceIndex}`}
            setLabel="Edit"
            unsetLabel="Set"
          />
        );
      },
    },
    {
      headerName: "Medium",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind === "image") return undefined;
        return params.data.row.medium;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind === "image") return null;
        return (
          <ActionWrapper onAction={() => setMediumModalRow(params.data.row)}>
            <MediumCell medium={params.data.row.medium} onOpenModal={() => setMediumModalRow(params.data.row)} />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Semi-diam.",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind !== "surface") return undefined;
        return params.data.row.semiDiameter;
      },
    },
    {
      headerName: "Asph.",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind !== "surface") return undefined;
        return params.data.row.aspherical;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind !== "surface") return null;
        return (
          <ActionWrapper onAction={() => setAsphericalModalRow(params.data.row)}>
            <AsphericalCell isAspherical={params.data.row.aspherical !== undefined} onOpenModal={() => setAsphericalModalRow(params.data.row)} />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Tilt & Decenter",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind === "object") return undefined;
        return params.data.row.decenter;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind === "object") return null;
        return (
          <ActionWrapper onAction={() => setDecenterModalRow(params.data.row)}>
            <DecenterCell isDecenterSet={params.data.row.decenter !== undefined} onOpenModal={() => setDecenterModalRow(params.data.row)} />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Diffraction Grating",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind !== "surface") return undefined;
        return params.data.row.diffractionGrating;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind !== "surface") return null;
        return (
          <ActionWrapper onAction={() => setDiffractionGratingModalRow(params.data.row)}>
            <DiffractionGratingCell
              isDiffractionGratingSet={params.data.row.diffractionGrating !== undefined}
              onOpenModal={() => setDiffractionGratingModalRow(params.data.row)}
            />
          </ActionWrapper>
        );
      },
    },
  ];

  const operandColumns: ColDef<OperandRowView>[] = [
    {
      headerName: "Operand Kind",
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["focal_length", "f_number", "opd_difference", "rms_spot_size", "rms_wavefront_error"],
      },
      valueGetter: (params) => params.data?.kind,
      valueFormatter: (params) => {
        switch (params.value) {
          case "focal_length":
            return "Paraxial focal length";
          case "f_number":
            return "Paraxial f/#";
          case "opd_difference":
            return "OPD Difference";
          case "rms_spot_size":
            return "RMS Spot Size";
          case "rms_wavefront_error":
            return "RMS wavefront error";
          default:
            return String(params.value ?? "");
        }
      },
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        optimizationStore.getState().updateOperand(params.data.id, {
          kind: params.newValue as OptimizationOperandKind,
        });
        return true;
      },
    },
    {
      headerName: "Target",
      editable: true,
      valueGetter: (params) => params.data?.target,
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        optimizationStore.getState().updateOperand(params.data.id, {
          target: String(params.newValue),
        });
        return true;
      },
    },
    {
      headerName: "Weight",
      editable: true,
      valueGetter: (params) => params.data?.weight,
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        optimizationStore.getState().updateOperand(params.data.id, {
          weight: String(params.newValue),
        });
        return true;
      },
    },
    {
      headerName: "",
      cellRenderer: (params: { data: OperandRowView }) => (
        <Button
          variant="danger"
          size="xs"
          aria-label={`Delete operand ${params.data.id}`}
          onClick={() => optimizationStore.getState().deleteOperand(params.data.id)}
        >
          Delete
        </Button>
      ),
    },
  ];

  const tabs: TabItem[] = [
    { id: "algorithm", label: "Algorithm", content: algorithmTab },
    {
      id: "fields",
      label: "Fields",
      content: (
        <div className="p-4">
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact theme={gridTheme} rowData={fieldRows} columnDefs={weightColumns} domLayout="autoHeight" />
          </AgGridProvider>
        </div>
      ),
    },
    {
      id: "wavelengths",
      label: "Wavelengths",
      content: (
        <div className="p-4">
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact theme={gridTheme} rowData={wavelengthRows} columnDefs={weightColumns} domLayout="autoHeight" />
          </AgGridProvider>
        </div>
      ),
    },
    {
      id: "lens-prescription",
      label: "Lens Prescription",
      content: (
        <div className="p-4">
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact theme={gridTheme} rowData={radiusRows} columnDefs={lensColumns} domLayout="autoHeight" />
          </AgGridProvider>
        </div>
      ),
    },
    {
      id: "operands",
      label: "Operands",
      content: (
        <div className="space-y-4 p-4">
          <Button variant="secondary" size="sm" aria-label="Add operand" onClick={() => optimizationStore.getState().addOperand()}>
            Add Operand
          </Button>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={operands as OperandRowView[]}
              columnDefs={operandColumns}
              domLayout="autoHeight"
            />
          </AgGridProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto p-4">
      {isOptimizing && (
        <LoadingOverlay
          title="Optimizing"
          contents="Running optimization in Pyodide…"
        />
      )}

      <div className="mb-4 flex gap-3">
        <Button
          variant="primary"
          aria-label="Optimize"
          onClick={() => void handleOptimize()}
          disabled={!isReady || proxy === undefined || optimizationModel === undefined || isOptimizing}
        >
          Optimize
        </Button>
        <Button
          variant="primary"
          aria-label="Apply to Editor"
          onClick={() => optimizationStore.getState().openApplyConfirm()}
          disabled={optimizationModel === undefined}
        >
          Apply to Editor
        </Button>
      </div>

      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={(tabId) => optimizationStore.getState().setActiveTabId(tabId)}
        panelClassName="rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700"
      />

      <Modal
        isOpen={radiusModal.open && optimizationModel !== undefined && radiusModal.surfaceIndex !== undefined}
        title="Radius Variable / Pickup"
        onBackdropClick={() => optimizationStore.getState().closeRadiusModal()}
      >
        {radiusModal.surfaceIndex !== undefined && optimizationModel !== undefined && selectedRadiusMode !== undefined ? (
          <div className="space-y-4">
            <Paragraph>
              {getRadiusLabel(radiusModal.surfaceIndex, optimizationModel)} radius: {getRadiusValue(optimizationModel, radiusModal.surfaceIndex)}
            </Paragraph>
            <div>
              <Label htmlFor="radius-mode">Mode</Label>
              <Select
                id="radius-mode"
                aria-label="Radius mode"
                value={selectedRadiusMode.mode}
                options={[
                  { label: "constant", value: "constant" },
                  { label: "variable", value: "variable" },
                  { label: "pickup", value: "pickup" },
                ]}
                onChange={(event) => {
                  const mode = event.target.value as RadiusChoice;
                  if (mode === "constant") {
                    optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, { mode });
                  } else if (mode === "variable") {
                    optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                      mode,
                      min: String(getRadiusValue(optimizationModel, radiusModal.surfaceIndex!)),
                      max: String(getRadiusValue(optimizationModel, radiusModal.surfaceIndex!)),
                    });
                  } else {
                    optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                      mode,
                      sourceSurfaceIndex: "1",
                      scale: "1",
                      offset: "0",
                    });
                  }
                }}
              />
            </div>

            {selectedRadiusMode.mode === "variable" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="radius-min">Min.</Label>
                  <Input
                    id="radius-min"
                    aria-label="Min."
                    value={selectedRadiusMode.min}
                    onChange={(event) =>
                      optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                        ...selectedRadiusMode,
                        min: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="radius-max">Max.</Label>
                  <Input
                    id="radius-max"
                    aria-label="Max."
                    value={selectedRadiusMode.max}
                    onChange={(event) =>
                      optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                        ...selectedRadiusMode,
                        max: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {selectedRadiusMode.mode === "pickup" && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="pickup-source">Source surface index</Label>
                  <Input
                    id="pickup-source"
                    aria-label="Source surface index"
                    value={selectedRadiusMode.sourceSurfaceIndex}
                    onChange={(event) =>
                      optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                        ...selectedRadiusMode,
                        sourceSurfaceIndex: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pickup-scale">scale</Label>
                  <Input
                    id="pickup-scale"
                    aria-label="scale"
                    value={selectedRadiusMode.scale}
                    onChange={(event) =>
                      optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                        ...selectedRadiusMode,
                        scale: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pickup-offset">offset</Label>
                  <Input
                    id="pickup-offset"
                    aria-label="offset"
                    value={selectedRadiusMode.offset}
                    onChange={(event) =>
                      optimizationStore.getState().setRadiusMode(radiusModal.surfaceIndex!, {
                        ...selectedRadiusMode,
                        offset: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => optimizationStore.getState().closeRadiusModal()}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={thicknessModal.open && optimizationModel !== undefined && thicknessModal.surfaceIndex !== undefined}
        title="Thickness Variable / Pickup"
        onBackdropClick={() => optimizationStore.getState().closeThicknessModal()}
      >
        {thicknessModal.surfaceIndex !== undefined && optimizationModel !== undefined && selectedThicknessMode !== undefined ? (
          <div className="space-y-4">
            <Paragraph>
              {getRadiusLabel(thicknessModal.surfaceIndex, optimizationModel)} thickness: {optimizationModel.surfaces[thicknessModal.surfaceIndex - 1]?.thickness ?? 0}
            </Paragraph>
            <div>
              <Label htmlFor="thickness-mode">Mode</Label>
              <Select
                id="thickness-mode"
                aria-label="Thickness mode"
                value={selectedThicknessMode.mode}
                options={[
                  { label: "constant", value: "constant" },
                  { label: "variable", value: "variable" },
                  { label: "pickup", value: "pickup" },
                ]}
                onChange={(event) => {
                  const mode = event.target.value as RadiusChoice;
                  const currentThickness = optimizationModel.surfaces[thicknessModal.surfaceIndex! - 1]?.thickness ?? 0;
                  if (mode === "constant") {
                    optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, { mode });
                  } else if (mode === "variable") {
                    optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                      mode,
                      min: String(currentThickness),
                      max: String(currentThickness),
                    });
                  } else {
                    optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                      mode,
                      sourceSurfaceIndex: "1",
                      scale: "1",
                      offset: "0",
                    });
                  }
                }}
              />
            </div>

            {selectedThicknessMode.mode === "variable" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="thickness-min">Min.</Label>
                  <Input
                    id="thickness-min"
                    aria-label="Thickness Min."
                    value={selectedThicknessMode.min}
                    onChange={(event) =>
                      optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                        ...selectedThicknessMode,
                        min: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="thickness-max">Max.</Label>
                  <Input
                    id="thickness-max"
                    aria-label="Thickness Max."
                    value={selectedThicknessMode.max}
                    onChange={(event) =>
                      optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                        ...selectedThicknessMode,
                        max: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {selectedThicknessMode.mode === "pickup" && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="pickup-thickness-source">Source surface index</Label>
                  <Input
                    id="pickup-thickness-source"
                    aria-label="Thickness source surface index"
                    value={selectedThicknessMode.sourceSurfaceIndex}
                    onChange={(event) =>
                      optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                        ...selectedThicknessMode,
                        sourceSurfaceIndex: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pickup-thickness-scale">scale</Label>
                  <Input
                    id="pickup-thickness-scale"
                    aria-label="Thickness scale"
                    value={selectedThicknessMode.scale}
                    onChange={(event) =>
                      optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                        ...selectedThicknessMode,
                        scale: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pickup-thickness-offset">offset</Label>
                  <Input
                    id="pickup-thickness-offset"
                    aria-label="Thickness offset"
                    value={selectedThicknessMode.offset}
                    onChange={(event) =>
                      optimizationStore.getState().setThicknessMode(thicknessModal.surfaceIndex!, {
                        ...selectedThicknessMode,
                        offset: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => optimizationStore.getState().closeThicknessModal()}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={warningModal.open} title="Warning">
        <Paragraph className="mb-6">{warningModal.message}</Paragraph>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => optimizationStore.getState().closeWarningModal()}>
            OK
          </Button>
        </div>
      </Modal>

      <Modal isOpen={applyConfirmOpen} title="Apply to Editor">
        <Paragraph className="mb-6">
          This will overwrite the lens prescription in the editor. Continue?
        </Paragraph>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => optimizationStore.getState().closeApplyConfirm()}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleApplyToEditor()}>
            Apply
          </Button>
        </div>
      </Modal>

      <MediumSelectorModal
        isOpen={mediumModalRow !== undefined}
        initialMedium={mediumModalRow?.kind === "surface" || mediumModalRow?.kind === "object" ? mediumModalRow.medium : "air"}
        initialManufacturer={mediumModalRow?.kind === "surface" || mediumModalRow?.kind === "object" ? mediumModalRow.manufacturer : ""}
        allowReflective={mediumModalRow?.kind !== "object"}
        readOnly
        onConfirm={() => undefined}
        onClose={() => setMediumModalRow(undefined)}
      />

      <AsphericalModal
        isOpen={asphericalModalRow?.kind === "surface"}
        readOnly
        initialConicConstant={asphericalModalRow?.kind === "surface" ? (asphericalModalRow.aspherical?.conicConstant ?? 0) : 0}
        initialType={asphericalModalRow?.kind === "surface" ? (asphericalModalRow.aspherical?.kind ?? "Conic") : "Conic"}
        initialCoefficients={
          asphericalModalRow?.kind === "surface" && asphericalModalRow.aspherical !== undefined && "polynomialCoefficients" in asphericalModalRow.aspherical
            ? asphericalModalRow.aspherical.polynomialCoefficients
            : []
        }
        initialToricSweepRadiusOfCurvature={
          asphericalModalRow?.kind === "surface" && asphericalModalRow.aspherical !== undefined && "toricSweepRadiusOfCurvature" in asphericalModalRow.aspherical
            ? asphericalModalRow.aspherical.toricSweepRadiusOfCurvature
            : 0
        }
        onConfirm={() => undefined}
        onClose={() => setAsphericalModalRow(undefined)}
        onRemove={() => undefined}
      />

      <DecenterModal
        isOpen={decenterModalRow !== undefined}
        readOnly
        initialDecenter={decenterModalRow?.kind !== "object" ? decenterModalRow?.decenter : undefined}
        onConfirm={() => undefined}
        onClose={() => setDecenterModalRow(undefined)}
        onRemove={() => undefined}
      />

      <DiffractionGratingModal
        isOpen={diffractionGratingModalRow?.kind === "surface"}
        readOnly
        initialDiffractionGrating={diffractionGratingModalRow?.kind === "surface" ? diffractionGratingModalRow.diffractionGrating : undefined}
        onConfirm={() => undefined}
        onClose={() => setDiffractionGratingModalRow(undefined)}
        onRemove={() => undefined}
      />
    </div>
  );
}
