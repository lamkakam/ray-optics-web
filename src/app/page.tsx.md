# page.tsx

## Purpose
Root page component (`"use client"`). Owns stores, Pyodide hook, theme, navigation state, and view routing. Delegates home-view content to `LensEditor`.

## State
| State | Type | Description |
|-------|------|-------------|
| `sideNavOpen` | `boolean` | Whether the side nav panel is open |
| `currentView` | `AppView` | Active view: `'home'`, `'settings'`, `'privacy-policy'`, `'about'` |
| `errorModalOpen` | `boolean` | Error modal visibility |

## Stores
- `specsStore` — `SpecsConfigurerState` (zustand)
- `lensStore` — `LensEditorState` (zustand)
- `analysisPlotStore` — `AnalysisPlotState` (zustand)

## Navigation
- Hamburger button (`aria-label="Open navigation"`) toggles `sideNavOpen`
- `SideNav` calls `onNavigate(view)` → sets `currentView`, closes side nav
- No URL changes (state-based routing)

## Layouts

### LG (`layoutLG`)
- Header: 1 row (`h-12`): hamburger + app title
- Below header: `relative flex-1` container holding `SideNav` + content
  - `currentView === 'home'`: `<LensEditor>` (see `src/components/page/LensEditor.tsx`)
  - `currentView === 'settings'`: `SettingsView`
  - `currentView === 'privacy-policy'`: `PrivacyPolicyView`
  - `currentView === 'about'`: `AboutView`
- `ErrorModal`, `LoadingOverlay`

### SM (`layoutSM`)
- Header: hamburger + title row only
- `relative flex flex-col` container holding `SideNav` + content views
  - `currentView === 'home'`: `<LensEditor>` (see `src/components/page/LensEditor.tsx`)
  - Other views same as LG
- `ErrorModal`, `LoadingOverlay`

## Removed (vs. previous version)
- All lens editor state (`layoutImage`, `layoutLoading`, `firstOrderData`, `computing`, `seidelData`, `seidelModalOpen`, `zernikeModalOpen`, `pendingExample`) — moved to `LensEditor`
- All lens editor callbacks — moved to `LensEditor`
- `ConfirmOverwriteModal`, `SeidelAberrModal`, `ZernikeTermsModal` JSX — moved to `LensEditor`
- `isLG` no longer passed as prop; `LensEditor` calls `useScreenBreakpoint()` internally
