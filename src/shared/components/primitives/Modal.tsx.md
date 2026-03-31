# `shared/components/primitives/Modal.tsx`

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

```tsx
// Basic modal for selecting a medium
<Modal
  isOpen={isOpen}
  title="Select Medium"
  titleId="medium-modal-title"
  size="md"
  onBackdropClick={onClose}
>
  <div className="space-y-4 mb-4">
    <div>
      <Label htmlFor="manufacturer-select">
        Manufacturer
      </Label>
      <Select
        id="manufacturer-select"
        options={manufacturers}
        value={selectedManufacturer}
        onChange={handleManufacturerChange}
      />
    </div>
  </div>
  <div className="flex gap-2 justify-end">
    <Button variant="secondary" onClick={onClose}>
      Cancel
    </Button>
    <Button variant="primary" onClick={onConfirm}>
      Confirm
    </Button>
  </div>
</Modal>

// Larger modal with scrollable content
<Modal
  isOpen={isOpen}
  title="Advanced Settings"
  size="4xl"
>
  {/* Scrollable content */}
</Modal>
```
