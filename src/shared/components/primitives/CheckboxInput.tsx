import { type JSX } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface CheckboxInputProps {
  readonly id: string;
  readonly label: string | JSX.Element;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly labelClassName?: string;
}

const WRAPPER_CLASSES = [
  "flex items-start",
  cx.checkbox.size.gap,
  cx.checkbox.size.wrapperPaddingX,
  cx.checkbox.size.wrapperPaddingY,
  cx.checkbox.color.hoverBgColor,
  cx.checkbox.color.labelTextColor,
  cx.checkbox.style.wrapperBorderRadius,
  cx.checkbox.style.transition,
  cx.checkbox.style.cursor,
] as const;

const INPUT_CLASSES = [
  "mt-0.5 border",
  cx.checkbox.size.boxHeight,
  cx.checkbox.size.boxWidth,
  cx.checkbox.size.focusRingWidth,
  cx.checkbox.color.borderColor,
  cx.checkbox.color.checkedColor,
  cx.checkbox.color.focusRingColor,
  cx.checkbox.style.shrink,
  cx.checkbox.style.borderRadius,
] as const;

export function CheckboxInput({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  className,
  labelClassName,
}: CheckboxInputProps) {
  return (
    <label htmlFor={id} className={clsx(WRAPPER_CLASSES, className)}>
      <input
        id={id}
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={clsx(INPUT_CLASSES, disabled && "cursor-not-allowed")}
      />
      {typeof label === "string" ? (
        <span className={clsx("flex-1 text-left text-sm leading-5", labelClassName)}>
          {label}
        </span>
      ) : label}
    </label>
  );
}
