import React from "react";
import { Button } from "@/components/micro/Button";
import { Tooltip } from "@/components/micro/Tooltip";

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
        <Tooltip text={addLabel} portal noTouch>
          <Button
            variant="secondary"
            size="sm"
            className="rounded"
            title={addLabel}
            aria-label={addLabel}
            style={addHidden ? { visibility: "hidden" } : undefined}
            onClick={onAdd}
          >
            +
          </Button>
        </Tooltip>
      )}
      {onDelete !== undefined && (
        <Tooltip text={deleteLabel} portal noTouch>
          <Button
            variant="secondary"
            size="sm"
            className="rounded"
            title={deleteLabel}
            aria-label={deleteLabel}
            onClick={onDelete}
          >
            −
          </Button>
        </Tooltip>
      )}
    </span>
  );
}
