# `shared/components/primitives/Switch/Switch.tsx`

## Purpose

Controlled switch primitive for binary settings. It renders a native button with `role="switch"` and tokenized track, thumb, disabled, and animation classes.

## Props

```ts
export type SwitchSize = "sm" | "md";

interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly ariaLabel: string;
  readonly checkedContent?: React.ReactNode;
  readonly uncheckedContent?: React.ReactNode;
  readonly size?: SwitchSize;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `checked` | `boolean` | Yes | Controlled checked state |
| `onCheckedChange` | `(checked: boolean) => void` | Yes | Called with the next checked state on click |
| `ariaLabel` | `string` | Yes | Accessible name for the switch button |
| `checkedContent` | `React.ReactNode` | No | Content shown only while checked |
| `uncheckedContent` | `React.ReactNode` | No | Content shown only while unchecked |
| `size` | `"sm" \| "md"` | No | Visual size. Defaults to `"md"` |
| `className` | `string` | No | Merged via `twMerge` after token classes |

## Key Behaviors

- Renders `<button type="button" role="switch">` by default.
- Sets `aria-checked` from the controlled `checked` prop.
- Calls `onCheckedChange(!checked)` on click unless the consumer prevents the click event.
- Relies on native button `disabled` behavior, so disabled switches do not fire click handlers.
- Uses fixed tokenized dimensions for `sm` and `md`, so content changes do not resize the control.
- Positions visible state content on the side opposite the thumb to prevent labels such as `Auto` and `Manual` from being covered by the thumb.
- Applies tokenized track color, thumb translation, transition, `will-change-transform`, opacity, and disabled cursor classes.

## Usages

```tsx
<Switch
  checked={useModelGlass}
  ariaLabel="Use model glass"
  onCheckedChange={setUseModelGlass}
  checkedContent="On"
  uncheckedContent="Off"
/>
```
