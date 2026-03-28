# `components/ServiceWorkerRegistrar.tsx`

## Purpose

Headless client component that triggers service worker registration on mount by calling `useServiceWorkerRegistration`. Renders nothing — exists solely to invoke the hook in the component tree.

## Key Behaviors

- Renders `null`.
- `"use client"` boundary ensures the hook runs only in the browser.
- Placed near the root of the layout tree so registration happens as early as possible.

## Usages

- Mounted once in `app/layout.tsx` (or the root page).
