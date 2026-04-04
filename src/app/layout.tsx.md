# `app/layout.tsx`

## Purpose
Root server layout for the App Router. Owns metadata, global providers, and the shared client app shell wrapper.

## Responsibilities
- Declares the app metadata
- Imports global CSS
- Mounts the theme provider, service worker registrar, and shared app-wide Zustand-backed store providers once for the entire app
- Wraps routed content in `AppShell` so shared client shell behaviour persists across all routes
- Does not mount `GlassMapStoreProvider`; that store is now scoped to the glass-map route

## Rendered Structure
```tsx
<html>
  <body>
    <ThemeProvider>
      <ServiceWorkerRegistrar />
      <...store providers...>
        <AppShell>{children}</AppShell>
      </...store providers...>
    </ThemeProvider>
  </body>
</html>
```
