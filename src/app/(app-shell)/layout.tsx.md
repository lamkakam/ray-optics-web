# `app/(app-shell)/layout.tsx`

## Purpose
Client layout for the main interactive route group. Owns the shared runtime shell that must persist across App Router pages: Pyodide initialization, global error modal, loading overlay, `MathJaxContext`, and the common app chrome.

## Responsibilities
- Calls `usePyodide()` once for the route group
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
- This layout is a route-group layout, so its URL segment is omitted from the public routes.
- The root `app/layout.tsx` remains the server layout for metadata and global providers.
