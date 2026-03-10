import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";

interface ErrorModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function ErrorModal({ isOpen, onClose }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={clsx(cx.modal.color.backdropBgColor, cx.modal.style.backdrop)} onClick={onClose} />
      <div className={clsx(cx.modal.style.panel, cx.modal.color.panelBorderColor, cx.modal.color.panelBgColor, cx.modal.size.panelPadding, "max-w-md")} role="dialog" aria-modal="true">
        <h2 className={clsx(cx.modal.style.title, cx.modal.color.titleBorderColor, cx.modal.color.titleTextColor)}>Error</h2>
        <p className={clsx("mb-6 text-sm", cx.text.color.bodyTextColor)}>
          The input parameters are invalid. Please check your specifications and
          prescription.
        </p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  );
}
