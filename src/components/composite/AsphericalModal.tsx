"use client";

import React, { useState, useMemo } from "react";
import { MathJax } from "better-react-mathjax";
import { Button } from "@/components/micro/Button";
import { Input } from "@/components/micro/Input";
import { Label } from "@/components/micro/Label";
import { Modal } from "@/components/micro/Modal";
import { Select } from "@/components/micro/Select";
import { Paragraph } from "@/components/micro/Paragraph";

export type AsphericalType = "Conical" | "EvenAspherical";

const COEFFICIENT_NUM = 10;
const labels = new Array(COEFFICIENT_NUM).fill(0).map((_, idx) => {
  const coefficientIndex = 2 * (idx + 1);
  return {
    key: `a${coefficientIndex}`,
    label: (
      <Paragraph>
        <MathJax inline>{`\\(a_{${coefficientIndex}}\\)`}</MathJax>
      </Paragraph>
    )
  };
});


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

  const asphericalCoefficientExplain = useMemo(() => (
    <div className="mt-2 mb-2">
      <Paragraph>
        <MathJax>
          {"\\(z(r) = \\frac{cr^{2}}{1 + \\sqrt{1 - (\\textbf{cc} + 1)c^{2}r^{2}}} + \\sum_{i=1}^{10}a_{2i}r^{2i}\\)"}
        </MathJax>
      </Paragraph>
      <Paragraph>
        {"where "}
        <MathJax inline>{"\\(\\textbf{cc}\\)"}</MathJax>
        {" is the conic constant, "}
        <MathJax inline>{"\\(c\\)"}</MathJax>
        {" is the curvature and "}
        <MathJax inline>{"\\({a}_{2}, {a}_{4}, ..., {a}_{20}\\)"}</MathJax>
        {" are the aspherical coefficients."}
      </Paragraph>
    </div>
  ), []);

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
            <Paragraph variant="subheading" className="mb-2">
              Even Aspherical Coefficients
            </Paragraph>
            {asphericalCoefficientExplain}
            <div className="grid grid-cols-2 gap-3">
              {labels.map(({ key, label }, i) => (
                <div key={key}>
                  <Label htmlFor={`coeff-${key}`}>
                    {label}
                  </Label>
                  <Input
                    id={`coeff-${key}`}
                    aria-label={key}
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
        <div className="flex items-center gap-3 pt-4">
          <Button variant="danger" onClick={onRemove}>Remove Aspherical</Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
        </div>
      </Modal>
  );
}
