# `app/AppShell.tsx`

## Purpose
Client wrapper for the shared runtime shell. Owns Pyodide initialization, app-wide glass-catalog preloading, the global error modal, the loading overlay, Optimization leave guards, `MathJaxContext`, and common app chrome for all routed pages.

## Responsibilities
- Calls `usePyodide()` once for the app tree
- Displays determinate initialization progress from `usePyodide().initProgress`
- Preloads normalized glass catalog data once per worker proxy via `preloadGlassCatalogs()`
- Registers an app-wide `beforeunload` guard for reload, tab close, typed URL, and external navigation
- Guards app-wide browser back/forward navigation with native confirmation, while keeping the Optimization unapplied-result modal as the higher-priority browser-history guard
- Guards in-app SideNav navigation away from `/optimization` when an optimized result has not been applied to the Editor
- Provides `proxy`, `isReady`, and `openErrorModal` through `AppShellProvider`
- Injects app-wide glass catalog state through `GlassCatalogProvider`
- Renders the shared `Layout` shell around route content
- Renders `ErrorModal` and `LoadingOverlay` outside the routed content area
- Renders `UnappliedOptimizationResultModal` outside routed content so the warning can be shown even while leaving the Optimization route
- Shows the glass-catalog preload as the `90%` initialization milestone while the initial catalog preload is in flight

## Rendered Structure
```tsx
<MathJaxContext>
  <AppShellProvider value={{ proxy, isReady, openErrorModal }}>
    <GlassCatalogProvider value={{ catalogs, error, isLoaded, isLoading, preload }}>
      <Layout onNavigate={guardedNavigate}>{children}</Layout>
    </GlassCatalogProvider>
    <ErrorModal ... />
    <UnappliedOptimizationResultModal ... />
    {showLoadingOverlay && (
      <LoadingOverlay
        contents={
          <>
            <span>{overlayProgress.status}</span>
            <Progress value={overlayProgress.value} ariaLabel="Initialization progress" />
          </>
        }
      />
    )}
  </AppShellProvider>
</MathJaxContext>
```

## Notes
- `app/layout.tsx` remains the server layout for metadata and global providers.
- This replaces the former route-group shell so the public URLs remain unchanged after flattening the routes.
- The loading overlay stays visible until both Pyodide is ready and the initial glass-catalog preload has completed successfully or failed.
- While Pyodide initializes, the overlay uses the milestone state supplied by `usePyodide`.
- Once Pyodide is ready and catalog preload begins, the overlay displays `"Preloading glass catalogs"` at `90%`; the overlay is removed after catalog preload succeeds or fails.
- `beforeunload` always calls `preventDefault()` and sets `event.returnValue` so reload, typed URL, tab close, and external navigation show the native browser prompt anywhere in the app.
- In-app navigation away from `/optimization` opens a non-dismissible `UnappliedOptimizationResultModal` instead of pushing the requested route immediately.
- `Stay` clears the pending route and remains on Optimization.
- `Leave` pushes the pending route without applying the Optimization-local model.
- `Apply to Editor` applies the Optimization-local optical model through `applyOptimizationModelToEditor()`, clears the optimization store's unapplied-result marker, then pushes the pending route.
- Browser back/forward navigation that leaves `/optimization` with an unapplied Optimization result restores the full current URL, including query and hash, with `history.pushState(...)`, stores the attempted destination, and shows the same React warning modal without calling `window.confirm`.
- Browser back/forward navigation outside that Optimization modal path calls `window.confirm`; rejecting the prompt restores the full previous URL with `history.pushState(...)`, and accepting the prompt leaves the browser history destination in place.
