# `shared/components/primitives/Header.tsx`

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

```tsx
// Page title (h1)
<Header level={1}>
  Ray Optics Web
</Header>

// Modal title (h2)
<Modal isOpen={isOpen} title="Select Medium">
  {/* Title is rendered as h2 internally */}
</Modal>

// Section heading (h3)
<div>
  <Header level={3} className="mb-2">
    System Aperture
  </Header>
  <div className="space-y-2">
    {/* Form controls */}
  </div>
</div>

// Subsection heading (h4)
<Header level={4}>
  Advanced Options
</Header>
```
