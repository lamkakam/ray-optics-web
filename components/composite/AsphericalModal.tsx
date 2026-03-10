"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";
import { Input } from "@/components/micro/Input";
import { Label } from "@/components/micro/Label";
import { Modal } from "@/components/micro/Modal";
import { Select } from "@/components/micro/Select";

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
            <Label htmlFor="conic-constant">
              Conic constant
            </Label>
            <Input
              id="conic-constant"
              aria-label="Conic constant"
              type="text"
              value={conicConstantStr}
              onChange={(e) => setConicConstantStr(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="aspherical-type">
              Type
            </Label>
            <Select
              id="aspherical-type"
              aria-label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as AsphericalType)}
              options={[
                { value: "Conical", label: "Conical" },
                { value: "EvenAspherical", label: "Even Aspherical" },
              ]}
            />
          </div>
        </div>

        {/* ── Polynomial coefficients (2-col grid) ── */}
        {type === "EvenAspherical" && (
          <div className="mb-4">
            <p className={clsx("mb-2", cx.label.style.baseFontWeight, cx.label.color.textColor, cx.label.size.default)}>
              Even Aspherical Coefficients
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COEFFICIENT_LABELS.map((lbl, i) => (
                <div key={lbl}>
                  <Label htmlFor={`coeff-${lbl}`}>
                    {lbl}
                  </Label>
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
