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

/**
Searchable native datalist primitive whose visible text input uses the same themed appearance as `Select`.

## Key Behaviors

- Renders a text `<input>` associated with a native `<datalist>` through a unique React-generated ID.
- Forwards standard input attributes, events, disabled state, and an `HTMLInputElement` ref.
- Renders each supplied item as a datalist option with its value and label.
- Applies the default `Select` design tokens, full-width wrapper sizing, disabled styles, and appearance reset, without decorative arrow padding or markup.
- Inherits the `Select` responsive font-size token: 16 px below 1440 px and 14 px at `screenLG`.
- Applies `className` to the wrapper so callers can provide width constraints and other wrapper styles.
*/
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
