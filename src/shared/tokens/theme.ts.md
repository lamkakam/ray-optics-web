# `shared/tokens/theme.ts`
test
## Purpose

Defines the discriminated string literal type representing the application's colour theme.

## Exports

```ts
export type Theme = "light" | "dark";
```

## Usages

```tsx
import type { Theme } from "@/shared/tokens/theme";
import { useTheme } from "@/components/ThemeProvider";

// In a container component
export function ThemedPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        Current: {theme}
      </button>
      <ChildComponent theme={theme} />
    </div>
  );
}

// Child components receive theme as a prop (for testability)
interface ChildComponentProps {
  theme: Theme;
}

export function ChildComponent({ theme }: ChildComponentProps) {
  return (
    <div className={theme === "dark" ? "bg-gray-900" : "bg-white"}>
      Content
    </div>
  );
}
```

Pass `Theme` as a prop rather than reading from store in leaf components, to keep them testable.
