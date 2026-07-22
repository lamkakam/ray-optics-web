/**
# `shared/components/primitives/Modal/Modal.tsx`
*/
"use client";

import React, { useId } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";
import { Header } from "@/shared/components/primitives/Header";

export type ModalSize = "md" | "lg" | "4xl";

const sizeClasses: Record<ModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  "4xl": "max-w-4xl",
};

interface ModalProps {
  /** When `false`, renders nothing */
  readonly isOpen: boolean;
  /** Displayed as an `h2` at the top of the panel; also the `aria-labelledby` target */
  readonly title: string;
  /** Custom id for the title element. Auto-generated with `useId` if omitted */
  readonly titleId?: string;
  /** Max-width of the panel. Defaults to `"md"` */
  readonly size?: ModalSize;
  /** Called when the semi-transparent backdrop is clicked */
  readonly onBackdropClick?: () => void;
  /** Optional fixed footer content rendered outside the scrollable body region */
  readonly footer?: React.ReactNode;
  readonly children: React.ReactNode;
}

/**
## Purpose

Accessible modal dialog shell. Renders a backdrop, a fixed title, a scrollable body region, and an optional fixed footer. Does not manage its own open/close state — callers pass `isOpen`.

## Key Behaviors

- Returns `null` when `isOpen` is `false` (no DOM presence).
- Panel carries `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- `onKeyDown` on the outer wrapper calls `stopPropagation` to prevent key events from leaking to the page.
- Panel animates in via `animate-modal-enter` CSS class.
- Panel is a flex column with `max-h-[90dvh]` and `overflow-hidden`.
- Children render inside `data-testid="modal-body"`, which owns vertical scrolling via `overflow-y-auto`.
- When `footer` is provided, it renders in `data-testid="modal-footer"` below the body with a top border and is not part of the scrollable body.

## Usages

```tsx
// Basic modal for selecting a medium
<Modal
  isOpen={isOpen}
  title="Select Medium"
  titleId="medium-modal-title"
  size="md"
  onBackdropClick={onClose}
  footer={(
    <div className="flex gap-2 justify-end">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  )}
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
</Modal>

// Larger modal with scrollable content
<Modal
  isOpen={isOpen}
  title="Advanced Settings"
  size="4xl"
>
  {/* Scrollable content *\/}
</Modal>
```
*/
export function Modal({ isOpen, title, titleId, size = "md", onBackdropClick, footer, children }: ModalProps) {
  const generatedId = useId();
  const resolvedTitleId = titleId ?? generatedId;

  if (!isOpen) return null;

  const backdrop = clsx(cx.modal.color.backdropBgColor, cx.modal.style.backdropBlur);
  const panel = clsx(cx.modal.size.panelWidth, cx.modal.style.panelBorderRadius, cx.modal.color.panelBorderColor, cx.modal.color.panelBgColor, cx.modal.size.panelPadding, cx.modal.style.panelShadow);
  const titleBorderClass = clsx("border-b", cx.modal.color.titleBorderColor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div data-testid="modal-backdrop" className={`absolute inset-0 touch-none ${backdrop}`} onClick={onBackdropClick} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        className={`relative z-10 flex max-h-[90dvh] flex-col overflow-hidden border animate-modal-enter ${panel} ${sizeClasses[size]} mx-4 sm:mx-0`}
      >
        <Header level={2} id={resolvedTitleId} className={clsx(titleBorderClass, cx.modal.size.titlePadding, cx.modal.size.titleMargin)}>{title}</Header>
        <div data-testid="modal-body" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
        {footer === undefined ? undefined : (
          <div data-testid="modal-footer" className={clsx("mt-4 border-t pt-4", cx.modal.color.titleBorderColor)}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
