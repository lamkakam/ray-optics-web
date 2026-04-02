# `app/AppShell.tsx`

## Purpose
Client wrapper for the shared runtime shell. Owns the Pyodide initialization, global error modal, loading overlay, `MathJaxContext`, and common app chrome for all routed pages.

## Responsibilities
- Calls `usePyodide()` once for the app tree
- Registers the `beforeunload` guard once
- Provides `proxy`, `isReady`, and `openErrorModal` through `AppShellProvider`
- Renders the shared `Layout` shell around route content
- Renders `ErrorModal` and `LoadingOverlay` outside the routed content area

## Rendered Structure
```tsx
<MathJaxContext>
  <AppShellProvider value={{ proxy, isReady, openErrorModal }}>
    <Layout>{children}</Layout>
    <ErrorModal ... />
    {!isReady && <LoadingOverlay ... />}
  </AppShellProvider>
</MathJaxContext>
```

## Notes
- `app/layout.tsx` remains the server layout for metadata and global providers.
- This replaces the former route-group shell so the public URLs remain unchanged after flattening the routes.
