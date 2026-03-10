"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Select } from "@/components/micro/Select";
import glassCatalogs from "@/data/glass-catalogs.json";

const MANUFACTURERS = ["Special", ...Object.keys(glassCatalogs)];
const SPECIAL_MEDIA = ["air", "REFL", "CaF2"];

interface MediumSelectorModalProps {
  readonly isOpen: boolean;
  readonly initialMedium: string;
  readonly initialManufacturer: string;
  readonly onConfirm: (medium: string, manufacturer: string) => void;
  readonly onClose: () => void;
}

function isSpecialMedium(manufacturer: string): boolean {
  return manufacturer === "" || manufacturer === "air" || manufacturer === "Special";
}

export function MediumSelectorModal({
  isOpen,
  initialMedium,
  initialManufacturer,
  onConfirm,
  onClose,
}: MediumSelectorModalProps) {
  const initialMfr = isSpecialMedium(initialManufacturer) ? "Special" : initialManufacturer;
  const [manufacturer, setManufacturer] = useState(initialMfr);
  const [medium, setMedium] = useState(initialMedium);



  const isSpecial = manufacturer === "Special";
  const mediaOptions = isSpecial
    ? SPECIAL_MEDIA
    : (glassCatalogs as Record<string, string[]>)[manufacturer] ?? [];

  const label = clsx(cx.label.style.baseDisplay, cx.label.style.baseFontWeight, cx.label.size.baseMargin, cx.label.color.textColor, cx.label.size.default);
  const divider = clsx(cx.divider.style.base, cx.divider.color.borderColor);

  return (
    <Modal isOpen={isOpen} title="Select Medium" titleId="medium-modal-title" size="md">
        {/* ── Form fields ── */}
        <div className="space-y-4 mb-4">
          <div>
            <label htmlFor="manufacturer-select" className={label}>
              Manufacturer
            </label>
            <Select
              id="manufacturer-select"
              aria-label="Manufacturer"
              options={MANUFACTURERS.map((m) => ({ value: m, label: m }))}
              value={manufacturer}
              onChange={(e) => {
                const newMfr = e.target.value;
                setManufacturer(newMfr);
                if (newMfr === "Special") {
                  setMedium("air");
                } else {
                  const list = (glassCatalogs as Record<string, string[]>)[newMfr] ?? [];
                  if (list.length > 0 && !list.includes(medium)) {
                    setMedium(list[0]);
                  }
                }
              }}
            />
          </div>

          <div>
            <label htmlFor="medium-select" className={label}>
              Glass
            </label>
            <Select
              id="medium-select"
              aria-label="Glass"
              options={mediaOptions.map((g) => ({ value: g, label: g }))}
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={`flex items-center justify-end gap-3 pt-4 ${divider}`}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(medium, isSpecial ? "" : manufacturer)}>
            Confirm
          </Button>
        </div>
    </Modal>
  );
}
