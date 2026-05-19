import { FractionBlock } from "./FractionBlock";

const ROW_DENOMS = [1, 2, 4, 8] as const;

export function FractionBox() {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4 flex flex-col min-h-0">
      <h2 className="text-sm font-medium text-amber-800 mb-2">Fraction Box</h2>
      <div className="flex-1 flex flex-col justify-center gap-3">
        {ROW_DENOMS.map((d) => (
          <div key={d} className="flex gap-1">
            {Array.from({ length: d }, (_, i) => (
              <FractionBlock key={i} numerator={1} denominator={d} widthPct={100 / d} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
