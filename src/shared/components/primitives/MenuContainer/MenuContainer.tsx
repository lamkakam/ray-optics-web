import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface MenuContainerProps extends React.MenuHTMLAttributes<HTMLMenuElement> {
  readonly children?: React.ReactNode;
}

export const MenuContainer = React.forwardRef<HTMLMenuElement, MenuContainerProps>(
  function MenuContainer({ className, children, ...rest }, ref) {
    const { color, size, style } = cx.menuContainer;

    return (
      <menu
        ref={ref}
        className={clsx(
          style.borderStyle,
          style.borderRadius,
          style.overflow,
          color.borderColor,
          color.bgColor,
          color.textColor,
          size.padding,
          size.gap,
          size.maxHeight,
          className,
        )}
        {...rest}
      >
        {children}
      </menu>
    );
  },
);
