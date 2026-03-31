# `shared/lib/types/appView.ts`

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

```tsx
import type { AppView } from "@/shared/lib/types/appView";
import { HomePage } from "@/components/views/HomePage";
import { GlassMapView } from "@/components/views/GlassMapView";
import { SettingsView } from "@/components/views/SettingsView";

// In page.tsx
export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>("home");

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case "home":
        return <HomePage />;
      case "glass-map":
        return <GlassMapView />;
      case "settings":
        return <SettingsView />;
      case "privacy-policy":
        return <div>Privacy Policy Content</div>;
      case "about":
        return <div>About Content</div>;
    }
  };

  return (
    <div>
      <SideNav currentView={currentView} onNavigate={handleNavigate} />
      <main>{renderView()}</main>
    </div>
  );
}
```

Consumed by `page.tsx` for state-based routing, `SideNav` for navigation, and each view component.
