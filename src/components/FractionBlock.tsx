type Props = {
  numerator: number;
  denominator: number;
  widthPct: number;
};

const PALETTE: Record<number, string> = {
  1: "bg-rose-300",
  2: "bg-amber-300",
  4: "bg-emerald-300",
  8: "bg-sky-300",
};

export function FractionBlock({ numerator, denominator, widthPct }: Props) {
  const color = PALETTE[denominator] ?? "bg-slate-300";
  return (
    <div
      className={`${color} h-14 rounded-lg flex items-center justify-center text-amber-900 font-semibold shadow-sm`}
      style={{ width: `calc(${widthPct}% - 4px)` }}
    >
      {numerator}/{denominator}
    </div>
  );
}
