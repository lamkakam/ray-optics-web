"use client";
/**
 * Per-group presentation for `ParameterModeModal`: titles, labels, accessible
 * names, element ids, pickup source choices, and qualifier selectors. The
 * `satisfies` clause requires an entry for every parameter group, so a new
 * optimizable property gets its modal by adding one entry here.
 */
import type React from "react";
import { MathJax } from "better-react-mathjax";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import type { SelectOption } from "@/shared/components/primitives/Select";
import {
  getRadiusPickupSourceSurfaceOptions,
  getThicknessPickupSourceSurfaceOptions,
} from "@/features/optimization/lib/modalHelpers";
import {
  getRadiusValue,
  getThicknessValue,
} from "@/features/optimization/lib/optimizationViewModels";
import type {
  ParameterComponent,
  ParameterGroupKey,
  ParameterQualifierByGroup,
} from "@/features/optimization/lib/parameters/parameterGroups";
import type { SourceSurfaceSelectOption } from "@/features/optimization/types/optimizationModalTypes";
import type { RadiusRow } from "@/features/optimization/lib/optimizationViewModels";
import type { SurfacePropertyUiKey } from "@/shared/lib/optical-model/surface-properties/registry.ui";

/** Prescription column a group's `Var.` column follows. */
export type VarColumnAnchor =
  | "radiusOfCurvature"
  | "thickness"
  | SurfacePropertyUiKey;

/** Labels, accessible names, and element ids for one component's mode controls. */
export interface ParameterComponentLabels {
  /** Row label shown beside the mode selector in multi-component groups. */
  readonly displayLabel?: React.ReactNode;
  /** Name used in bounds validation messages. */
  readonly boundsLabel: string;
  readonly modeId: string;
  /** Visible label of the mode selector in single-component groups. */
  readonly modeLabel?: string;
  readonly modeAriaLabel: string;
  readonly variableIdPrefix: string;
  readonly minAriaLabel: string;
  readonly maxAriaLabel: string;
  readonly pickupIdPrefix: string;
  readonly sourceAriaLabel: string;
  readonly scaleLabel?: string;
  readonly scaleAriaLabel: string;
  readonly offsetLabel?: string;
  readonly offsetAriaLabel: string;
}

/** Presentation of one parameter group's variable/pickup modal and grid `Var.` column. */
export interface ParameterModeUi<TGroup extends ParameterGroupKey> {
  readonly title: string;
  /** `Var.` column placement, applicable rows, and its cell button copy. */
  readonly varColumn: {
    readonly after: VarColumnAnchor;
    /** The row's group surface index, or `undefined` for rows without this parameter. */
    readonly surfaceIndexOf: (row: RadiusRow) => number | undefined;
    /** Accessible-name prefix, e.g. `Radius` in `Radius mode for surface 1`. */
    readonly ariaNoun: string;
    readonly tooltip: string;
  };
  readonly size?: "lg";
  /** Pickup source surfaces for a target surface. */
  readonly sourceOptions: (
    model: OpticalModel,
    surfaceIndex: number,
  ) => SourceSurfaceSelectOption[];
  /**
   * Single-component groups show the current value and seed variable bounds from
   * it; multi-component groups list one row per component instead.
   */
  readonly currentValue?: {
    readonly noun: string;
    readonly read: (model: OpticalModel, surfaceIndex: number) => number;
  };
  /** Selector for the group's qualifier (asphere kind or decenter strategy). */
  readonly qualifierSelect?: {
    readonly id: string;
    readonly ariaLabel: string;
    readonly options: ReadonlyArray<SelectOption>;
    readonly placeholder?: string;
  };
  /** Component order in the modal; defaults to the group's emission order. */
  readonly orderComponents?: (
    components: readonly ParameterComponent[],
  ) => readonly ParameterComponent[];
  readonly componentLabels: (
    component: ParameterComponent,
    qualifier: ParameterQualifierByGroup[TGroup] | undefined,
  ) => ParameterComponentLabels;
  /** Source-coefficient choices for coefficient pickups, from the source surface's asphere. */
  readonly sourceCoefficientOptions?: (
    model: OpticalModel,
    sourceSurfaceIndex: string,
  ) => ReadonlyArray<SelectOption>;
}

function multiComponentLabels(
  rowId: string,
  label: string,
  idPrefix: string,
  sourceAriaLabel: string,
  displayLabel: React.ReactNode = label,
): ParameterComponentLabels {
  return {
    displayLabel,
    boundsLabel: label,
    modeId: `${rowId}-mode`,
    modeAriaLabel: `${label} mode`,
    variableIdPrefix: idPrefix,
    minAriaLabel: `${label} Min.`,
    maxAriaLabel: `${label} Max.`,
    pickupIdPrefix: idPrefix,
    sourceAriaLabel,
    scaleLabel: "Scale",
    scaleAriaLabel: `${label} scale`,
    offsetLabel: "Offset",
    offsetAriaLabel: `${label} offset`,
  };
}

const DECENTER_LABELS: Record<string, string> = {
  alpha: "Alpha",
  beta: "Beta",
  gamma: "Gamma",
  x: "Offset X",
  y: "Offset Y",
};

/** Radial order label (`a_2`, `a_4`, … or `a_1`, `a_2`, …) of coefficient `index`. */
function coefficientLabel(index: number, radial: boolean): string {
  return `a_${radial ? index + 1 : (index + 1) * 2}`;
}

