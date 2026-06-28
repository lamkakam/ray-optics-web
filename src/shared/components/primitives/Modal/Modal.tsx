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
  readonly isOpen: boolean;
  readonly title: string;
  readonly titleId?: string;
  readonly size?: ModalSize;
  readonly onBackdropClick?: () => void;
  readonly footer?: React.ReactNode;
  readonly children: React.ReactNode;
}

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
