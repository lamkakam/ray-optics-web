"use client";

import React from "react";

interface DecenterCellProps {
  readonly isDecenterSet: boolean;
  readonly onOpenModal: () => void;
}

export function DecenterCell({ isDecenterSet, onOpenModal }: DecenterCellProps) {
  return (
    <button
      type="button"
      aria-label="Edit decenter and tilt"
      onClick={onOpenModal}
      className={`px-2 py-0.5 rounded text-sm font-medium border transition-colors ${
        isDecenterSet
          ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-500 dark:text-blue-200"
          : "bg-transparent border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500"
      }`}
    >
      {isDecenterSet ? "Set" : "—"}
    </button>
  );
}
