import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ParagraphVariant = "body" | "caption" | "subheading";

const VARIANT_CLASSES: Record<ParagraphVariant, readonly string[]> = {
  body: [cx.text.color.bodyTextColor, cx.text.size.bodyFontSize],
  caption: [cx.text.size.captionMargin, cx.text.color.captionTextColor, cx.text.size.captionFontSize],
  subheading: [cx.text.style.subheadingFontWeight, cx.text.color.subheadingTextColor, cx.text.size.subheadingFontSize],
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
