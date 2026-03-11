import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ParagraphVariant = "body" | "caption" | "subheading";

const VARIANT_CLASSES: Record<ParagraphVariant, readonly string[]> = {
  body: [cx.text.color.bodyTextColor, "text-sm"],
  caption: [cx.text.size.captionMargin, cx.text.color.captionTextColor, cx.text.size.captionFontSize],
  subheading: [cx.label.style.fontWeight, cx.label.color.textColor, cx.label.size.fontSize],
} as const satisfies Record<ParagraphVariant, readonly string[]>;

interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {
  readonly variant?: ParagraphVariant;
}

export const Paragraph = React.forwardRef<HTMLParagraphElement, ParagraphProps>(
  function Paragraph({ variant = "body", className, ...rest }, ref) {
    return (
      <p ref={ref} className={clsx(VARIANT_CLASSES[variant], className)} {...rest} />
    );
  },
);
