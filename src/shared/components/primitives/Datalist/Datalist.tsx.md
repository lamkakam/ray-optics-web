# `shared/components/primitives/Datalist/Datalist.tsx`

## Purpose

Searchable native datalist primitive whose visible text input uses the same themed appearance as `Select`.

## Props

```ts
type DatalistOption = { value: string | number; label: string };

interface DatalistProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "children" | "list" | "type"> {
  options: ReadonlyArray<DatalistOption>;
}
```

## Key Behaviors

- Renders a text `<input>` associated with a native `<datalist>` through a unique React-generated ID.
- Forwards standard input attributes, events, disabled state, and an `HTMLInputElement` ref.
- Renders each supplied item as a datalist option with its value and label.
- Applies the default `Select` design tokens, full-width wrapper sizing, disabled styles, and appearance reset, without decorative arrow padding or markup.
- Applies `className` to the wrapper so callers can provide width constraints and other wrapper styles.

## Usage

```tsx
<Datalist
  aria-label="Glass"
  options={glassNames.map((glass) => ({ value: glass, label: glass }))}
  value={glass}
  onChange={(event) => setGlass(event.target.value)}
/>
```
