"use client";

import React, { useState, useEffect } from "react";

export type AsphericalType = "Conical" | "EvenAspherical";

const COEFFICIENT_LABELS = ["a2", "a4", "a6", "a8", "a10", "a12", "a14", "a16", "a18", "a20"];

interface AsphericalModalProps {
  readonly isOpen: boolean;
  readonly initialConicConstant: number;
  readonly initialType: AsphericalType;
  readonly initialCoefficients: number[];
  readonly onConfirm: (params: {
    conicConstant: number;
    type: AsphericalType;
    polynomialCoefficients: number[];
  }) => void;
  readonly onClose: () => void;
  readonly onRemove: () => void;
}

function truncateTrailingZeros(arr: number[]): number[] {
  let lastNonZero = -1;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== 0) {
      lastNonZero = i;
      break;
    }
  }
  return lastNonZero === -1 ? [] : arr.slice(0, lastNonZero + 1);
}

function padCoefficients(coefficients: number[]): number[] {
  const c = [...coefficients];
  while (c.length < 10) c.push(0);
  return c;
}

export function AsphericalModal({
  isOpen,
  initialConicConstant,
  initialType,
  initialCoefficients,
  onConfirm,
  onClose,
  onRemove,
}: AsphericalModalProps) {
  const [conicConstant, setConicConstant] = useState(initialConicConstant);
  const [type, setType] = useState<AsphericalType>(initialType);
  const [coefficients, setCoefficients] = useState<number[]>(() =>
    padCoefficients(initialCoefficients)
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    const polynomialCoefficients =
      type === "EvenAspherical" ? truncateTrailingZeros(coefficients) : [];
    onConfirm({ conicConstant, type, polynomialCoefficients });
  };

  const updateCoefficient = (index: number, value: number) => {
    setCoefficients((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  if (!isOpen) return undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aspherical-modal-title"
    >
      <h2 id="aspherical-modal-title">Aspherical Parameters</h2>

      <label htmlFor="conic-constant">Conic constant</label>
      <input
        id="conic-constant"
        aria-label="Conic constant"
        type="number"
        step="any"
        value={conicConstant}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) setConicConstant(v);
        }}
      />

      <label htmlFor="aspherical-type">Type</label>
      <select
        id="aspherical-type"
        aria-label="Type"
        value={type}
        onChange={(e) => setType(e.target.value as AsphericalType)}
      >
        <option value="Conical">Conical</option>
        <option value="EvenAspherical">Even Aspherical</option>
      </select>

      {type === "EvenAspherical" && (
        <div>
          {COEFFICIENT_LABELS.map((label, i) => (
            <div key={label}>
              <label htmlFor={`coeff-${label}`}>{label}</label>
              <input
                id={`coeff-${label}`}
                aria-label={label}
                type="number"
                step="any"
                value={coefficients[i]}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) updateCoefficient(i, v);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onRemove}>
        Remove Aspherical
      </button>
      <button type="button" onClick={handleConfirm}>
        Confirm
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
