# `components/micro/Button.tsx`

## Purpose

Themed button primitive that maps a `variant` and optional `size` to Tailwind classes via `styleTokens`. Covers the full range of button styles used across the app.

## Props

```ts
type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating";
type ButtonSize = "md" | "sm" | "xs";

// Union: floating variant disallows size; all others allow it
type ButtonProps =
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: "floating"; size?: never })
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonVariant; size?: ButtonSize });
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `ButtonVariant` | Yes | Visual style. `floating` is absolutely positioned with a translucent background |
| `size` | `ButtonSize` | No | Padding and font-size tier. Defaults to `"md"`. Forbidden on `floating` variant (auto-uses `xs`) |
| `type` | `string` | No | Defaults to `"button"` (prevents accidental form submission) |
| `className` | `string` | No | Merged via `twMerge` after variant/size classes |

## Key Behaviors

- `floating` variant renders as `position: absolute` with `top-2 right-2` positioning, intended for overlay buttons inside a relative container.
- Classes are composed via `clsx` + `twMerge` so consumer `className` can safely override individual tokens.
- `disabled:opacity-50` and `disabled:cursor-not-allowed` are always applied.

## Usages

- Used by virtually every interactive element in the app — modals, toolbars, grid cells, and panel actions.
