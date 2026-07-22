"use client";

import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface UnboundedVariableModeFieldsProps {
  readonly className?: string;
}

/**
 *
 * @remarks
 * ## Behavior
 *
 * - Shows a compact caption explaining that the current method does not use bounds.
 * - Renders no `Min.` / `Max.` inputs and performs no variable-bounds validation on its own.
 */
export function UnboundedVariableModeFields({
  className,
}: UnboundedVariableModeFieldsProps) {
  return (
    <div className={className}>
      <Paragraph variant="caption">
        Bounds are not used for this method.
      </Paragraph>
    </div>
  );
}
