import { FractionBlock } from "./FractionBlock";
import { SUPPLY_DENOMS, type Denominator } from "../workspace-state";

type Props = {
  onSpawn: (denominator: Denominator) => void;
};

export function Supply({ onSpawn }: Props) {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-3">
      {SUPPLY_DENOMS.map((d) => (
        <div key={d} className="flex gap-2 justify-center">
          {Array.from({ length: d }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSpawn(d)}
              className="appearance-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 rounded-md"
              aria-label={`add one ${d === 1 ? "whole" : `${d}th`}`}
            >
              <FractionBlock denominator={d} />
            </button>
          ))}
        </div>
      ))}
    </section>
  );
}
