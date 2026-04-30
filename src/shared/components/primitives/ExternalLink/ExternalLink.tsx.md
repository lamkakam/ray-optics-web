# `shared/components/primitives/ExternalLink/ExternalLink.tsx`

## Purpose

External URL link primitive for source/reference links that should leave the app. It renders a plain HTML anchor rather than Next.js `Link`.

## Props

```ts
type ExternalLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "children" | "target" | "rel" | "aria-label"
> & {
  href: string;
  children: React.ReactNode;
  "aria-label": string;
};
```

## Key Behaviors

- Always renders `target="_blank"` and `rel="noopener noreferrer"`; consumers cannot override either attribute.
- Requires an explicit `aria-label` so external links remain accessible when visible text is generic.
- Uses `componentTokens.externalLink` for theme-aware text colors, hover colors, underline styling, transitions, and focus-visible styling.
- Merges consumer `className` with token classes via `clsx` + `twMerge`, allowing focused overrides.

## Usages

```tsx
<ExternalLink href="https://example.com/source" aria-label="Open source material">
  Source material
</ExternalLink>
```
