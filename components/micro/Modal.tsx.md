# `components/micro/Modal.tsx`

## Purpose

Accessible modal dialog shell. Renders a backdrop, a scrollable panel, and a title. Does not manage its own open/close state — callers pass `isOpen`.

## Props

```ts
type ModalSize = "md" | "lg" | "4xl";

interface ModalProps {
  isOpen: boolean;
  title: string;
  titleId?: string;
  size?: ModalSize;
  onBackdropClick?: () => void;
  children: React.ReactNode;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | When `false`, renders nothing |
| `title` | `string` | Yes | Displayed as an `h2` at the top of the panel; also the `aria-labelledby` target |
| `titleId` | `string` | No | Custom id for the title element. Auto-generated with `useId` if omitted |
| `size` | `ModalSize` | No | Max-width of the panel. Defaults to `"md"` |
| `onBackdropClick` | `() => void` | No | Called when the semi-transparent backdrop is clicked |

## Key Behaviors

- Returns `null` when `isOpen` is `false` (no DOM presence).
- Panel carries `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- `onKeyDown` on the outer wrapper calls `stopPropagation` to prevent key events from leaking to the page.
- Panel animates in via `animate-modal-enter` CSS class.
- Panel is scrollable (`overflow-y-auto`) with a max height of 90dvh.

## Usages

- Extended by every modal in `components/composite/` and `components/micro/ErrorModal`.
