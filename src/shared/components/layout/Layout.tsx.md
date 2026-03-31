# Layout.tsx

## Purpose
Composite layout shell component (`"use client"`). Owns hamburger/side-nav open state and screen-size detection. Renders the app chrome (header, side nav) and delegates content to `children`.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `currentView` | `AppView` | Active view passed to `SideNav` for highlighting |
| `onNavigate` | `(view: AppView) => void` | Called when user selects a nav item; side nav closes after |
| `errorModal` | `React.ReactNode` | Error modal node (rendered outside content area) |
| `initOverlayNode` | `React.ReactNode` | Loading overlay node (rendered outside content area) |
| `children` | `React.ReactNode` | Active view content |

## State
| State | Type | Description |
|-------|------|-------------|
| `sideNavOpen` | `boolean` | Whether the side nav panel is open |

## Internal behaviour
- Calls `useScreenBreakpoint()` to derive `isLG`
- Hamburger button (`aria-label="Open navigation"`) toggles `sideNavOpen`
- `onNavigate` closes the side nav after calling the provided callback

## Layouts

### LG (`isLG === true`)
```
<div className="flex flex-col h-full">
  <header> h-12 row: hamburger + <Header level={1}>Ray Optics Web</Header> </header>
  <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
    <SideNav isLG={true} ... />
    {children}
  </div>
  {errorModal}
  {initOverlayNode}
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
  {errorModal}
  {initOverlayNode}
</div>
```

## iOS Safari height note
`globals.css` sets `html, body { height: 100%; overflow: hidden; }`. This locks the document so it can never scroll. Without this, `h-screen` (`100vh`) on iOS Safari equals the "large viewport height" (address bar hidden), causing the layout to overflow when the address bar is visible. The resulting micro-scroll triggers the address bar to animate in/out, resizing the viewport and making the header jump. The `h-full` on the outer div fills the locked `body` height instead.

## Usages

```tsx
// In app/page.tsx
<Layout
  currentView={currentView}
  onNavigate={(view) => setCurrentView(view)}
  errorModal={errorModal}
  initOverlayNode={initOverlayNode}
>
  {currentView === "home" && lensEditor}
  {currentView === "settings" && <SettingsView ... />}
  {currentView === "glass-map" && <GlassMapView ... />}
  {currentView === "privacy-policy" && <PrivacyPolicyView />}
  {currentView === "about" && <AboutView />}
</Layout>
```
