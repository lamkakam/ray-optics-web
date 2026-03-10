"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";
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

  const backdrop = clsx(cx.modal.color.backdropBgColor, cx.modal.style.backdrop);
  const panel = clsx(cx.modal.style.panel, cx.modal.color.panelBorderColor, cx.modal.color.panelBgColor, cx.modal.size.panelPadding);
  const title = clsx(cx.modal.style.title, cx.modal.color.titleBorderColor, cx.modal.color.titleTextColor);
  const label = clsx(cx.label.style.base, cx.label.color.textColor, cx.label.size.default);
  const select = clsx(cx.select.style.base, cx.select.color.borderColor, cx.select.color.bgColor, cx.select.color.textColor, cx.select.size.padding, cx.select.size.fontSize);
  const divider = clsx(cx.divider.style.base, cx.divider.color.borderColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-testid="modal-backdrop"
        className={backdrop}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="medium-modal-title"
        className={`${panel} max-w-md`}
      >
        {/* ── Title ── */}
        <h2 id="medium-modal-title" className={title}>
          Select Medium
        </h2>

        {/* ── Form fields ── */}
        <div className="space-y-4 mb-4">
          <div>
            <label htmlFor="manufacturer-select" className={label}>
              Manufacturer
            </label>
            <select
              id="manufacturer-select"
              aria-label="Manufacturer"
              className={select}
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
            <label htmlFor="medium-select" className={label}>
              Glass
            </label>
            <select
              id="medium-select"
              aria-label="Glass"
              className={select}
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
        <div className={`flex items-center justify-end gap-3 pt-4 ${divider}`}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(medium, isSpecial ? "" : manufacturer)}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
