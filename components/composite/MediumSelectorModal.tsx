"use client";

import React, { useState } from "react";
import { cx } from "@/components/ui/modalTokens";
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



  if (!isOpen) return undefined;

  const isSpecial = manufacturer === "Special";
  const mediaOptions = isSpecial
    ? SPECIAL_MEDIA
    : (glassCatalogs as Record<string, string[]>)[manufacturer] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-testid="modal-backdrop"
        className={cx.backdrop}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="medium-modal-title"
        className={cx.panel + " max-w-md"}
      >
        {/* ── Title ── */}
        <h2 id="medium-modal-title" className={cx.title}>
          Select Medium
        </h2>

        {/* ── Form fields ── */}
        <div className="space-y-4 mb-4">
          <div>
            <label htmlFor="manufacturer-select" className={cx.label}>
              Manufacturer
            </label>
            <select
              id="manufacturer-select"
              aria-label="Manufacturer"
              className={cx.select}
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
            >
              {MANUFACTURERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="medium-select" className={cx.label}>
              Glass
            </label>
            <select
              id="medium-select"
              aria-label="Glass"
              className={cx.select}
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            >
              {mediaOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={`flex items-center justify-end gap-3 pt-4 ${cx.divider}`}>
          <button type="button" className={cx.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={cx.btnPrimary}
            onClick={() => onConfirm(medium, isSpecial ? "" : manufacturer)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
