# `components/micro/Chip.tsx`

## Purpose

Read-only badge rendered as a `<span>` with a pill shape and muted styling. Used to surface concise key-value metrics.

## Props

```ts
interface ChipProps {
  children: React.ReactNode;
}
```

## Key Behaviors

- Stateless — purely presentational.
- Classes are computed once at module load (not per-render) since there are no dynamic props.

## Usages

```tsx
// Display optical metrics
<Chip>EFL: 100.00mm</Chip>
<Chip>f/#: 4.0</Chip>
<Chip>NA OBJ: 0.1250</Chip>

// Multiple chips in a row
<div className="flex gap-2 flex-wrap">
  {CHIP_CONFIG.filter(({ key }) => key in data).map(
    ({ key, format }) => <Chip key={key}>{format(data[key])}</Chip>
  )}
</div>

// Displaying status badges
<Chip>Active</Chip>
<Chip>In Progress</Chip>
```
