# `shared/components/primitives/LoadingOverlay/LoadingOverlay.tsx`

## Purpose

Full-screen loading overlay with an animated spinner, a title, and a neutral content area. Used while heavy async operations (Pyodide init, wheel download) are in progress.

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
- Renders `contents` inside a neutral `<div>`, not a paragraph, so structured content such as progress bars is valid markup.

## Usages

```tsx
// Show during Pyodide initialization
const initOverlayNode = !isReady && (
  <LoadingOverlay
    title="Initializing Ray Optics"
    contents="Loading Pyodide and installing packages…"
  />
);

<Layout>
  {initOverlayNode}
  {/* Page content */}
</Layout>

// Custom content with progress details
<LoadingOverlay
  title="Building Lens Model"
  contents={
    <div className="space-y-2">
      <p>Tracing rays...</p>
      <div className="w-32 h-2 bg-gray-300 rounded">
        <div className="h-full bg-blue-500 rounded" style={{ width: `${progress}%` }} />
      </div>
    </div>
  }
/>

// Show during heavy computation
{isCalculating && (
  <LoadingOverlay
    title="Calculating Aberrations"
    contents="Analyzing optical system..."
  />
)}
```
