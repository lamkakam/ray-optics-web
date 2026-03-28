# page.tsx

## Purpose
Root page component (`"use client"`). Owns all top-level state and wires together the optical model workflow, side navigation, and view routing.

## State
| State | Type | Description |
|-------|------|-------------|
| `sideNavOpen` | `boolean` | Whether the side nav panel is open |
| `currentView` | `AppView` | Active view: `'home'`, `'settings'`, `'privacy-policy'`, `'about'` |
| `layoutImage` | `string \| undefined` | Base64 lens layout SVG |
| `layoutLoading` | `boolean` | Lens layout loading flag |
| `firstOrderData` | `Record<string, number> \| undefined` | First-order optical data |
| `computing` | `boolean` | Submit in-progress flag |
| `errorModalOpen` | `boolean` | Error modal visibility |
| `seidelData` | `SeidelData \| undefined` | 3rd-order Seidel data (populated after submit) |
| `seidelModalOpen` | `boolean` | Seidel modal visibility |
| `zernikeModalOpen` | `boolean` | Zernike modal visibility |
| `pendingExample` | `string \| undefined` | Name of example system pending confirmation |

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
- Header: 2 rows
  - Row 1 (`h-12`): hamburger + app title
  - Row 2 (`pb-2`): example system dropdown + Seidel/Zernike buttons
- Below header: `relative flex-1` container holding `SideNav` + content
  - `currentView === 'home'`: first-order chips + lens/analysis panels + `BottomDrawerContainer`
  - `currentView === 'settings'`: `SettingsView`
  - `currentView === 'privacy-policy'`: `PrivacyPolicyView`
  - `currentView === 'about'`: `AboutView`

### SM (`layoutSM`)
- Header: hamburger + title row, then example dropdown + Seidel/Zernike buttons + first-order chips
- `relative flex flex-col` container holding `SideNav` + content views
- `BottomDrawerContainer` rendered only when `currentView === 'home'`

## Removed (vs. previous version)
- `settingsModalOpen`, `privacyPolicyModalOpen` state
- `SettingsModal`, `PrivacyPolicyModal` JSX nodes
- Privacy Policy and Settings header buttons
