import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface DescriptionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly children?: React.ReactNode;
}

export const DescriptionContainer = React.forwardRef<HTMLDivElement, DescriptionContainerProps>(
  function DescriptionContainer({ className, children, ...rest }, ref) {
    const { color, size, style } = cx.descriptionContainer;

    return (
      <div
        ref={ref}
        data-testid="description-container"
        className={clsx(
          style.borderStyle,
          style.borderRadius,
          color.borderColor,
          color.bgColor,
          color.textColor,
          size.padding,
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
