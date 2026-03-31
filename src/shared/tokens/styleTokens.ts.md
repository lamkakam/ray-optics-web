# `shared/tokens/styleTokens.ts`

## Purpose

Centralized design-token system for Tailwind CSS class strings. Provides a nested `componentTokens` object (aliased `cx`) consumed by all micro-components, ensuring consistent theming and a single place to update visual design.

## Exports

```ts
export const componentTokens: { /* nested per-component tokens */ }
```

## Token Structure

Tokens are organized as:

```
componentTokens
  .<component>       // button, input, select, modal, header, label, chip, tooltip, tab, text, overlay
    .color           // text, background, border, focus-ring colors
    .size            // padding, font-size, width, margin tokens
    .style           // border-radius, font-weight, opacity, cursor, z-index tokens
```

A private `globalTokens` object holds reusable primitives (e.g. `primaryColor`, `inputBorder`, `surfaceBg`). Component tokens reference these via a local alias `g`.

## Key Conventions

- All values are literal Tailwind class strings (no dynamic generation).
- Dark mode variants are included inline: e.g. `"bg-gray-100 dark:bg-gray-800"`.
- Components import via `import { componentTokens as cx } from "@/shared/tokens/styleTokens"` and destructure the relevant sub-object.
- `overlay` tokens have `z-[200]` — the highest z-index in the stack, above `Modal`'s `z-50`.

## Usages

- Imported by every component in `components/micro/` and by `AnalysisPlotView` in `components/composite/`.
