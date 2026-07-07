# `app/AppShell.tsx`

## Purpose
Client wrapper for the shared runtime shell. Owns Pyodide initialization, app-wide glass-catalog preloading, the global error modal, the loading overlay, Optimization leave guards, `MathJaxContext`, and common app chrome for all routed pages.

## Responsibilities
- Calls `usePyodide()` once for the app tree
- Displays determinate initialization progress from `usePyodide().initProgress`
- Loads normalized glass catalog data via `loadGlassCatalogs()` when `GlassMapStore.catalogsData` is not already available
- Hydrates valid persisted custom glass rows from IndexedDB into Pyodide after built-in catalog loading succeeds and before catalog preload is marked loaded
- Quarantines invalid or worker-rejected persisted custom glass rows and reports one warning after initialization
- Owns glass-catalog preload status/error locally and commits only successful data into `GlassMapStore`
- Registers an app-wide `beforeunload` guard for reload, tab close, typed URL, and external navigation
- Allows browser back/forward navigation between app routes without native confirmation, while keeping the Optimization unapplied-result modal as the browser-history guard for unapplied results
- Guards in-app SideNav navigation away from `/optimization` when an optimized result has not been applied to the Editor
- Provides `proxy`, `isReady`, and `openErrorModal` through `AppShellProvider`
- Injects app-wide glass catalog state through `GlassCatalogProvider`, combining local preload status/error with successful store data
- Renders the shared `Layout` shell around route content
- Renders `ErrorModal` and `LoadingOverlay` outside the routed content area
- Renders `UnappliedOptimizationResultModal` outside routed content so the warning can be shown even while leaving the Optimization route
- Shows the glass-catalog preload as the `90%` initialization milestone while the initial catalog preload is in flight

## Rendered Structure
```tsx
<MathJaxContext>
  <AppShellProvider value={{ proxy, isReady, openErrorModal }}>
    <GlassCatalogProvider value={{ catalogs, lookupMaps, error, isLoaded, isLoading, preload }}>
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
- The loading overlay stays visible until both Pyodide is ready and the initial glass-catalog preload has completed successfully.
- While Pyodide initializes, the overlay uses the milestone state supplied by `usePyodide`.
- Once Pyodide is ready and catalog preload begins, the overlay displays `"Preloading glass catalogs"` at `90%`; the overlay is removed after catalog preload succeeds.
- The catalog preload remains blocking while persisted custom glasses are replayed into `addUserDefinedGlasses` one row at a time.
- Accepted persisted rows are merged into `catalogsData.Custom` before `GlassMapStore.setCatalogsData(...)` is called.
- Malformed persisted rows, unsupported row types, and rows rejected by the worker are moved from `customGlasses` to `quarantinedCustomGlasses` when possible.
- After startup completes, AppShell reports one warning listing the quarantined row count and labels.
- If catalog preload fails, the overlay remains blocking and displays the AppShell-local catalog error. The failed result is not committed into `GlassMapStore`.
- `GlassMapStore.catalogsData` is the source of truth for already loaded catalogs; AppShell does not read settled data from the loader.
- `GlassCatalogProvider.error`, `isLoaded`, and `isLoading` are derived from AppShell-local preload status plus `GlassMapStore.catalogsData`; `catalogs` and `lookupMaps` come from `GlassMapStore`.
- `beforeunload` always calls `preventDefault()` and sets `event.returnValue` so reload, typed URL, tab close, and external navigation show the native browser prompt anywhere in the app.
- In-app navigation away from `/optimization` opens a non-dismissible `UnappliedOptimizationResultModal` instead of pushing the requested route immediately.
- `Stay` clears the pending route and remains on Optimization.
- `Leave` pushes the pending route without applying the Optimization-local model.
- `Apply to Editor` applies the Optimization-local optical model through `applyOptimizationModelToEditor()`, clears the optimization store's unapplied-result marker, then pushes the pending route.
- The browser-history guard tracks the complete active Optimization history entry: its full URL (including query and hash) and its original `history.state`, including Next.js App Router's `__NA` state. It listens for `popstate` in capture phase and, when navigation leaves `/optimization` with an unapplied result, stops immediate propagation before Next.js handles the event, restores that exact entry with `history.pushState(...)`, stores the attempted destination, and synchronously shows the same React warning modal without starting a router transition. Reusing the original Next history state prevents Next's patched `pushState` from dispatching a router restore.
- Browser back/forward navigation outside that Optimization modal path leaves the full history destination, including path, query, and hash, in place without calling `window.confirm`, and updates the tracked current URL for subsequent history navigation.
