# `shared/components/layout/Layout/Layout.tsx`

## Purpose
Composite client layout shell. Owns hamburger/side-nav open state and screen-size detection. Renders the shared app chrome and delegates route content to `children`.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Active view content |
| `onNavigate` | `(href: string, event: React.MouseEvent<HTMLAnchorElement>) => boolean \| undefined` | Optional SideNav navigation interceptor supplied by the app shell |

## State
| State | Type | Description |
|-------|------|-------------|
| `sideNavOpen` | `boolean` | Whether the side nav panel is open |

## Internal behaviour
- Calls `useScreenBreakpoint()` to derive `isLG`
- Hamburger button (`aria-label="Open navigation"`) toggles `sideNavOpen`
- Delegates route navigation to `SideNav`, forwarding `onNavigate` so the app shell can guard route changes before the nav closes
- While `sideNavOpen` is `true`, installs a document-level `pointerdown` listener
- Pointer interactions outside both the SideNav wrapper and hamburger wrapper close the nav
- Pointer interactions inside the SideNav wrapper do not close the nav through outside-dismiss logic
- Pointer interactions on the hamburger wrapper are ignored by outside-dismiss logic so the hamburger click handler remains the only toggle path
- Outside-dismiss is behavioral only; no backdrop or dimming layer is rendered

## Layouts

### LG (`isLG === true`)
```
<div className="flex flex-col h-full">
  <header> h-12 row: hamburger wrapper + <Header level={1}>Ray Optics Web</Header> </header>
  <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
    <div ref={sideNavRef} className="contents">
      <SideNav isLG={true} onNavigate={onNavigate} ... />
    </div>
    {children}
  </div>
</div>
```

### SM (`isLG === false`)
```
<div className="flex flex-col h-full">
  <header> py-2 row: hamburger wrapper + <Header level={1} className="ml-2">Ray Optics Web</Header> </header>
  <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
    <div ref={sideNavRef} className="contents">
      <SideNav isLG={false} onNavigate={onNavigate} ... />
    </div>
    {children}
  </div>
</div>
```

## iOS Safari height note
`globals.css` sets `html, body { height: 100%; overflow: hidden; }`. This locks the document so it can never scroll. Without this, `h-screen` (`100vh`) on iOS Safari equals the "large viewport height" (address bar hidden), causing the layout to overflow when the address bar is visible. The resulting micro-scroll triggers the address bar to animate in/out, resizing the viewport and making the header jump. The `h-full` on the outer div fills the locked `body` height instead.

## Usages

```tsx
// In app/AppShell.tsx
<Layout onNavigate={guardedNavigate}>{children}</Layout>
```
