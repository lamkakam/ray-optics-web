import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type ParagraphVariant = "body" | "caption" | "subheading" | "placeholder" | "errorMessage" | "description";

const VARIANT_CLASSES: Record<ParagraphVariant, readonly string[]> = {
  body: [cx.text.color.bodyTextColor, cx.text.size.bodyFontSize],
  caption: [cx.text.size.captionMargin, cx.text.color.captionTextColor, cx.text.size.captionFontSize],
  subheading: [cx.text.style.subheadingFontWeight, cx.text.color.subheadingTextColor, cx.text.size.subheadingFontSize],
  placeholder: [cx.text.color.placeholderTextColor, cx.text.size.placeholderFontSize],
  errorMessage: [cx.text.color.errorTextColor, cx.text.size.captionFontSize],
  description: [cx.text.color.bodyTextColor, cx.text.size.descriptionFontSize],
} as const satisfies Record<ParagraphVariant, readonly string[]>;

interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Visual style. Defaults to `"body"` */
  readonly variant?: ParagraphVariant;
}

/**
Themed `<p>` element with semantic variants that map to different color and size tokens.

## Key Behaviors

- Implemented as `React.forwardRef`.
- `caption` adds a bottom margin token; `subheading` uses medium font weight; `placeholder` uses muted text color.
- `errorMessage` uses the shared error text color token with caption-sized typography.
*/
export const Paragraph = React.forwardRef<HTMLParagraphElement, ParagraphProps>(
  function Paragraph({ variant = "body", className, ...rest }, ref) {
    return (
      <p ref={ref} className={clsx(VARIANT_CLASSES[variant], className)} {...rest} />
    );
  },
);
