# `components/composite/PythonScriptModal.tsx`

## Purpose

Modal that displays a generated Python script in a scrollable code block with a floating "Copy" button that uses the Clipboard API. The copy button shows a transient "Copied!" confirmation.

## Props

```ts
interface PythonScriptModalProps {
  isOpen: boolean;
  script: string;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `script` | `string` | Yes | Python script text to display |
| `onClose` | `() => void` | Yes | Called when the OK button is clicked |

## Internal State

- `copied: boolean` — `true` for 2 seconds after a successful clipboard write, then reset to `false`.

## Key Behaviors

- Script is displayed in a `<pre><code>` block with `max-h-[60vh]` overflow scroll.
- Copy button uses `variant="floating"` positioned at top-right of the code block.
- `script` is computed lazily by the caller only when `isOpen` is `true` (performance optimization).

## Usages

```tsx
import { PythonScriptModal } from "@/components/composite/PythonScriptModal";
import { buildExportScript } from "@/lib/pythonScript";

// In a container component
const [pythonScriptOpen, setPythonScriptOpen] = useState(false);

return (
  <>
    <Button
      variant="secondary"
      size={buttonSize}
      onClick={() => setPythonScriptOpen(true)}
    >
      Export Python Script
    </Button>

    <PythonScriptModal
      isOpen={pythonScriptOpen}
      script={pythonScriptOpen ? buildExportScript(getOpticalModel()) : ""}
      onClose={() => setPythonScriptOpen(false)}
    />
  </>
);
```
