# `shared/components/primitives/CheckboxInput.tsx`

## Purpose

Compact labelled checkbox primitive for the shared checkbox-row pattern. It centralizes the `<label><input type="checkbox" /></label>` structure, applies unified styling, and supports either a plain string label or caller-provided JSX label content.

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

## Behavior

- Renders a wrapper `<label>` containing the checkbox input and visible label content.
- Calls `onChange(event.target.checked)` on checkbox changes.
- Uses `ariaLabel` when provided; otherwise the visible label supplies the accessible name.
- When `label` is a string, wraps it in the component-owned `<span>` with the shared text styling and optional `labelClassName`.
- When `label` is a JSX element, renders that JSX directly with no extra wrapper so the caller controls container layout and styling.
- Supports composed visual labels such as the glass-map catalog color dot without a separate adornment prop.

## Styling

- Wrapper hover styling comes from `componentTokens.checkbox.color.hoverBgColor`.
- Checkbox border, checked state color, focus ring, size, and radius come from `componentTokens.checkbox`.
- Label text inherits the shared secondary text color and can be extended via `labelClassName`.

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
