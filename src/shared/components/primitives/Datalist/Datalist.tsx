import React, { useId } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type DatalistOption = {
  readonly value: string | number;
  readonly label: string;
};

interface DatalistProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "children" | "list" | "type"> {
  readonly options: ReadonlyArray<DatalistOption>;
}

export const Datalist = React.forwardRef<HTMLInputElement, DatalistProps>(
  function Datalist({ options, className, ...rest }, ref) {
    const generatedId = useId();
    const listId = `datalist-${generatedId.replace(/:/g, "")}`;
    const inputClassName = clsx(
      cx.select.style.borderRadius,
      cx.select.style.borderStyle,
      cx.select.style.outlineStyle,
      cx.select.style.transitionStyle,
      cx.select.style.opacity,
      cx.select.style.cursor,
      cx.select.style.appearanceReset,
      cx.select.size.defaultWidth,
      cx.select.size.horizontalPadding,
      cx.select.size.verticalPadding,
      cx.select.size.fontSize,
      cx.select.size.focusRingWidth,
      cx.select.color.focusRingColor,
      cx.select.color.borderColor,
      cx.select.color.bgColor,
      cx.select.color.textColor,
    );

    return (
      <div className={clsx("w-full", className)}>
        <input ref={ref} type="text" list={listId} className={inputClassName} {...rest} />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </datalist>
      </div>
    );
  },
);
