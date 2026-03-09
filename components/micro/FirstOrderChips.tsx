import React from "react";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface FirstOrderChipsProps {
  readonly data?: Record<string, number>;
}

const valueFormatter = (v: number): string => v.toFixed(2);

const CHIP_CONFIG: { key: string; format: (v: number) => string }[] = [
  { key: "efl", format: (v) => `EFL: ${valueFormatter(v)}mm` },
  { key: "bfl", format: (v) => `BFL: ${valueFormatter(v)}mm` },
  { key: "img_ht", format: (v) => `IMG HT: ${valueFormatter(v)}mm` },
  { key: "enp_dist", format: (v) => `ENP: ${valueFormatter(v)}mm` },
  { key: "exp_dist", format: (v) => `EXP: ${valueFormatter(v)}mm` },
];

export function FirstOrderChips({ data }: FirstOrderChipsProps) {
  if (!data) return null;

  const chips = CHIP_CONFIG.filter(({ key }) => key in data).map(
    ({ key, format }) => (
      <span
        key={key}
        className={`${cx.chip.style.base} ${cx.chip.color.default} ${cx.chip.size.default}`}
      >
        {format(data[key])}
      </span>
    )
  );

  return <>{chips}</>;
}
