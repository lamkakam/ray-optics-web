"use client";

import React, { useRef, useEffect } from "react";

interface NumberCellProps {
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly autoFocus?: boolean;
}

export function NumberCell({ value, onValueChange, autoFocus }: NumberCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleBlur = () => {
    const raw = inputRef.current?.value ?? "";
    if (raw === "") return;
    const num = parseFloat(raw);
    if (Number.isFinite(num)) {
      onValueChange(num);
    }
  };

  return (
    <input
      ref={inputRef}
      type="number"
      defaultValue={value}
      onBlur={handleBlur}
      step="any"
    />
  );
}
