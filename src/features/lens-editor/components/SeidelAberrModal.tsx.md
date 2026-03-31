# `features/lens-editor/components/SeidelAberrModal.tsx`

## Purpose

Modal that displays third-order Seidel aberration data in a four-tab layout: Surface by Surface, Transverse, Wavefront, and Field Curvature. Uses MathJax for a disclaimer about the approximation's scope.

## Props

```ts
interface SeidelAberrModalProps {
  isOpen: boolean;
  data: SeidelData;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `data` | `SeidelData` | Yes | Seidel aberration data from the Pyodide worker (`get_3rd_order_seidel_data`) |
| `onClose` | `() => void` | Yes | Called when the OK button is clicked |

## Key Behaviors

- Table data for all four tabs is derived with `useMemo` to avoid recomputing on unrelated renders.
- Aberration type keys (e.g. `"TSA"`, `"W040"`) are mapped to human-readable labels via `ABERRATION_TYPE_TO_LABEL`.
- Field Curvature tab includes a Curvature Radius column (reciprocal of value; `"Infinite"` when value is 0).
- Uses `<MathJax inline>` for LaTeX rendering; `MathJaxContext` is provided by the ancestor (`page.tsx`).

## Usages

```tsx
import { SeidelAberrModal } from "@/features/lens-editor/components/SeidelAberrModal";

// In a page component (e.g., LensEditor)
const seidelData = useStore(analysisDataStore, (s) => s.seidelData);
const [seidelModalOpen, setSeidelModalOpen] = useState(false);

const seidelModal = seidelData && (
  <SeidelAberrModal
    isOpen={seidelModalOpen}
    data={seidelData}
    onClose={() => setSeidelModalOpen(false)}
  />
);

return (
  <div>
    {/* Toolbar button */}
    {seidelData && (
      <Button onClick={() => setSeidelModalOpen(true)}>
        Seidel Aberrations
      </Button>
    )}

    {seidelModal}
  </div>
);
```
