"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";
import { Input } from "@/components/micro/Input";
import { Modal } from "@/components/micro/Modal";

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

  const label = clsx(cx.label.style.baseDisplay, cx.label.style.baseFontWeight, cx.label.size.baseMargin, cx.label.color.textColor, cx.label.size.default);
  const select = clsx(cx.select.style.borderRadius, cx.select.style.borderStyle, cx.select.style.outlineStyle, cx.select.style.transitionStyle, cx.select.size.defaultWidth, cx.select.size.focusRingWidth, cx.select.color.focusRingColor, cx.select.color.borderColor, cx.select.color.bgColor, cx.select.color.textColor, cx.select.size.horizontalPadding, cx.select.size.verticalPadding, cx.select.size.fontSize);
  const divider = clsx(cx.divider.style.base, cx.divider.color.borderColor);

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

  return (
    <Modal isOpen={isOpen} title="Aspherical Parameters" titleId="aspherical-modal-title" size="md">
        {/* ── Conic constant + Type (2-col grid) ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="conic-constant" className={label}>
              Conic constant
            </label>
            <Input
              id="conic-constant"
              aria-label="Conic constant"
              type="text"
              value={conicConstantStr}
              onChange={(e) => setConicConstantStr(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="aspherical-type" className={label}>
              Type
            </label>
            <select
              id="aspherical-type"
              aria-label="Type"
              className={select}
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
            <p className={`mb-2 ${label}`}>
              Even Aspherical Coefficients
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COEFFICIENT_LABELS.map((lbl, i) => (
                <div key={lbl}>
                  <label htmlFor={`coeff-${lbl}`} className={label}>
                    {lbl}
                  </label>
                  <Input
                    id={`coeff-${lbl}`}
                    aria-label={lbl}
                    type="text"
                    value={coefficientStrs[i]}
                    onChange={(e) => updateCoefficient(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className={`flex items-center gap-3 pt-4 ${divider}`}>
          <Button variant="danger" onClick={onRemove}>Remove Aspherical</Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
        </div>
    </Modal>
  );
}
