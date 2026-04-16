# `features/optimization/components/OptimizationOperandsTab.tsx`

Renders the editable operands tab with AG Grid column definitions, add/delete actions, and operand update callbacks.

- Keeps the add button above the grid inside a padded wrapper with horizontal overflow support.
- Uses AG Grid `domLayout="autoHeight"` and does not add a vertical overflow wrapper so the surrounding drawer/page layout remains the only vertical scroller.
