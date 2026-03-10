"use client";

import React, { useId } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface ModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly titleId?: string;
  readonly maxWidth?: string;
  readonly onBackdropClick?: () => void;
  readonly children: React.ReactNode;
}

export function Modal({ isOpen, title, titleId, maxWidth = "max-w-md", onBackdropClick, children }: ModalProps) {
  const generatedId = useId();
  const resolvedTitleId = titleId ?? generatedId;

  if (!isOpen) return null;

  const backdrop = clsx(cx.modal.color.backdropBgColor, cx.modal.style.backdropBlur);
  const panel = clsx(cx.modal.size.panelWidth, cx.modal.style.panelBorderRadius, cx.modal.color.panelBorderColor, cx.modal.color.panelBgColor, cx.modal.size.panelPadding, cx.modal.style.panelShadow);
  const titleClass = clsx(cx.modal.style.titleFontWeight, cx.modal.size.titleFontSize, cx.modal.size.titleMargin, cx.modal.size.titlePadding, cx.modal.color.titleBorderColor, cx.modal.color.titleTextColor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div data-testid="modal-backdrop" className={`absolute inset-0 ${backdrop}`} onClick={onBackdropClick} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        className={`relative z-10 border animate-modal-enter ${panel} ${maxWidth}`}
      >
        <h2 id={resolvedTitleId} className={`border-b ${titleClass}`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
