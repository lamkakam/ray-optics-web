# page.tsx

## Purpose
Root page component (`"use client"`). Owns stores, Pyodide hook, theme, and view routing. Delegates layout chrome to `Layout` and home-view content to `LensEditor`.

## State
| State | Type | Description |
|-------|------|-------------|
| `currentView` | `AppView` | Active view: `'home'`, `'settings'`, `'privacy-policy'`, `'about'` |
| `errorModalOpen` | `boolean` | Error modal visibility |

## Stores
- `specsStore` — `SpecsConfigurerState` (zustand)
- `lensStore` — `LensEditorState` (zustand)
- `analysisPlotStore` — `AnalysisPlotState` (zustand)

## Navigation
- `Layout` owns hamburger/side-nav open state and screen-size detection
- `onNavigate` callback sets `currentView`
- No URL changes (state-based routing)

## Rendered structure
```tsx
<Layout currentView onNavigate errorModal initOverlayNode>
  {currentView === "home" && <LensEditor .../>}
  {currentView === "settings" && <SettingsView .../>}
  {currentView === "privacy-policy" && <PrivacyPolicyView />}
  {currentView === "about" && <AboutView />}
</Layout>
```

## Removed (vs. previous version)
- `sideNavOpen` state — moved to `Layout`
- `isLG` variable — moved to `Layout`
- `hamburgerButton` JSX — moved to `Layout`
- `sideNavNode` JSX — moved to `Layout`
- `layoutLG` / `layoutSM` JSX variables — replaced by `<Layout>`
- `useScreenBreakpoint` import — moved to `Layout`
- `SideNav` import — moved to `Layout`
- `Button` import — moved to `Layout`
- `Header` import — moved to `Layout`
