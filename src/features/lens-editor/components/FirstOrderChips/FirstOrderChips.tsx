/**
# `features/lens-editor/components/FirstOrderChips/FirstOrderChips.tsx`
*/
import { Chip } from "@/shared/components/primitives/Chip";

/**
## Props

```ts
interface FirstOrderChipsProps {
  data?: Record<string, number>;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Record<string, number>` | No | First-order data map from `get_first_order_data`. Renders nothing when `undefined` |
*/
interface FirstOrderChipsProps {
  readonly data?: Record<string, number>;
}

const valueFormatter = (v: number): string => v.toFixed(2);
const naFormatter = (v: number): string => v.toPrecision(4);

const CHIP_CONFIG: { key: string; format: (v: number) => string }[] = [
  { key: "efl", format: (v) => `EFL: ${valueFormatter(v)}mm` },
  { key: "bfl", format: (v) => `BFL: ${valueFormatter(v)}mm` },
  { key: "img_ht", format: (v) => `IMG HT: ${valueFormatter(v)}mm` },
  { key: "fno", format: (v) => `f/#: ${naFormatter(v)}` },
  { key: "obj_na", format: (v) => `NA OBJ: ${naFormatter(v)}` },
  { key: "img_na", format: (v) => `NA IMG: ${naFormatter(v)}` },
];

/**
## Purpose

Renders a row of `Chip` components showing key first-order paraxial properties (EFL, BFL, IMG HT, f/#, NA OBJ, NA IMG) extracted from the worker's first-order data dict.

## Key Behaviors

- Only keys present in `data` are rendered; missing keys are silently skipped.
- EFL, BFL, IMG HT are formatted with 2 decimal places; f/#, NA OBJ, NA IMG use 4 significant figures.
- Returns `null` when `data` is `undefined`.

## Usages

```tsx
import { FirstOrderChips } from "@/features/lens-editor/components/FirstOrderChips";

// In a page component (e.g., LensEditor)
const firstOrderData = useStore(analysisDataStore, (s) => s.firstOrderData);

const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

return (
  <div>
    {/* In toolbar or header section *\/}
    {firstOrderData && (
      <div className="flex items-center gap-2">
        {firstOrderChips}
      </div>
    )}
  </div>
);
```
*/
export function FirstOrderChips({ data }: FirstOrderChipsProps) {
  if (!data) return null;

  const chips = CHIP_CONFIG.filter(({ key }) => key in data).map(
    ({ key, format }) => <Chip key={key}>{format(data[key])}</Chip>
  );

  return <>{chips}</>;
}
