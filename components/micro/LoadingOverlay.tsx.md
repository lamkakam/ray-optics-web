# `components/micro/LoadingOverlay.tsx`

## Purpose

Full-screen loading overlay with an animated spinner, a title, and a content area. Used while heavy async operations (Pyodide init, wheel download) are in progress.

## Props

```ts
interface LoadingOverlayProps {
  title: string;
  contents: React.ReactNode;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Bold status heading (e.g. "Initializing Pyodide") |
| `contents` | `React.ReactNode` | Yes | Supplementary text or progress details shown below the title |

## Key Behaviors

- Renders as `fixed inset-0` with `z-[200]`, covering the entire viewport above all other UI.
- Spinner is an SVG `animate-spin` circle with `aria-hidden="true"`.

## Usages

- Mounted by the page-level component to block interaction while the Pyodide worker initialises.
