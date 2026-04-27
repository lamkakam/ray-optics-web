"use client";

import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface UnboundedVariableModeFieldsProps {
  readonly className?: string;
}

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
