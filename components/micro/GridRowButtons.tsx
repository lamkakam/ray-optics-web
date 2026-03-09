import React from "react";
import { componentTokens as cx } from "@/components/ui/modalTokens";

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
          className={`${cx.button.style.iconBase} ${cx.button.color.iconAdd} ${cx.button.size.icon}`}
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
          className={`${cx.button.style.iconBase} ${cx.button.color.iconDelete} ${cx.button.size.icon}`}
          onClick={onDelete}
        >
          −
        </button>
      )}
    </span>
  );
}
