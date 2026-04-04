# `app/AppShell.tsx`

## Purpose
Client wrapper for the shared runtime shell. Owns Pyodide initialization, app-wide glass-catalog preloading, the global error modal, the loading overlay, `MathJaxContext`, and common app chrome for all routed pages.

## Responsibilities
- Calls `usePyodide()` once for the app tree
- Preloads normalized glass catalog data once per worker proxy via `preloadGlassCatalogs()`
- Registers the `beforeunload` guard once
- Provides `proxy`, `isReady`, and `openErrorModal` through `AppShellProvider`
- Injects app-wide glass catalog state through `GlassCatalogProvider`
- Renders the shared `Layout` shell around route content
- Renders `ErrorModal` and `LoadingOverlay` outside the routed content area

## Rendered Structure
```tsx
<MathJaxContext>
  <AppShellProvider value={{ proxy, isReady, openErrorModal }}>
    <GlassCatalogProvider value={{ catalogs, error, isLoaded, isLoading, preload }}>
      <Layout>{children}</Layout>
    </GlassCatalogProvider>
    <ErrorModal ... />
    {showLoadingOverlay && <LoadingOverlay ... />}
  </AppShellProvider>
</MathJaxContext>
```

## Notes
- `app/layout.tsx` remains the server layout for metadata and global providers.
- This replaces the former route-group shell so the public URLs remain unchanged after flattening the routes.
- The loading overlay stays visible until both Pyodide is ready and the initial glass-catalog preload has completed successfully or failed.
