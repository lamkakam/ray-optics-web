/**
# `features/lens-editor/components/LensPrescriptionContainer/MediumSelectorModal/MediumSelectorModal.tsx`

## Internal State

- `manufacturer: string` — selected catalog/manufacturer value.
- `medium: string` — selected glass/medium.
- `useModelGlass: boolean` — whether the modal is in numeric model-glass mode.
- `singleRefractiveIndex: boolean` — whether the model glass should omit Abbe number.
- `refractiveIndexAtDLine: string` — model-glass refractive index input.
- `abbeNumber: string` — model-glass Abbe-number input.
- `catalogs / error / isLoaded` — injected from `useGlassCatalogs()`.

## Modal Footer

- Close, Cancel, and Confirm actions are passed to `Modal.footer` so they remain fixed while medium selection controls scroll.
*/
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";
import { Datalist } from "@/shared/components/primitives/Datalist";
import { Input } from "@/shared/components/primitives/Input";
import { InlineLink } from "@/shared/components/primitives/InlineLink";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import { builtInSpecialMaterial } from "@/shared/lib/utils/specialMaterials";

interface MediumSelectorModalProps {
  /** Controls modal visibility */
  readonly isOpen: boolean;
  /** Pre-selected medium on open */
  readonly initialMedium: string;
  /** Pre-selected manufacturer on open; empty string or `"air"` maps to `"Special"` */
  readonly initialManufacturer: string;
  /** When `true`, all controls are disabled and the footer shows only `Close` */
  readonly readOnly?: boolean;
  /** When `false`, `"REFL"` is removed from the Special media options */
  readonly allowReflective?: boolean;
  /** Controlled catalog-glass medium value used when the parent persists an unconfirmed draft */
  readonly selectedMedium?: string;
  /** Controlled catalog-glass manufacturer value used with `selectedMedium` */
  readonly selectedManufacturer?: string;
  /** Called whenever the catalog-glass draft changes */
  readonly onSelectionChange?: (medium: string, manufacturer: string) => void;
  /** Called with the selected medium and manufacturer (empty string for Special) */
  readonly onConfirm: (medium: string, manufacturer: string) => void;
  /** Cancel / close callback */
  readonly onClose: () => void;
}

function isSpecialMedium(manufacturer: string): boolean {
  return manufacturer === "" || manufacturer === "air" || manufacturer === "Special";
}

function isNumericString(value: string): boolean {
  return !Number.isNaN(parseFloat(value));
}

function isFiniteNumberAtLeast(value: string, minimum: number): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= minimum;
}

function normalizePositiveNumericString(value: string): string {
  const parsed = parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? value.trim() : "1.0";
}

function normalizeNumericOrEmptyString(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    return "";
  }

  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? trimmed : "";
}

