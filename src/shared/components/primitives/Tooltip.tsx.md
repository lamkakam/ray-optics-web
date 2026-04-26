# `shared/components/primitives/Tooltip.tsx`

## Purpose

Hover tooltip with two rendering modes: a CSS `group-hover` absolute variant (default) and a `portal` variant that renders via `createPortal` into `document.body` to avoid overflow-hidden clipping inside AG Grid cells.

## Props

```ts
interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "top-start" | "start" | "no-transform";
  portal?: boolean;
  noTouch?: boolean;
  triggerClassName?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | Yes | Tooltip content |
| `children` | `React.ReactNode` | Yes | Trigger element |
| `position` | `string` | No | Placement relative to trigger. Defaults to `"top"` |
| `portal` | `boolean` | No | When `true`, renders via `createPortal` using fixed positioning. Required inside AG Grid cells. Defaults to `false` |
| `noTouch` | `boolean` | No | When `true`, applies `touch-action: none` inline style to the wrapper span and, in portal mode, uses a `touchstart` ref flag to suppress the synthetic `mouseenter` browsers fire after touch (since `touch-action: none` alone does not suppress those events). Defaults to `false` |
| `triggerClassName` | `string` | No | Additional classes for the trigger wrapper span. Use this when the hover target must fill its parent, such as an AG Grid cell action area. |

## Internal State

- `visible: boolean` — portal mode only; controls opacity.
- `coords: { x, y }` — portal mode only; stores measured trigger position.
- `isTouchingRef: React.MutableRefObject<boolean>` — portal mode only; set to `true` on `touchstart` to detect synthetic mouse events from touch sequences.

## Key Behaviors

- **Non-portal mode**: uses CSS `group-hover:opacity-100` on an absolutely positioned `<span>`.
- **Portal mode**: attaches `onMouseEnter`/`onMouseLeave` listeners, measures the trigger rect via `getBoundingClientRect`, and renders a fixed `<span>` at those coordinates.
- `triggerClassName` is merged onto the trigger wrapper in both portal and non-portal modes without changing default inline-flex behavior.
- `portal` must be `true` when the tooltip is rendered inside any element with `overflow: hidden` (e.g. AG Grid rows).
- **`noTouch` mode**: applies `style={{ touchAction: "none" }}` to the wrapper span. In portal mode, also attaches an `onTouchStart` handler that sets `isTouchingRef.current = true`. When `onMouseEnter` fires and `noTouch && isTouchingRef.current` is true (i.e., the enter was synthesized from a touch tap), the handler resets the flag and returns early without showing the tooltip. Plain mouse hovers are unaffected because no `touchstart` precedes them. `onMouseLeave` always resets the flag. Should be set on any `<Tooltip>` that wraps a clickable element (button, toggle, etc.).

## Usages

```tsx
// Tooltip over a grid control button
<Tooltip text="Insert row" portal noTouch>
  <Button
    variant="secondary"
    size="sm"
    onClick={onAdd}
    aria-label="Insert row"
  >
    +
  </Button>
</Tooltip>

// Tooltip with custom position
<Tooltip text="Click to configure field settings" position="top-start" noTouch>
  <Button
    variant="toggle"
    className="w-full text-left"
    onClick={onOpenFieldModal}
  >
    {fieldSummary}
  </Button>
</Tooltip>

// Portal mode for use inside overflow-hidden containers
<Tooltip text="Select medium" portal noTouch>
  <Button
    variant="secondary"
    onClick={onOpenModal}
  >
    {mediumName}
  </Button>
</Tooltip>

// Tooltip without portal (standard group-hover mode)
<Tooltip text="Hover for more info">
  <span className="cursor-help">Info</span>
</Tooltip>
```
