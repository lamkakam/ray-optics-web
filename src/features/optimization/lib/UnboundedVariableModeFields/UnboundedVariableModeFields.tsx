/**
# `features/optimization/lib/UnboundedVariableModeFields/UnboundedVariableModeFields.tsx`
*/
"use client";

import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface UnboundedVariableModeFieldsProps {
  readonly className?: string;
}

/**
## Behavior

- Shows a compact caption explaining that the current method does not use bounds.
- Renders no `Min.` / `Max.` inputs and performs no variable-bounds validation on its own.
*/
/**
Renders the variable-mode body for unbounded optimizers.
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
