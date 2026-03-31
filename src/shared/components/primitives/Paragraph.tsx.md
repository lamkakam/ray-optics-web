# `shared/components/primitives/Paragraph.tsx`

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

```tsx
// Placeholder text while loading
{loading ? (
  <Paragraph variant="placeholder">
    Loading plot...
  </Paragraph>
) : null}

// Body text for description
<Paragraph variant="body">
  Enter the system aperture and field specifications.
</Paragraph>

// Caption below a control
<Paragraph variant="caption">
  Values in millimeters
</Paragraph>

// Subheading for a section
<Paragraph variant="subheading">
  Advanced Settings
</Paragraph>

// Empty state message
<Paragraph variant="placeholder">
  No data available
</Paragraph>
```
