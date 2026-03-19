# `components/composite/SettingsModal.tsx`

## Purpose

Modal for application settings. Currently exposes a single theme selector (Light / Dark).

## Props

```ts
interface SettingsModalProps {
  isOpen: boolean;
  theme: Theme;
  onThemeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `theme` | `Theme` | Yes | Currently active theme (`"light"` or `"dark"`) |
| `onThemeChange` | `(e) => void` | Yes | Called on theme `<select>` change; receives the raw change event |
| `onClose` | `() => void` | Yes | Called when the OK button is clicked |

## Key Behaviors

- Stateless — the caller owns theme state (typically via `useTheme` from `ThemeProvider`).

## Usages

- Opened from the settings button.
