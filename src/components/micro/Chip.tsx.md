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

