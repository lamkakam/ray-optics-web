# `shared/tokens/styleTokens.ts`

## Purpose

Centralized design-token system for Tailwind CSS class strings. Provides a nested `componentTokens` object (aliased `cx`) consumed by all micro-components, ensuring consistent theming and a single place to update visual design.

## Exports

```ts
export const globalTokens: { /* shared Tailwind classes + raw ECharts theme values */ }
export const componentTokens: { /* nested per-component tokens */ }
```

## Token Structure

Tokens are organized as:

```
componentTokens
  .global            // selected references to shared global tokens
  .<component>       // button, checkbox, radio, input, select, modal, header, label, chip, tooltip, tab, text, overlay
    .color           // text, background, border, focus-ring colors
    .size            // padding, font-size, width, margin tokens
    .style           // border-radius, font-weight, opacity, cursor, z-index tokens
```

`globalTokens` holds reusable primitives (e.g. `primaryColor`, `inputBorder`, `surfaceBg`, shared hover classes) plus raw ECharts-ready theme values. Component tokens reference these via a local alias `g`.

`globalTokens.color.errorTextColor` centralizes the shared inline error text color classes and is re-exposed as `componentTokens.text.color.errorTextColor` for paragraph-style consumers.

## Key Conventions

- All values are literal Tailwind class strings (no dynamic generation).
- `globalTokens.echarts.text.light` and `.dark` expose raw hex colors for ECharts config objects, where Tailwind class strings are not usable.
- Dark mode variants are included inline: e.g. `"bg-gray-100 dark:bg-gray-800"`.
- Components import via `import { componentTokens as cx } from "@/shared/tokens/styleTokens"` and destructure the relevant sub-object.
- `button.color.toggleHoverBgColor`, `checkbox.color.hoverBgColor`, and `radio.color.hoverBgColor` all reference the same promoted global hover token.
- `overlay` tokens have `z-[200]` — the highest z-index in the stack, above `Modal`'s `z-50`.

## Usages

- Imported by every component in `components/micro/` and by `AnalysisPlotView` in `components/composite/`.
