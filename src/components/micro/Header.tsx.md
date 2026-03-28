# `components/micro/Header.tsx`

## Purpose

Polymorphic heading component that renders an `h1`–`h6` tag with a consistent font weight and per-level font size drawn from style tokens.

## Props

```ts
type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: HeaderLevel;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `level` | `HeaderLevel` | Yes | Determines which `<h*>` tag is rendered and which font-size token is applied |

## Key Behaviors

- Tag is derived dynamically from `level`: `` `h${level}` ``.
- Font sizes: h1 = xl, h2 = lg, h3 = base, h4/h5/h6 = sm/xs/xs.

## Usages

- Used in `Modal` (level 2 for the dialog title), `SpecsConfigurerPanel` (level 3 for section headings).
