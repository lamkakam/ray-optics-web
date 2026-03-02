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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="medium-modal-title"
    >
      <h2 id="medium-modal-title">Select Medium</h2>

      <label htmlFor="manufacturer-select">Manufacturer</label>
      <select
        id="manufacturer-select"
        aria-label="Manufacturer"
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

      <label htmlFor="medium-select">Medium</label>
      <select
        id="medium-select"
        aria-label="Medium"
        value={medium}
        onChange={(e) => setMedium(e.target.value)}
      >
        {mediaOptions.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <button type="button" onClick={() => onConfirm(medium, isSpecial ? "air" : manufacturer)}>
        Confirm
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
