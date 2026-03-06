import React from "react";
import { cx } from "@/components/ui/modalTokens";

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
          title={addLabel}
          aria-label={addLabel}
          className={cx.btnIconAdd}
          style={addHidden ? { visibility: "hidden" } : undefined}
          onClick={onAdd}
        >
          +
        </button>
      )}
      {onDelete !== undefined && (
        <button
          type="button"
          title={deleteLabel}
          aria-label={deleteLabel}
          className={cx.btnIconDelete}
          onClick={onDelete}
        >
          −
        </button>
      )}
    </span>
  );
}
