"use client";

import React, { useState, useEffect } from "react";
import { cx } from "@/components/ui/modalTokens";

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

function padCoefficients(coefficients: number[]): string[] {
  const c = [...coefficients];
  while (c.length < 10) c.push(0);
  return c.map(String);
}

function parseNumericString(s: string, fallback: number): number {
  const trimmed = s.trim();
  if (trimmed === "") return fallback;
  const v = parseFloat(trimmed);
  return Number.isFinite(v) ? v : fallback;
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
  const [conicConstantStr, setConicConstantStr] = useState(String(initialConicConstant));
  const [type, setType] = useState<AsphericalType>(initialType);
  const [coefficientStrs, setCoefficientStrs] = useState<string[]>(() =>
    padCoefficients(initialCoefficients)
  );



  const handleConfirm = () => {
    const conicConstant = parseNumericString(conicConstantStr, initialConicConstant);
    const coefficients = coefficientStrs.map((s, i) =>
      parseNumericString(s, initialCoefficients[i] ?? 0)
    );
    const polynomialCoefficients =
      type === "EvenAspherical" ? truncateTrailingZeros(coefficients) : [];
    onConfirm({ conicConstant, type, polynomialCoefficients });
  };

  const updateCoefficient = (index: number, value: string) => {
    setCoefficientStrs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  if (!isOpen) return undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-testid="modal-backdrop"
        className={cx.backdrop}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aspherical-modal-title"
        className={cx.panel}
      >
        {/* ── Title ── */}
        <h2 id="aspherical-modal-title" className={cx.title}>
          Aspherical Parameters
        </h2>

        {/* ── Conic constant + Type (2-col grid) ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="conic-constant" className={cx.label}>
              Conic constant
            </label>
            <input
              id="conic-constant"
              aria-label="Conic constant"
              type="text"
              className={cx.input}
              value={conicConstantStr}
              onChange={(e) => setConicConstantStr(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="aspherical-type" className={cx.label}>
              Type
            </label>
            <select
              id="aspherical-type"
              aria-label="Type"
              className={cx.select}
              value={type}
              onChange={(e) => setType(e.target.value as AsphericalType)}
            >
              <option value="Conical">Conical</option>
              <option value="EvenAspherical">Even Aspherical</option>
            </select>
          </div>
        </div>

        {/* ── Polynomial coefficients (2-col grid) ── */}
        {type === "EvenAspherical" && (
          <div className="mb-4">
            <p className={`mb-2 ${cx.label}`}>
              Even Aspherical Coefficients
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COEFFICIENT_LABELS.map((label, i) => (
                <div key={label}>
                  <label htmlFor={`coeff-${label}`} className={cx.label}>
                    {label}
                  </label>
                  <input
                    id={`coeff-${label}`}
                    aria-label={label}
                    type="text"
                    className={cx.input}
                    value={coefficientStrs[i]}
                    onChange={(e) => updateCoefficient(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className={`flex items-center gap-3 pt-4 ${cx.divider}`}>
          <button type="button" className={cx.btnDanger} onClick={onRemove}>
            Remove Aspherical
          </button>
          <span className="flex-1" />
          <button type="button" className={cx.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={cx.btnPrimary} onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
