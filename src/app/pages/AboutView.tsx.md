# AboutView.tsx

## Purpose
Full-page about view shown when `currentView === 'about'` in `page.tsx`.

## Props
None.

## Content
- `<Header level={2}>About</Header>`
- Describes Ray Optics Web as a browser-based optical design GUI
- Mentions RayOptics library and Pyodide (Python → WebAssembly)
- Notes that all computation is local (no server)

## Usages

```tsx
// In app/page.tsx
{currentView === "about" && <AboutView />}
```
