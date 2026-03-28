# GlassDetailPanel.tsx

## Purpose
Displays details for the currently selected glass point. Shows a placeholder when no glass is selected.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `selectedGlass` | `SelectedGlass \| undefined` | Glass to display; `undefined` shows placeholder |

## Behavior
- When `selectedGlass` is `undefined`: renders "Select a glass point on the chart to see details."
- When `selectedGlass` is set: renders catalog name, glass name, and a property table with:
  - Nd, Ne, Vd, Ve
  - P_g,F (if defined)
  - P_F,d (if defined)
  - P_F,e (if defined)
