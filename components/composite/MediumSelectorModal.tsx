"use client";

import React, { useState, useEffect, useRef } from "react";

const MANUFACTURERS = ["Special", "Schott", "Hoya", "Ohara", "CDGM", "Hikari", "Sumita"];
const SPECIAL_MEDIA = ["air", "REFL"];

interface MediumSelectorModalProps {
  readonly isOpen: boolean;
  readonly initialMedium: string;
  readonly initialManufacturer: string;
  readonly onConfirm: (medium: string, manufacturer: string) => void;
  readonly onClose: () => void;
  readonly onFetchGlassList: (manufacturer: string) => Promise<string[]>;
}

function isSpecialMedium(manufacturer: string): boolean {
  return manufacturer === "air" || manufacturer === "Special";
}

/* ── Shared Tailwind class tokens ──────────────────────────── */
const cx = {
  backdrop: "absolute inset-0 bg-black/50 backdrop-blur-sm",
  panel:
    "relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-modal-enter dark:border-gray-700 dark:bg-gray-900",
  title:
    "mb-4 border-b border-gray-200 pb-3 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100",
  label:
    "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300",
  select:
    "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
  btnPrimary:
    "rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700",
  btnSecondary:
    "rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
};

export function MediumSelectorModal({
  isOpen,
  initialMedium,
  initialManufacturer,
  onConfirm,
  onClose,
  onFetchGlassList,
}: MediumSelectorModalProps) {
  const initialMfr = isSpecialMedium(initialManufacturer) ? "Special" : initialManufacturer;
  const [manufacturer, setManufacturer] = useState(initialMfr);
  const [medium, setMedium] = useState(initialMedium);
  const [glassList, setGlassList] = useState<string[]>([]);
  const glassCache = useRef<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen || manufacturer === "Special") return;

    if (glassCache.current[manufacturer]) {
      setGlassList(glassCache.current[manufacturer]);
      return;
    }

    let cancelled = false;
    onFetchGlassList(manufacturer).then((list) => {
      if (cancelled) return;
      glassCache.current[manufacturer] = list;
      setGlassList(list);
      if (list.length > 0 && !list.includes(medium)) {
        setMedium(list[0]);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen, manufacturer, onFetchGlassList, medium]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return undefined;

  const isSpecial = manufacturer === "Special";
  const mediaOptions = isSpecial ? SPECIAL_MEDIA : glassList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-testid="modal-backdrop"
        className={cx.backdrop}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="medium-modal-title"
        className={cx.panel}
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
                setManufacturer(e.target.value);
                if (e.target.value === "Special") {
                  setMedium("air");
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
              Medium
            </label>
            <select
              id="medium-select"
              aria-label="Medium"
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
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button type="button" className={cx.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={cx.btnPrimary}
            onClick={() => onConfirm(medium, isSpecial ? "air" : manufacturer)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