/** Presentation of every parameter group's modal. */
export const PARAMETER_MODE_UI = {
  radius: {
    title: "Radius Variable / Pickup",
    varColumn: {
      after: "radiusOfCurvature",
      surfaceIndexOf: (row) => row.radiusSurfaceIndex,
      ariaNoun: "Radius",
      tooltip: "Click to configure radius variable or pickup",
    },
    sourceOptions: (model, surfaceIndex) =>
      getRadiusPickupSourceSurfaceOptions(model.surfaces.length, surfaceIndex),
    currentValue: { noun: "radius", read: getRadiusValue },
    componentLabels: () => ({
      boundsLabel: "Radius",
      modeId: "radius-mode",
      modeLabel: "Mode",
      modeAriaLabel: "Radius mode",
      variableIdPrefix: "radius",
      minAriaLabel: "Min.",
      maxAriaLabel: "Max.",
      pickupIdPrefix: "pickup",
      sourceAriaLabel: "Source surface",
      scaleAriaLabel: "scale",
      offsetAriaLabel: "offset",
    }),
  },
  thickness: {
    title: "Thickness Variable / Pickup",
    varColumn: {
      after: "thickness",
      surfaceIndexOf: (row) => row.thicknessSurfaceIndex,
      ariaNoun: "Thickness",
      tooltip: "Click to configure thickness variable or pickup",
    },
    sourceOptions: (model, surfaceIndex) =>
      getThicknessPickupSourceSurfaceOptions(
        model.surfaces.length,
        surfaceIndex,
      ),
    currentValue: { noun: "thickness", read: getThicknessValue },
    componentLabels: () => ({
      boundsLabel: "Thickness",
      modeId: "thickness-mode",
      modeLabel: "Mode",
      modeAriaLabel: "Thickness mode",
      variableIdPrefix: "thickness",
      minAriaLabel: "Thickness Min.",
      maxAriaLabel: "Thickness Max.",
      pickupIdPrefix: "pickup-thickness",
      sourceAriaLabel: "Source surface",
      scaleAriaLabel: "Thickness scale",
      offsetAriaLabel: "Thickness offset",
    }),
  },
  aspherical: {
    title: "Asphere Variable / Pickup",
    varColumn: {
      after: "aspherical",
      surfaceIndexOf: (row) =>
        row.row.kind === "surface" ? row.radiusSurfaceIndex : undefined,
      ariaNoun: "Asphere",
      tooltip: "Click to configure asphere variable or pickup",
    },
    size: "lg",
    sourceOptions: (model, surfaceIndex) =>
      getThicknessPickupSourceSurfaceOptions(
        model.surfaces.length,
        surfaceIndex,
      ),
    qualifierSelect: {
      id: "asphere-type",
      ariaLabel: "Asphere type",
      placeholder: "—",
      options: [
        { value: "Conic", label: "Conic" },
        { value: "EvenAspherical", label: "Even Aspheric" },
        { value: "RadialPolynomial", label: "Radial Polynomial" },
        { value: "XToroid", label: "X Toroid" },
        { value: "YToroid", label: "Y Toroid" },
      ],
    },
    orderComponents: (components) => [
      ...components.filter(({ key }) => key === "conic"),
      ...components.filter(({ key }) => key === "toricSweep"),
      ...components.filter(({ key }) => key.startsWith("coefficient:")),
    ],
    componentLabels: (component, kind) => {
      if (component.key === "conic") {
        return multiComponentLabels(
          "conic",
          "Conic Constant",
          "conic",
          "Source surface",
        );
      }
      if (component.key === "toricSweep") {
        return multiComponentLabels(
          "toricSweep",
          "Toroid sweep R",
          "toricSweep",
          "Source surface",
        );
      }
      const index = component.coefficientIndex ?? 0;
      const label = coefficientLabel(index, kind === "RadialPolynomial");
      return multiComponentLabels(
        `coeff-${index}`,
        label,
        `coeff-${index}`,
        "Source surface",
        <MathJax inline>{`\\(a_{${label.replace("a_", "")}}\\)`}</MathJax>,
      );
    },
    sourceCoefficientOptions: (model, sourceSurfaceIndex) => {
      const radial =
        model.surfaces[Number.parseInt(sourceSurfaceIndex, 10) - 1]?.aspherical
          ?.kind === "RadialPolynomial";
      return Array.from({ length: 10 }, (_, index) => ({
        value: index,
        label: coefficientLabel(index, radial),
      }));
    },
  },
  decenter: {
    title: "Tilt & Decenter Variable / Pickup",
    varColumn: {
      after: "decenter",
      surfaceIndexOf: (row) =>
        row.row.kind === "object" ? undefined : row.radiusSurfaceIndex,
      ariaNoun: "Tilt and decenter",
      tooltip: "Click to configure tilt and decenter variable or pickup",
    },
    size: "lg",
    sourceOptions: (model, surfaceIndex) =>
      getRadiusPickupSourceSurfaceOptions(model.surfaces.length, surfaceIndex),
    qualifierSelect: {
      id: "decenter-type",
      ariaLabel: "Tilt and decenter type",
      options: ["bend", "dec and return", "decenter", "reverse"].map(
        (value) => ({ value, label: value }),
      ),
    },
    componentLabels: (component) => {
      const label = DECENTER_LABELS[component.key] ?? component.key;
      return multiComponentLabels(
        component.key,
        label,
        `decenter-${component.key}`,
        `${label} source surface`,
      );
    },
  },
} as const satisfies {
  readonly [TGroup in ParameterGroupKey]: ParameterModeUi<TGroup>;
};
