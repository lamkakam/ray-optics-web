# `components/micro/Paragraph.tsx`

## Purpose

Themed `<p>` element with four semantic variants that map to different color and size tokens.

## Props

```ts
type ParagraphVariant = "body" | "caption" | "subheading" | "placeholder";

interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: ParagraphVariant;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `ParagraphVariant` | No | Visual style. Defaults to `"body"` |

## Key Behaviors

- Implemented as `React.forwardRef`.
- `caption` adds a bottom margin token; `subheading` uses medium font weight; `placeholder` uses muted text color.

## Usages

- Used throughout the app for body copy, form captions, placeholder states in panels (`LensLayoutPanel`, `AnalysisPlotView`), and modal descriptions.
