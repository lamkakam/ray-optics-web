# `lib/theme.ts`

## Purpose

Defines the discriminated string literal type representing the application's colour theme.

## Exports

```ts
export type Theme = "light" | "dark";
```

## Usages

Used by UI components and Zustand store slices that manage light/dark mode switching. Pass `Theme` as a prop rather than reading it directly from the store inside leaf components, to keep them testable.
