# `shared/hooks/useAgGridTheme.ts`

## Purpose

Derive the correct AG Grid theme object from the app's current light/dark theme setting, so AG Grid tables automatically match the rest of the UI.

## Return Value

An AG Grid theme object — specifically `themeQuartz` composed with either `colorSchemeDark` or `colorSchemeLight` via `.withPart()`:

```ts
themeQuartz.withPart(colorSchemeDark)   // when theme === "dark"
themeQuartz.withPart(colorSchemeLight)  // otherwise
```

The return type is the opaque theme object accepted by AG Grid's `theme` prop.

## Behavior

1. Reads the current theme string (`"dark"` or `"light"`) from `useTheme()` (provided by `ThemeProvider`).
2. Returns a memoised theme object — recomputed only when `theme` changes.

## Dependencies

- `useMemo` from React.
- `useTheme` from `@/shared/components/providers/ThemeProvider`.
- `themeQuartz`, `colorSchemeDark`, `colorSchemeLight` from `ag-grid-community`.

## Edge Cases / Error Handling

- Any value of `theme` that is not `"dark"` falls through to the light scheme (safe default).
- The memoised value is stable across re-renders when `theme` does not change, preventing unnecessary AG Grid re-renders.

## Usages

```tsx
"use client";

import { AgGridReact } from "ag-grid-react";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";

export function DataGrid() {
  const agTheme = useAgGridTheme();

  return (
    <AgGridReact
      columnDefs={[
        { field: "name" },
        { field: "age" },
      ]}
      rowData={[
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ]}
      theme={agTheme}
    />
  );
}
```

The theme automatically responds to light/dark mode changes from `ThemeProvider`.
