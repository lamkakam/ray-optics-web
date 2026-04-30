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
  .<component>       // button, checkbox, radio, switch, progress, input, select, modal, header, label, chip, tooltip, tab, text, navLink, externalLink, overlay, menuContainer, descriptionContainer
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
- `switch` tokens define checked/unchecked track colors, fixed `sm`/`md` dimensions, thumb translate offsets, content offsets, transition classes, and `will-change-transform`.
- `progress` tokens define linear track, indicator, status text, fixed `sm`/`md` dimensions, rounded shape, transition, and `will-change` classes.
- `input.style.opacity` and `input.style.cursor` reference the shared disabled-state tokens from `globalTokens.style`, matching `select` so both primitives use the same tokenized disabled behavior.
- `switch.style.opacity` and `switch.style.cursor` also reference the shared disabled-state tokens from `globalTokens.style`.
- `externalLink` tokens define theme-aware blue text, hover text, underline decoration colors, `text-sm`, `font-medium`, underline offset, transition, and focus-visible ring styling for plain external anchors.
- `overlay` tokens have `z-[200]` — the highest z-index in the stack, above `Modal`'s `z-50`.
- `menuContainer` and `descriptionContainer` reuse global surface, border, and secondary text tokens for the example-systems page primitives.

## Usages

- Imported by every component in `components/micro/` and by `AnalysisPlotView` in `components/composite/`.
