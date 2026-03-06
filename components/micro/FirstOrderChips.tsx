import React from "react";

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
        className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
      >
        {format(data[key])}
      </span>
    )
  );

  return <>{chips}</>;
}
