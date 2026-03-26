# `components/micro/RadioInput.tsx`

## Purpose

A generic radio button group component. Renders a `<fieldset>` with a `<legend>` and one labelled `<input type="radio">` per option.

## Props

```ts
interface RadioInputProps<T extends string> {
  readonly name: string;          // HTML name attribute for the radio group
  readonly label: string;         // Legend / group label
  readonly options: ReadonlyArray<{ value: T; label: string }>;
  readonly value: T;              // Currently selected value
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;    // Disables all inputs when true
}
```

## Behavior

- Each option renders as `<label><input type="radio" /> {label}</label>`.
- The `aria-label` on each radio equals the option's `label` string.
- Calls `onChange(option.value)` when a radio is clicked.
- When `disabled=true`, all radio inputs have the `disabled` attribute.

## Styling

Uses Tailwind CSS. Label text color uses `cx.label.color.textColor`.

## Usages

Used by `FocusingPanel` for the chromaticity and metric radio groups.
