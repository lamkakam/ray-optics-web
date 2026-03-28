# appView.ts

## Purpose
Defines the `AppView` discriminated union type used for state-based in-app routing in `page.tsx`.

## Exported Types

### `AppView`
```ts
type AppView = 'home' | 'glass-map' | 'settings' | 'privacy-policy' | 'about';
```

- `'home'` — Main optical design view (lens layout, analysis plots, bottom drawer)
- `'glass-map'` — Interactive glass map scatter plot rendered by `GlassMapView`
- `'settings'` — Settings view rendered by `SettingsView`
- `'privacy-policy'` — Privacy policy content rendered by `PrivacyPolicyView`
- `'about'` — About page rendered by `AboutView`

## Usage
Consumed by `page.tsx` (`currentView` state), `SideNav` (`currentView` prop, `onNavigate` callback), and each view component.
