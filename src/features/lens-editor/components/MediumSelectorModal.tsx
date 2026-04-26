"use client";

import { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";
import { Input } from "@/shared/components/primitives/Input";
import { InlineLink } from "@/shared/components/primitives/InlineLink";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";

const SPECIAL_MEDIA = ["air", "REFL"];

interface MediumSelectorModalProps {
  readonly isOpen: boolean;
  readonly initialMedium: string;
  readonly initialManufacturer: string;
  readonly readOnly?: boolean;
  readonly allowReflective?: boolean;
  readonly selectedMedium?: string;
  readonly selectedManufacturer?: string;
  readonly onSelectionChange?: (medium: string, manufacturer: string) => void;
  readonly onConfirm: (medium: string, manufacturer: string) => void;
  readonly onClose: () => void;
}

function isSpecialMedium(manufacturer: string): boolean {
  return manufacturer === "" || manufacturer === "air" || manufacturer === "Special";
}

function isNumericString(value: string): boolean {
  return !Number.isNaN(parseFloat(value));
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
    ...SPECIAL_MEDIA.filter((medium) => allowReflective || medium.toUpperCase() !== "REFL"),
    ...Object.keys(catalogs?.Special ?? {}),
  ];
  const isSpecial = manufacturer === "Special";
  const mediaOptions = isSpecial
    ? specialMediaOptions
    : getCatalogGlassNames(manufacturer);
  const showAbbeNumber = useModelGlass && !singleRefractiveIndex;
  const canSelectCatalogGlass = error === undefined && isLoaded;

  const updateCatalogSelection = (nextMedium: string, nextManufacturer: string) => {
    setLocalMedium(nextMedium);
    setLocalManufacturer(nextManufacturer);
    onSelectionChange?.(nextMedium, nextManufacturer);
  };

  const glassMapHref = (() => {
    if (useModelGlass || isSpecial || medium === "") {
      return undefined;
    }

    const params = new URLSearchParams({
      source: "medium-selector",
      catalog: manufacturer,
      glass: medium,
    });

    return `/glass-map?${params.toString()}`;
  })();

  return (
    <Modal isOpen={isOpen} title="Select Medium" titleId="medium-modal-title" size="md">
      {/* ── Form fields ── */}
      <div className="space-y-4 mb-4">
        <CheckboxInput
          id="use-model-glass"
          ariaLabel="Use model glass"
          checked={useModelGlass}
          label="Use model glass"
          disabled={readOnly}
          onChange={setUseModelGlass}
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
                Manufacturer
              </Label>
              <Select
                id="manufacturer-select"
                aria-label="Manufacturer"
                options={manufacturers.map((m) => ({ value: m, label: m }))}
                value={manufacturer}
                disabled={readOnly || !canSelectCatalogGlass}
                onChange={(e) => {
                  const newMfr = e.target.value;
                  if (newMfr === "Special") {
                    updateCatalogSelection("air", newMfr);
                  } else {
                    const list = getCatalogGlassNames(newMfr);
                    const nextMedium = list.length > 0 && !list.includes(medium)
                      ? list[0]
                      : medium;
                    updateCatalogSelection(nextMedium, newMfr);
                  }
                }}
              />
            </div>

            <div>
              <Label htmlFor="medium-select">
                Glass
              </Label>
              <Select
                id="medium-select"
                aria-label="Glass"
                options={mediaOptions.map((g) => ({ value: g, label: g }))}
                value={medium}
                disabled={readOnly || !canSelectCatalogGlass}
                onChange={(e) => updateCatalogSelection(e.target.value, manufacturer)}
              />
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
              onChange={(checked) => {
                setSingleRefractiveIndex(checked);
                if (checked) {
                  setAbbeNumber("");
                }
              }}
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

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {readOnly ? (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(
                useModelGlass
                  ? refractiveIndexAtDLine
                  : medium,
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
    </Modal>
  );
}
