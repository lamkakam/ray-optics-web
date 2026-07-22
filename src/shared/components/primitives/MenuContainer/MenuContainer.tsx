import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

type MenuContainerChild = React.ReactElement<
  React.LiHTMLAttributes<HTMLLIElement>,
  "li"
>;

interface MenuContainerProps extends React.MenuHTMLAttributes<HTMLMenuElement> {
  readonly children?: MenuContainerChild | readonly MenuContainerChild[];
}

/**
 * Semantic `<menu>` scroll container for compact selectable lists.
 *
 * @remarks
 * - Renders children inside a `<menu>` element.
 * - Accepts direct `<li>` children. Keyboard navigation supports direct `<li><button /></li>` items only.
 * - Applies a fixed maximum height and vertical overflow for long lists.
 * - Handles `ArrowDown` and `ArrowUp` by focusing and clicking the next or previous enabled direct item button, wrapping at the ends.
 * - Starts at the first enabled button for `ArrowDown` and the last enabled button for `ArrowUp` when focus is outside the menu items.
 * - Calls a consumer `onKeyDown` before internal navigation and skips internal behavior when that handler prevents default.
 * - Uses `componentTokens.menuContainer` for surface, border, text, sizing, and radius classes.
 */
export const MenuContainer = React.forwardRef<HTMLMenuElement, MenuContainerProps>(
  function MenuContainer({ className, children, onKeyDown, ...rest }, ref) {
    const { color, size, style } = cx.menuContainer;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLMenuElement>) => {
      onKeyDown?.(event);

      if (event.defaultPrevented || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
        return;
      }

      const menuButtons = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>(
          ":scope > li > button:not(:disabled)",
        ),
      );

      if (menuButtons.length === 0) {
        return;
      }

      event.preventDefault();

      const activeIndex = menuButtons.findIndex((button) => button === document.activeElement);
      const targetIndex = event.key === "ArrowDown"
        ? activeIndex === -1
          ? 0
          : (activeIndex + 1) % menuButtons.length
        : activeIndex === -1
          ? menuButtons.length - 1
          : (activeIndex - 1 + menuButtons.length) % menuButtons.length;
      const targetButton = menuButtons[targetIndex];

      targetButton.focus();
      targetButton.click();
    };

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
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {children}
      </menu>
    );
  },
);
