"use client";

import React, { useId } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Header } from "@/components/micro/Header";

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
  readonly children: React.ReactNode;
}

export function Modal({ isOpen, title, titleId, size = "md", onBackdropClick, children }: ModalProps) {
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
      <div data-testid="modal-backdrop" className={`absolute inset-0 ${backdrop}`} onClick={onBackdropClick} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        className={`relative z-10 border animate-modal-enter ${panel} ${sizeClasses[size]}`}
      >
        <Header level={2} variant="modal" id={resolvedTitleId} className={titleBorderClass}>{title}</Header>
        {children}
      </div>
    </div>
  );
}
