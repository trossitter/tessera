import { FractionBlock } from "./FractionBlock";

const ROW_DENOMS = [1, 2, 4, 8] as const;

export function FractionBox() {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-6 flex flex-col min-h-0">
      <div className="flex-1 flex flex-col justify-center gap-3">
        {ROW_DENOMS.map((d) => (
          <div key={d} className="flex gap-1">
            {Array.from({ length: d }, (_, i) => (
              <FractionBlock key={i} denominator={d} widthPct={100 / d} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