/**
## Purpose

Modal for selecting an optical medium (glass or special medium) or entering a numeric model glass. The Catalog dropdown, Special-media dropdown, and searchable catalog-glass datalist are populated from the app-wide `GlassCatalogProvider`, which uses the same Pyodide-backed catalog source as the glass map.

## Key Behaviors

- When the Catalog field changes to `"Special"`, medium resets to `"air"`.
- Glass is a shared `Select` dropdown for the `"Special"` manufacturer, containing built-in and provider-backed Special media.
- Glass is a searchable native datalist for catalogs, with suggestions limited to the selected catalog.
- Typed glass values must completely match an available suggestion, with case-insensitive comparison. Valid matches are canonicalized to the catalog's original spelling before draft updates, confirmation, and glass-map navigation.
- An unmatched catalog value remains visible for continued searching, disables Confirm without showing an error, and hides the glass-map link.
- Catalog options come from loaded provider catalogs with `"Special"` prefixed and empty catalogs omitted.
- The `"Special"` glass list combines the shared `builtInSpecialMaterial` collection (`"air"`, `"REFL"`) with provider-backed special glasses such as `"CaF2"`.
- When `allowReflective` is `false`, `"REFL"` is excluded from the Special media list so object-space media cannot be set to reflective.
- Whenever Catalog changes to a catalog, the visible Glass value and draft medium are cleared, `onSelectionChange` reports `("", manufacturer)`, Confirm is disabled, and the glass-map link is hidden until a valid catalog glass is entered.
- When `selectedMedium` / `selectedManufacturer` are provided, valid catalog-glass drafts are controlled by the parent so unconfirmed choices can survive route changes.
- `onSelectionChange` fires for catalog-glass changes and reports `"Special"` for the special manufacturer option.
- `onConfirm` passes an empty string for manufacturer when `"Special"` is selected.
- When `Use model glass` is unchecked and a catalog glass is selected, an inline `View in glass map` link appears below the glass dropdown.
- Disabling `Use model glass` resets the catalog draft to Catalog `"Special"` and Glass `"air"`, including controlled parent state through `onSelectionChange`, while preserving the model-glass input values for a later toggle back to model-glass mode.
- The glass-map link targets `/glass-map` with query params `source=medium-selector`, `catalog=<manufacturer>`, and `glass=<medium>`.
- For `"Special"`, the glass-map link is shown for valid provider-backed glasses such as `"CaF2"` and targets the `Special` catalog. It is hidden for built-in media (`"air"`, `"REFL"`), invalid selections, and model-glass mode.
- If catalog data is still loading or failed, the modal shows a status message and disables the Catalog select and glass datalist instead of assuming static bundled data.
- A shared compact `CheckboxInput` labelled `Use model glass` appears above the catalog controls and defaults to unchecked for non-numeric initial values.
- When `Use model glass` is checked, the Catalog and Glass dropdowns are replaced by:
  - a `Single refractive index` checkbox rendered with the shared checkbox primitive
  - a `Refractive index at d-line` input
  - an `Abbe Number` input when `Single refractive index` is unchecked
- When `Single refractive index` is checked, the Abbe Number input is hidden without clearing its value. Unchecking it restores the value held in component state.
- If `initialMedium` parses to a float, the modal auto-enters model-glass mode and seeds the refractive-index input with the original `initialMedium` string.
- If `initialManufacturer` also parses to a float, the modal seeds the Abbe Number input and leaves `Single refractive index` unchecked.
- If `initialMedium` is numeric but `initialManufacturer` is not, the modal starts in model-glass mode with `Single refractive index` checked.
- On blur, `Refractive index at d-line` is normalized to a positive numeric string; parse failure, `NaN`, zero, or negative values reset it to `"1.0"`.
- On blur, `Abbe Number` is normalized to either a numeric string or the empty string; parse failure or `NaN` resets it to `""`.
- In model-glass mode, `onConfirm` passes `(refractiveIndexAtDLine, abbeNumber)` or `(refractiveIndexAtDLine, "")` when `Single refractive index` is checked.
- In model-glass mode, Confirm is enabled only when the refractive index is a non-empty, finite numeric value greater than or equal to `1`.
- When `Single refractive index` is unchecked, Confirm additionally requires a non-empty, finite numeric Abbe Number greater than `0`; single-index mode ignores the Abbe Number.
- Model-glass validity is evaluated immediately while editing, before blur normalization. Catalog-glass Confirm validation remains based on an exact available-medium match.
- In `readOnly` mode, all checkboxes, selects, and inputs are disabled and the footer renders a single `Close` action instead of `Cancel` / `Confirm`.
- Uses `key` prop at the call site (in `LensPrescriptionContainer`) to reset state when the modal re-opens for a different row.

## Usages

```tsx
import { MediumSelectorModal } from "@/features/lens-editor/components/LensPrescriptionContainer";

// In a container component (e.g., LensPrescriptionContainer)
const mediumRow = rows.find((r) => r.id === mediumModal.rowId);

return (
  <>
    <MediumSelectorModal
      key={mediumModal.open ? mediumModal.rowId : "medium-closed"}
      isOpen={mediumModal.open}
      initialMedium={mediumRow?.kind === "surface" || mediumRow?.kind === "object" ? mediumRow.medium : "air"}
      initialManufacturer={mediumRow?.kind === "surface" || mediumRow?.kind === "object" ? mediumRow.manufacturer : ""}
      allowReflective={mediumRow?.kind !== "object"}
      onConfirm={(medium, manufacturer) => {
        store.getState().updateRow(mediumModal.rowId, { medium, manufacturer });
        store.getState().closeMediumModal();
      }}
      onClose={() => store.getState().closeMediumModal()}
    />
  </>
);
```
*/
export function MediumSelectorModal({
  isOpen,
  initialMedium,
  initialManufacturer,
  readOnly = false,
  allowReflective = true,
  selectedMedium,
  selectedManufacturer,
  onSelectionChange,
  onConfirm,
  onClose,
}: MediumSelectorModalProps) {
  const initialUseModelGlass = isNumericString(initialMedium);
  const initialHasAbbeNumber = isNumericString(initialManufacturer);
  const initialMfr = isSpecialMedium(initialManufacturer) ? "Special" : initialManufacturer;
  const { catalogs, error, isLoaded } = useGlassCatalogs();
  const [localManufacturer, setLocalManufacturer] = useState(initialMfr);
  const [localMedium, setLocalMedium] = useState(initialMedium);
  const [glassInput, setGlassInput] = useState(selectedMedium ?? initialMedium);
  const [useModelGlass, setUseModelGlass] = useState(initialUseModelGlass);
  const [singleRefractiveIndex, setSingleRefractiveIndex] = useState(
    initialUseModelGlass && !initialHasAbbeNumber,
  );
  const [refractiveIndexAtDLine, setRefractiveIndexAtDLine] = useState(
    initialUseModelGlass ? initialMedium : "",
  );
  const [abbeNumber, setAbbeNumber] = useState(initialHasAbbeNumber ? initialManufacturer : "");
  const manufacturer = selectedManufacturer ?? localManufacturer;
  const medium = selectedMedium ?? localMedium;
  const catalogLookup = catalogs as Record<string, Record<string, unknown>> | undefined;
  const getCatalogGlassNames = (catalogName: string): string[] => Object.keys(catalogLookup?.[catalogName] ?? {});

  const manufacturers = [
    "Special",
    ...Object.entries(catalogs ?? {})
      .filter(([catalogName, glasses]) => catalogName !== "Special" && Object.keys(glasses).length > 0)
      .map(([catalogName]) => catalogName),
  ];
  const specialMediaOptions = [
    ...Array.from(builtInSpecialMaterial).filter(
      (medium) => allowReflective || medium.toUpperCase() !== "REFL",
    ),
    ...Object.keys(catalogs?.Special ?? {}),
  ];
  const isSpecial = manufacturer === "Special";
  const mediaOptions = isSpecial
    ? specialMediaOptions
    : getCatalogGlassNames(manufacturer);
  const canonicalMedium = mediaOptions.find(
    (option) => option.toLocaleLowerCase() === glassInput.toLocaleLowerCase(),
  );
  const hasValidCatalogMedium = canonicalMedium !== undefined;
  const showAbbeNumber = useModelGlass && !singleRefractiveIndex;
  const hasValidModelGlass = isFiniteNumberAtLeast(refractiveIndexAtDLine, 1)
    && (singleRefractiveIndex || (
      isFiniteNumberAtLeast(abbeNumber, 0) && Number(abbeNumber.trim()) > 0
    ));
  const canConfirm = useModelGlass ? hasValidModelGlass : hasValidCatalogMedium;
  const canSelectCatalogGlass = error === undefined && isLoaded;

  const updateCatalogSelection = (nextMedium: string, nextManufacturer: string) => {
    setGlassInput(nextMedium);
    setLocalMedium(nextMedium);
    setLocalManufacturer(nextManufacturer);
    onSelectionChange?.(nextMedium, nextManufacturer);
  };

  const handleUseModelGlassChange = (nextUseModelGlass: boolean) => {
    setUseModelGlass(nextUseModelGlass);
    if (!nextUseModelGlass) {
      updateCatalogSelection("air", "Special");
    }
  };

  const glassMapHref = (() => {
    if (
      useModelGlass
      || canonicalMedium === undefined
      || (isSpecial && builtInSpecialMaterial.has(canonicalMedium))
    ) {
      return undefined;
    }

    const params = new URLSearchParams({
      source: "medium-selector",
      catalog: manufacturer,
      glass: canonicalMedium,
    });

    return `/glass-map?${params.toString()}`;
  })();

  return (
    <Modal
      isOpen={isOpen}
      title="Select Medium"
      titleId="medium-modal-title"
      size="md"
      footer={(
        <div className="flex items-center justify-end gap-3">
          {readOnly ? (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!canConfirm}
                onClick={() => onConfirm(
                  useModelGlass
                    ? refractiveIndexAtDLine
                    : canonicalMedium ?? medium,
                  useModelGlass
                    ? (singleRefractiveIndex ? "" : abbeNumber)
                    : (isSpecial ? "" : manufacturer),
                )}
              >
                Confirm
              </Button>
            </>
          )}
        </div>
      )}
    >
      {/* ── Form fields ── */}
      <div className="space-y-4 mb-4">
        <CheckboxInput
          id="use-model-glass"
          ariaLabel="Use model glass"
          checked={useModelGlass}
          label="Use model glass"
          disabled={readOnly}
          onChange={handleUseModelGlassChange}
        />

        {!useModelGlass && (
          <>
            {!canSelectCatalogGlass && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {error ?? "Loading glass catalog data…"}
              </p>
            )}
            <div>
              <Label htmlFor="manufacturer-select">
                Catalog
              </Label>
              <Select
                id="manufacturer-select"
                aria-label="Catalog"
                options={manufacturers.map((m) => ({ value: m, label: m }))}
                value={manufacturer}
                disabled={readOnly || !canSelectCatalogGlass}
                onChange={(e) => {
                  const newMfr = e.target.value;
                  if (newMfr === "Special") {
                    updateCatalogSelection("air", newMfr);
                  } else {
                    updateCatalogSelection("", newMfr);
                  }
                }}
              />
            </div>

            <div>
              <Label htmlFor="medium-select">
                Glass
              </Label>
              {isSpecial ? (
                <Select
                  id="medium-select"
                  aria-label="Glass"
                  options={specialMediaOptions.map((g) => ({ value: g, label: g }))}
                  value={glassInput}
                  disabled={readOnly || !canSelectCatalogGlass}
                  onChange={(e) => updateCatalogSelection(e.target.value, manufacturer)}
                />
              ) : (
                <Datalist
                  id="medium-select"
                  aria-label="Glass"
                  options={mediaOptions.map((g) => ({ value: g, label: g }))}
                  value={glassInput}
                  disabled={readOnly || !canSelectCatalogGlass}
                  onChange={(e) => {
                    const typedValue = e.target.value;
                    const match = mediaOptions.find(
                      (option) => option.toLocaleLowerCase() === typedValue.toLocaleLowerCase(),
                    );
                    setGlassInput(match ?? typedValue);
                    if (match !== undefined) {
                      updateCatalogSelection(match, manufacturer);
                    }
                  }}
                />
              )}
              {glassMapHref && (
                <div className="mt-2">
                  <InlineLink href={glassMapHref} aria-label="View in glass map">
                    View in glass map
                  </InlineLink>
                </div>
              )}
            </div>
          </>
        )}

        {useModelGlass && (
          <>
            <CheckboxInput
              id="single-refractive-index"
              ariaLabel="Single refractive index"
              checked={singleRefractiveIndex}
              label="Single refractive index"
              disabled={readOnly}
              onChange={setSingleRefractiveIndex}
            />

            <div>
              <Label htmlFor="refractive-index-input">
                Refractive index at d-line
              </Label>
              <Input
                id="refractive-index-input"
                aria-label="Refractive index at d-line"
                value={refractiveIndexAtDLine}
                disabled={readOnly}
                onChange={(e) => setRefractiveIndexAtDLine(e.target.value)}
                onBlur={(e) => setRefractiveIndexAtDLine(normalizePositiveNumericString(e.target.value))}
              />
            </div>

            {showAbbeNumber && (
              <div>
                <Label htmlFor="abbe-number-input">
                  Abbe Number
                </Label>
                <Input
                  id="abbe-number-input"
                  aria-label="Abbe Number"
                  value={abbeNumber}
                  disabled={readOnly}
                  onChange={(e) => setAbbeNumber(e.target.value)}
                  onBlur={(e) => setAbbeNumber(normalizeNumericOrEmptyString(e.target.value))}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
