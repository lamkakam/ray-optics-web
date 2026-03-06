import React from "react";
import { cx } from "@/components/ui/modalTokens";

interface ErrorModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function ErrorModal({ isOpen, onClose }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={cx.backdrop} onClick={onClose} />
      <div className={`${cx.panel} max-w-md`} role="dialog" aria-modal="true">
        <h2 className={cx.title}>Error</h2>
        <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
          The input parameters are invalid. Please check your specifications and
          prescription.
        </p>
        <div className="flex justify-end">
          <button type="button" className={cx.btnPrimary} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
