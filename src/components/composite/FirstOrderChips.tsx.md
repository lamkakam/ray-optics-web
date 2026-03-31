# `components/composite/FirstOrderChips.tsx`

## Purpose

Renders a row of `Chip` components showing key first-order paraxial properties (EFL, BFL, IMG HT, f/#, NA OBJ, NA IMG) extracted from the worker's first-order data dict.

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

## Key Behaviors

- Only keys present in `data` are rendered; missing keys are silently skipped.
- EFL, BFL, IMG HT are formatted with 2 decimal places; f/#, NA OBJ, NA IMG use 4 significant figures.
- Returns `null` when `data` is `undefined`.

## Usages

```tsx
import { FirstOrderChips } from "@/components/composite/FirstOrderChips";

// In a page component (e.g., LensEditor)
const firstOrderData = useStore(analysisDataStore, (s) => s.firstOrderData);

const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

return (
  <div>
    {/* In toolbar or header section */}
    {firstOrderData && (
      <div className="flex items-center gap-2">
        {firstOrderChips}
      </div>
    )}
  </div>
);
```
