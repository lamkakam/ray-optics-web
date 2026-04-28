# `shared/components/providers/ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx`

## Purpose

Headless client component that triggers service worker registration on mount by calling `useServiceWorkerRegistration`. Renders nothing — exists solely to invoke the hook in the component tree.

## Key Behaviors

- Renders `null`.
- `"use client"` boundary ensures the hook runs only in the browser.
- Placed near the root of the layout tree so registration happens as early as possible.

## Usages

```tsx
import ServiceWorkerRegistrar from "@/shared/components/providers/ServiceWorkerRegistrar";

// In app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {/* Register service worker on mount */}
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
```
