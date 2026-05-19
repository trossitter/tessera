type Props = {
  denominator: number;
  widthPct: number;
};

const COLOR_BY_DENOM: Record<number, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

export function FractionBlock({ denominator, widthPct }: Props) {
  const color = COLOR_BY_DENOM[denominator] ?? "bg-taupe";
  return (
    <div
      className={`${color} h-14 rounded-md shadow-sm`}
      style={{ width: `calc(${widthPct}% - 4px)` }}
      aria-label={denominator === 1 ? "one whole" : `one ${denominator}th`}
    />
  );
}
