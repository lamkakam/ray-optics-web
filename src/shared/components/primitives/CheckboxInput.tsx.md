# `shared/components/primitives/CheckboxInput.tsx`

## Purpose

Compact labelled checkbox primitive for the shared checkbox-row pattern. It centralizes the `<label><input type="checkbox" /><span /></label>` structure, applies unified styling, and supports optional visual content between the checkbox and label text.

## Props

```ts
interface CheckboxInputProps {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly labelClassName?: string;
  readonly contentBeforeLabel?: React.ReactNode;
}
```

## Behavior

- Renders a wrapper `<label>` containing the checkbox input, optional `contentBeforeLabel`, and visible label text.
- Calls `onChange(event.target.checked)` on checkbox changes.
- Uses `ariaLabel` when provided; otherwise the visible label supplies the accessible name.
- Keeps the checkbox compact and the visible text left-aligned by default.
- Supports visual adornments such as the glass-map catalog color dot without reimplementing checkbox markup.

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
  label="Schott"
  checked={enabledCatalogs.Schott}
  onChange={() => onToggleCatalog("Schott")}
  contentBeforeLabel={<span className="inline-block h-3 w-3 rounded-full bg-blue-500" />}
/>
```
