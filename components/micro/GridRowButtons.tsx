import React from "react";

interface GridRowButtonsProps {
  readonly onAdd?: () => void;
  readonly onDelete?: () => void;
  readonly addHidden?: boolean;
  readonly addLabel?: string;
  readonly deleteLabel?: string;
}

export function GridRowButtons({
  onAdd,
  onDelete,
  addHidden,
  addLabel = "Insert row",
  deleteLabel = "Delete row",
}: GridRowButtonsProps) {
  return (
    <span className="flex items-center gap-2">
      {onAdd !== undefined && (
        <button
          type="button"
          aria-label={addLabel}
          className="w-6 h-6 inline-flex items-center justify-center rounded bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition cursor-pointer"
          style={addHidden ? { visibility: "hidden" } : undefined}
          onClick={onAdd}
        >
          +
        </button>
      )}
      {onDelete !== undefined && (
        <button
          type="button"
          aria-label={deleteLabel}
          className="w-6 h-6 inline-flex items-center justify-center rounded bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition cursor-pointer"
          onClick={onDelete}
        >
          −
        </button>
      )}
    </span>
  );
}
