/**
# `shared/components/primitives/CheckboxInput/CheckboxInput.tsx`

## Styling

- Wrapper hover styling comes from `componentTokens.checkbox.color.hoverBgColor`.
- Checkbox border, checked state color, focus ring, size, and radius come from `componentTokens.checkbox`.
- Label text inherits the shared secondary text color and can be extended via `labelClassName`.
*/
import { type JSX } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

/**
## Props

```ts
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
```
*/
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

/**
## Purpose

Compact labelled checkbox primitive for the shared checkbox-row pattern. It centralizes the `<label><input type="checkbox" /></label>` structure, applies unified styling, and supports either a plain string label or caller-provided JSX label content.

## Behavior

- Renders a wrapper `<label>` containing the checkbox input and visible label content.
- Calls `onChange(event.target.checked)` on checkbox changes.
- Uses `ariaLabel` when provided; otherwise the visible label supplies the accessible name.
- When `label` is a string, wraps it in the component-owned `<span>` with the shared text styling and optional `labelClassName`.
- When `label` is a JSX element, renders that JSX directly with no extra wrapper so the caller controls container layout and styling.
- Supports composed visual labels such as the glass-map catalog color dot without a separate adornment prop.

## Usages

```tsx
<CheckboxInput
  id="use-model-glass"
  label="Use model glass"
  checked={useModelGlass}
  onChange={setUseModelGlass}
/>

<CheckboxInput
  id="catalog-Schott"
  ariaLabel="Schott"
  label={(
    <div className="flex flex-1 items-center gap-2 text-left text-sm leading-5">
      <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
      <span>Schott</span>
    </div>
  )}
  checked={enabledCatalogs.Schott}
  onChange={() => onToggleCatalog("Schott")}
/>
```
*/
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
