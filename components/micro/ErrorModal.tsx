import React from "react";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface ErrorModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function ErrorModal({ isOpen, onClose }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`${cx.modal.color.backdrop} ${cx.modal.style.backdrop}`} onClick={onClose} />
      <div className={`${cx.modal.style.panel} ${cx.modal.color.panel} ${cx.modal.size.panel} max-w-md`} role="dialog" aria-modal="true">
        <h2 className={`${cx.modal.style.title} ${cx.modal.color.title}`}>Error</h2>
        <p className={`mb-6 text-sm ${cx.text.color.body}`}>
          The input parameters are invalid. Please check your specifications and
          prescription.
        </p>
        <div className="flex justify-end">
          <button type="button" className={`${cx.button.style.base} ${cx.button.color.primary} ${cx.button.size.md}`} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
