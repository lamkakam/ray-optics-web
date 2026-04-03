# `shared/components/primitives/InlineLink.tsx`

## Purpose

Inline navigation link primitive for text-style links rendered with Next.js `Link`. Used for contextual navigation actions inside forms and side panels.

## Props

```ts
interface InlineLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}
```

## Key Behaviors

- Renders a Next.js `Link`
- Uses inline text-link styling with underline and theme-aware colours
- Merges consumer `className` with the default classes via `clsx` + `twMerge`
- Supports explicit `aria-label` for accessibility when the visible label is not enough

## Usages

```tsx
<InlineLink href="/glass-map?source=medium-selector&catalog=Schott&glass=N-BK7">
  View in glass map
</InlineLink>

<InlineLink href="/" aria-label="Back to lens editor">
  Back to lens editor
</InlineLink>
```
