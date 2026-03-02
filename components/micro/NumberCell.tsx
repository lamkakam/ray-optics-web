"use client";

import React, { useRef, useEffect } from "react";

const VALID_NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

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
    const raw = inputRef.current?.value?.trim() ?? "";
    if (raw === "" || !VALID_NUMBER.test(raw)) {
      if (inputRef.current) {
        inputRef.current.value = String(value);
      }
      return;
    }
    const num = parseFloat(raw);
    if (Number.isFinite(num)) {
      onValueChange(num);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      onBlur={handleBlur}
    />
  );
}
