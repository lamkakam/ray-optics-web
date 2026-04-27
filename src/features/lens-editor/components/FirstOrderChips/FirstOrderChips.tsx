import { Chip } from "@/shared/components/primitives/Chip";

interface FirstOrderChipsProps {
  readonly data?: Record<string, number>;
}

const valueFormatter = (v: number): string => v.toFixed(2);
const naFormatter = (v: number): string => v.toPrecision(4);

const CHIP_CONFIG: { key: string; format: (v: number) => string }[] = [
  { key: "efl", format: (v) => `EFL: ${valueFormatter(v)}mm` },
  { key: "bfl", format: (v) => `BFL: ${valueFormatter(v)}mm` },
  { key: "img_ht", format: (v) => `IMG HT: ${valueFormatter(v)}mm` },
  { key: "fno", format: (v) => `f/#: ${naFormatter(v)}` },
  { key: "obj_na", format: (v) => `NA OBJ: ${naFormatter(v)}` },
  { key: "img_na", format: (v) => `NA IMG: ${naFormatter(v)}` },
];

export function FirstOrderChips({ data }: FirstOrderChipsProps) {
  if (!data) return null;

  const chips = CHIP_CONFIG.filter(({ key }) => key in data).map(
    ({ key, format }) => <Chip key={key}>{format(data[key])}</Chip>
  );

  return <>{chips}</>;
}
