# `components/micro/Tooltip.tsx`

## Purpose

Hover tooltip with two rendering modes: a CSS `group-hover` absolute variant (default) and a `portal` variant that renders via `createPortal` into `document.body` to avoid overflow-hidden clipping inside AG Grid cells.

## Props

```ts
interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "top-start" | "start" | "no-transform";
  portal?: boolean;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | Yes | Tooltip content |
| `children` | `React.ReactNode` | Yes | Trigger element |
| `position` | `string` | No | Placement relative to trigger. Defaults to `"top"` |
| `portal` | `boolean` | No | When `true`, renders via `createPortal` using fixed positioning. Required inside AG Grid cells. Defaults to `false` |

## Internal State

- `visible: boolean` — portal mode only; controls opacity.
- `coords: { x, y }` — portal mode only; stores measured trigger position.

## Key Behaviors

- **Non-portal mode**: uses CSS `group-hover:opacity-100` on an absolutely positioned `<span>`.
- **Portal mode**: attaches `onMouseEnter`/`onMouseLeave` listeners, measures the trigger rect via `getBoundingClientRect`, and renders a fixed `<span>` at those coordinates.
- `portal` must be `true` when the tooltip is rendered inside any element with `overflow: hidden` (e.g. AG Grid rows).

## Usages

- Used for wrapping buttons and inputables.
