# `features/lens-editor/components/ConfirmOverwriteModal.tsx`

## Purpose

Simple confirmation modal that warns the user that loading an example system will overwrite their current configuration.

## Props

```ts
interface ConfirmOverwriteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onConfirm` | `() => void` | Yes | Proceeds with loading the example system |
| `onCancel` | `() => void` | Yes | Aborts the operation |

## Key Behaviors

- Stateless — purely presentational. Structurally identical to `ConfirmImportModal` but with different copy.
- The parent (`app/page.tsx` `handleExampleConfirm`) is responsible for triggering the optical system computation after loading; clicking "Load" also initiates `handleSubmit` automatically.

## Usages

```tsx
import { ConfirmOverwriteModal } from "@/features/lens-editor/components/ConfirmOverwriteModal";

// In a page component (e.g., LensEditor)
const [pendingExample, setPendingExample] = useState<string | undefined>();

const handleExampleConfirm = useCallback(() => {
  if (!pendingExample) return;
  const system = ExampleSystems[pendingExample];
  specsStore.getState().loadExampleSystem(system.specs);
  lensStore.getState().loadExampleSystem(system.opticalModel);
  setPendingExample(undefined);
  handleSubmit(); // Trigger system update
}, [pendingExample, specsStore, lensStore, handleSubmit]);

const handleExampleCancel = useCallback(() => {
  setPendingExample(undefined);
}, []);

return (
  <>
    <ConfirmOverwriteModal
      isOpen={pendingExample !== undefined}
      onConfirm={handleExampleConfirm}
      onCancel={handleExampleCancel}
    />
  </>
);
```
