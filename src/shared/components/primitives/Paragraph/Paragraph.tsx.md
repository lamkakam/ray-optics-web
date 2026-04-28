# `shared/components/primitives/Paragraph/Paragraph.tsx`

## Purpose

Themed `<p>` element with semantic variants that map to different color and size tokens.

## Props

```ts
type ParagraphVariant = "body" | "caption" | "subheading" | "placeholder" | "errorMessage";

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
- `errorMessage` uses the shared error text color token with caption-sized typography.

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

// Inline validation or error message
<Paragraph variant="errorMessage">
  Bounds are invalid.
</Paragraph>
```
