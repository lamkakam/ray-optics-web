# `features/optimization/components/BottomDrawerContainer/BottomDrawerContainer.tsx`

## Purpose

Container for the optimization page bottom drawer. It owns the five optimization drawer tabs, responsive drawer wrapper, and optimization-store-backed tab callbacks.

## Props

```ts
interface BottomDrawerContainerProps {
  layout: {
    isLG: boolean;
    onHeightChange?: (height: number) => void;
  };
  fields: Pick<ComponentProps<typeof OptimizationWeightsGrid>, "rows">;
  wavelengths: Pick<ComponentProps<typeof OptimizationWeightsGrid>, "rows">;
  prescription: Omit<
    OptimizationLensPrescriptionGridProps,
    | "radiusModes"
    | "thicknessModes"
    | "asphereStates"
    | "onOpenRadiusModal"
    | "onOpenThicknessModal"
    | "onOpenAsphereVarModal"
  >;
}
```

- `layout` controls responsive drawer behavior:
  - `isLG` switches between draggable large-screen rendering and non-draggable small-screen rendering.
  - `onHeightChange` receives live drawer height changes when provided.
- `fields.rows` provides derived field weight rows.
- `wavelengths.rows` provides derived wavelength weight rows.
- `prescription` provides derived prescription rows plus local inspection-modal callbacks. Optimization variable modal callbacks and mode state are read from the optimization store.

## Behavior

- Builds the drawer tabs in the fixed order `Algorithm`, `Fields`, `Wavelengths`, `Lens Prescription`, and `Operands`.
- Keeps `data-testid="optimization-bottom-drawer-wrapper"` on the wrapper for existing page tests.
- Uses `mt-auto pb-4` on large screens and `pb-4` on smaller screens.
- Passes `panelClassName="p-0"` so tab contents keep their own gutter.
- Sets `draggable` from `layout.isLG`.
- Reads the optimization store for active tab state, optimizer state, radius/thickness/asphere modes, operands, and all store-backed drawer callbacks.
- Handles optimizer patch updates locally, including optimizer-kind resets through `setOptimizerKind()` and method-change config validation warnings.
- Updates field and wavelength weights through the optimization store.
- Opens radius, thickness, and asphere variable modals through the optimization store while forwarding inspection-modal callbacks supplied by `OptimizationPage`.
- Adds, deletes, and updates operands through the optimization store.

## Key Conventions

- This component preserves drawer tab labels, test IDs, padding, and tab component behavior from the previous page-local drawer implementation.
- Props are grouped to keep the component interface below the project prop-count limit while making tab ownership explicit.
- `OptimizationPage` remains responsible for deriving row data and owning local inspection-modal row state; store-backed drawer actions live here.
