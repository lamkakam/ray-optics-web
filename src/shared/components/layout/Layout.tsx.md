# Layout.tsx

## Purpose
Composite client layout shell. Owns hamburger/side-nav open state and screen-size detection. Renders the shared app chrome and delegates route content to `children`.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Active view content |

## State
| State | Type | Description |
|-------|------|-------------|
| `sideNavOpen` | `boolean` | Whether the side nav panel is open |

## Internal behaviour
- Calls `useScreenBreakpoint()` to derive `isLG`
- Hamburger button (`aria-label="Open navigation"`) toggles `sideNavOpen`
- Delegates route navigation to `SideNav`, which closes itself via `onClose`

## Layouts

### LG (`isLG === true`)
```
<div className="flex flex-col h-full">
  <header> h-12 row: hamburger + <Header level={1}>Ray Optics Web</Header> </header>
  <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
    <SideNav isLG={true} ... />
    {children}
  </div>
</div>
```

### SM (`isLG === false`)
```
<div className="flex flex-col h-full">
  <header> py-2 row: hamburger + <Header level={1} className="ml-2">Ray Optics Web</Header> </header>
  <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
    <SideNav isLG={false} ... />
    {children}
  </div>
</div>
```

## iOS Safari height note
`globals.css` sets `html, body { height: 100%; overflow: hidden; }`. This locks the document so it can never scroll. Without this, `h-screen` (`100vh`) on iOS Safari equals the "large viewport height" (address bar hidden), causing the layout to overflow when the address bar is visible. The resulting micro-scroll triggers the address bar to animate in/out, resizing the viewport and making the header jump. The `h-full` on the outer div fills the locked `body` height instead.

## Usages

```tsx
// In app/AppShell.tsx
<Layout>{children}</Layout>
```
