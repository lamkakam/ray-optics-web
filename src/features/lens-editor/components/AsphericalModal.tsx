"use client";

import React, { useState } from "react";
import { MathJax } from "better-react-mathjax";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { AsphericalType } from "@/shared/lib/types/opticalModel";

const COEFFICIENT_NUM = 10;


interface AsphericalModalProps {
  readonly isOpen: boolean;
  readonly initialConicConstant: number;
  readonly initialType: AsphericalType;
  readonly initialCoefficients: number[];
  readonly initialToricSweepRadiusOfCurvature: number;
  readonly onConfirm: (params: {
    conicConstant: number;
    type: AsphericalType;
    polynomialCoefficients: number[];
    toricSweepRadiusOfCurvature: number;
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

function supportsPolynomialCoefficients(type: AsphericalType): boolean {
  return type !== "Conic";
}

function isToroidType(type: AsphericalType): boolean {
  return type === "XToroid" || type === "YToroid";
}

const contentMap: {
  [key in AsphericalType]: {
    description: React.ReactNode,
    coeffLabels: { key: string, label: React.ReactNode }[],
  }
} = {
  Conic: {
    description: undefined,
    coeffLabels: [],
  },

  EvenAspherical: {
    description: (
      <>
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
      </>
    ),
    coeffLabels: new Array(COEFFICIENT_NUM).fill(0).map((_, idx) => {
      const coefficientIndex = 2 * (idx + 1);
      return {
        key: `a${coefficientIndex}`,
        label: (
          <Paragraph>
            <MathJax inline>{`\\(a_{${coefficientIndex}}\\)`}</MathJax>
          </Paragraph>
        )
      };
    }),
  },

  RadialPolynomial: {
    description: (
      <>
        <Paragraph>
          <MathJax>
            {"\\(z(r) = \\frac{cr^{2}}{1 + \\sqrt{1 - (\\textbf{cc} + 1)c^{2}r^{2}}} + \\sum_{i=1}^{10}a_{i}r^{i}\\)"}
          </MathJax>
        </Paragraph>
        <Paragraph>
          {"where "}
          <MathJax inline>{"\\(\\textbf{cc}\\)"}</MathJax>
          {" is the conic constant, "}
          <MathJax inline>{"\\(c\\)"}</MathJax>
          {" is the curvature and "}
          <MathJax inline>{"\\({a}_{1}, {a}_{2}, ..., {a}_{10}\\)"}</MathJax>
          {" are the aspherical coefficients."}
        </Paragraph>
      </>
    ),
    coeffLabels: new Array(COEFFICIENT_NUM).fill(0).map((_, idx) => {
      const coefficientIndex = idx + 1;
      return {
        key: `radial-a${coefficientIndex}`,
        label: (
          <Paragraph>
            <MathJax inline>{`\\(a_{${coefficientIndex}}\\)`}</MathJax>
          </Paragraph>
        )
      };
    }),
  },

  XToroid: {
    description: (
      <>
        <Paragraph>
          <MathJax>
            {"\\(z = f(x) - \\frac{1}{2}\\textbf{cR}[y^{2}+z^{2}-f^{2}(x)]\\)"}
          </MathJax>
        </Paragraph>
        <Paragraph>
          {"where "}
          <MathJax inline>
            {"\\(f(x) = \\frac{cx^{2}}{1 + \\sqrt{1 - (\\textbf{cc} + 1)c^{2}x^{2}}} + \\sum_{i=1}^{10}a_{2i}x^{2i}\\)"}
          </MathJax>
        </Paragraph>
        <Paragraph>
          <MathJax inline>{"\\(\\textbf{cR}\\)"}</MathJax>
          {" is the toric sweep radius of curvature, "}
          <MathJax inline>{"\\(\\textbf{cc}\\)"}</MathJax>
          {" is the conic constant, "}
          <MathJax inline>{"\\(c\\)"}</MathJax>
          {" is the curvature and "}
          <MathJax inline>{"\\({a}_{2}, {a}_{4}, ..., {a}_{20}\\)"}</MathJax>
          {" are the aspherical coefficients."}
        </Paragraph>
      </>
    ),
    coeffLabels: new Array(COEFFICIENT_NUM).fill(0).map((_, idx) => {
      const coefficientIndex = 2 * (idx + 1);
      return {
        key: `x-toroid-a${coefficientIndex}`,
        label: (
          <Paragraph>
            <MathJax inline>{`\\(a_{${coefficientIndex}}\\)`}</MathJax>
          </Paragraph>
        )
      };
    }),
  },

  YToroid: {
    description: (
      <>
        <Paragraph>
          <MathJax>
            {"\\(z = f(y) - \\frac{1}{2}\\textbf{cR}[x^{2}+z^{2}-f^{2}(y)]\\)"}
          </MathJax>
        </Paragraph>
        <Paragraph>
          {"where "}
          <MathJax inline>
            {"\\(f(y) = \\frac{cy^{2}}{1 + \\sqrt{1 - (\\textbf{cc} + 1)c^{2}y^{2}}} + \\sum_{i=1}^{10}a_{2i}y^{2i}\\)"}
          </MathJax>
        </Paragraph>
        <Paragraph>
          <MathJax inline>{"\\(\\textbf{cR}\\)"}</MathJax>
          {" is the toric sweep radius of curvature, "}
          <MathJax inline>{"\\(\\textbf{cc}\\)"}</MathJax>
          {" is the conic constant, "}
          <MathJax inline>{"\\(c\\)"}</MathJax>
          {" is the curvature and "}
          <MathJax inline>{"\\({a}_{2}, {a}_{4}, ..., {a}_{20}\\)"}</MathJax>
          {" are the aspherical coefficients."}
        </Paragraph>
      </>
    ),
    coeffLabels: new Array(COEFFICIENT_NUM).fill(0).map((_, idx) => {
      const coefficientIndex = 2 * (idx + 1);
      return {
        key: `y-toroid-a${coefficientIndex}`,
        label: (
          <Paragraph>
            <MathJax inline>{`\\(a_{${coefficientIndex}}\\)`}</MathJax>
          </Paragraph>
        )
      };
    }),
  },
};


export function AsphericalModal({
  isOpen,
  initialConicConstant,
  initialType,
  initialCoefficients,
  initialToricSweepRadiusOfCurvature,
  onConfirm,
  onClose,
  onRemove,
}: AsphericalModalProps) {
  const [conicConstantStr, setConicConstantStr] = useState(String(initialConicConstant));
  const [type, setType] = useState<AsphericalType>(initialType);
  const [toricSweepRadiusOfCurvatureStr, setToricSweepRadiusOfCurvatureStr] = useState(
    String(initialToricSweepRadiusOfCurvature)
  );
  const [coefficientStrs, setCoefficientStrs] = useState<string[]>(() =>
    padCoefficients(initialCoefficients)
  );

  const asphericalCoefficientExplain = (
    <div className="mt-2 mb-2">
      {contentMap[type].description}
    </div>
  );

  const handleConfirm = () => {
    const conicConstant = parseNumericString(conicConstantStr, initialConicConstant);
    const toricSweepRadiusOfCurvature = isToroidType(type)
      ? parseNumericString(toricSweepRadiusOfCurvatureStr, 0)
      : 0;
    const coefficients = coefficientStrs.map((s, i) =>
      parseNumericString(s, initialCoefficients[i] ?? 0)
    );
    const polynomialCoefficients = supportsPolynomialCoefficients(type)
      ? truncateTrailingZeros(coefficients)
      : [];
    onConfirm({ conicConstant, type, polynomialCoefficients, toricSweepRadiusOfCurvature });
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

            {isToroidType(type) && (
              <div className="mt-4">
                <Label htmlFor="toroid-sweep-radius-of-curvature">
                  Toroid sweep radius of curvature
                </Label>
                <Input
                  id="toroid-sweep-radius-of-curvature"
                  aria-label="Toroid sweep radius of curvature"
                  type="text"
                  value={toricSweepRadiusOfCurvatureStr}
                  onChange={(e) => setToricSweepRadiusOfCurvatureStr(e.target.value)}
                />
              </div>
            )}
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
                { value: "Conic", label: "Conic" },
                { value: "EvenAspherical", label: "Even Aspherical" },
                { value: "RadialPolynomial", label: "Radial Polynomial" },
                { value: "XToroid", label: "X Toroid" },
                { value: "YToroid", label: "Y Toroid" },
              ]}
            />
          </div>
        </div>

        {/* ── Polynomial coefficients (2-col grid) ── */}
        {supportsPolynomialCoefficients(type) && (
          <div className="mb-4">
            <Paragraph variant="subheading" className="mb-2">
              Even Aspherical Coefficients
            </Paragraph>
            {asphericalCoefficientExplain}
            <div className="grid grid-cols-2 gap-3">
              {contentMap[type].coeffLabels.map(({ key, label }, i) => (
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
