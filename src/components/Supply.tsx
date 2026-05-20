import { FractionBlock } from "./FractionBlock";
import { SUPPLY_DENOMS, type Denominator } from "../workspace-state";

type Props = {
  onSpawn: (denominator: Denominator) => void;
};

const SUPPLY_SCALE = 0.5;

export function Supply({ onSpawn }: Props) {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-3">
      {SUPPLY_DENOMS.map((d) => (
        <div key={d} className="flex gap-1 justify-center">
          {Array.from({ length: d }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSpawn(d)}
              className="appearance-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 rounded-md"
              aria-label={`add one ${d === 1 ? "whole" : `${d}th`}`}
            >
              <FractionBlock denominator={d} scale={SUPPLY_SCALE} />
            </button>
          ))}
        </div>
      ))}
    </section>
  );
}
