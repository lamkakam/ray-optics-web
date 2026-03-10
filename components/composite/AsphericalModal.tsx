"use client";

import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";

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

  const backdrop = clsx(cx.modal.color.backdropBgColor, cx.modal.style.backdropPosition, cx.modal.style.backdropBlur);
  const panel = clsx(cx.modal.style.panelPosition, cx.modal.style.panelZIndex, cx.modal.size.panelWidth, cx.modal.style.panelBorderRadius, cx.modal.style.panelBorderStyle, cx.modal.color.panelBorderColor, cx.modal.color.panelBgColor, cx.modal.size.panelPadding, cx.modal.style.panelShadow, cx.modal.style.panelAnimation);
  const title = clsx(cx.modal.style.titleBorderStyle, cx.modal.style.titleFontWeight, cx.modal.size.titleFontSize, cx.modal.size.titleMargin, cx.modal.size.titlePadding, cx.modal.color.titleBorderColor, cx.modal.color.titleTextColor);
  const label = clsx(cx.label.style.base, cx.label.color.textColor, cx.label.size.default);
  const input = clsx(cx.input.style.borderRadius, cx.input.style.borderStyle, cx.input.style.outlineStyle, cx.input.style.transitionStyle, cx.input.size.defaultWidth, cx.input.size.focusRingWidth, cx.input.color.focusRingColor, cx.input.color.borderColor, cx.input.color.bgColor, cx.input.color.textColor, cx.input.size.horizontalPadding, cx.input.size.verticalPadding, cx.input.size.fontSize);
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

  if (!isOpen) return undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-testid="modal-backdrop"
        className={backdrop}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aspherical-modal-title"
        className={`${panel} max-w-md`}
      >
        {/* ── Title ── */}
        <h2 id="aspherical-modal-title" className={title}>
          Aspherical Parameters
        </h2>

        {/* ── Conic constant + Type (2-col grid) ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="conic-constant" className={label}>
              Conic constant
            </label>
            <input
              id="conic-constant"
              aria-label="Conic constant"
              type="text"
              className={input}
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
                  <input
                    id={`coeff-${lbl}`}
                    aria-label={lbl}
                    type="text"
                    className={input}
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
      </div>
    </div>
  );
}
