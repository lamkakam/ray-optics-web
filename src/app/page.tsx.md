# page.tsx

## Purpose
Root page component (`"use client"`). Owns stores, Pyodide hook, theme, and view routing. Delegates layout chrome to `Layout` and home-view content to `LensEditor`.

## State
| State | Type | Description |
|-------|------|-------------|
| `currentView` | `AppView` | Active view: `'home'`, `'settings'`, `'privacy-policy'`, `'about'` |
| `errorModalOpen` | `boolean` | Error modal visibility |

## Stores
- `lensLayoutImageStore` — `LensLayoutImageState` (zustand, created here)

## Navigation
- `Layout` owns hamburger/side-nav open state and screen-size detection
- `onNavigate` callback sets `currentView`
- No URL changes (state-based routing)

## MathJax
A single `<MathJaxContext>` from `better-react-mathjax` wraps the entire app at this level. All child components (`GlassDetailPanel`, `SeidelAberrModal`, `ZernikeTermsModal`, `AsphericalModal`, etc.) can use `<MathJax>` without owning their own context, preventing the "Typesetting failed: Cannot read properties of null (reading 'nextSibling')" crash caused by multiple simultaneous `MathJaxContext` instances.

## Rendered structure
```tsx
<MathJaxContext>
  <Layout currentView onNavigate errorModal initOverlayNode>
    {currentView === "home" && <LensEditor .../>}
    {currentView === "settings" && <SettingsView .../>}
    {currentView === "glass-map" && <GlassMapView .../>}
    {currentView === "privacy-policy" && <PrivacyPolicyView />}
    {currentView === "about" && <AboutView />}
  </Layout>
</MathJaxContext>
```
