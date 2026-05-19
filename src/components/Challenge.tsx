import type { Discovery } from "../workspace-state";

// The uniform-denominator configurations that sum to 1/2 with our pieces.
const HALF_CONFIGS: number[][] = [
  [2],
  [4, 4],
  [8, 8, 8, 8],
];

function configKey(c: number[]): string {
  return c.join(",");
}

function configsTouchedByDiscoveries(
  discoveries: Discovery[],
): Set<string> {
  const touched = new Set<string>();
  for (const d of discoveries) {
    touched.add(configKey(d.configA));
    touched.add(configKey(d.configB));
  }
  return touched;
}

type Props = {
  discoveries: Discovery[];
};

export function Challenge({ discoveries }: Props) {
  const touched = configsTouchedByDiscoveries(discoveries);
  const foundCount = HALF_CONFIGS.filter((c) => touched.has(configKey(c)))
    .length;
  const total = HALF_CONFIGS.length;
  const complete = foundCount >= total;

  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-2">
      <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
        challenge
      </header>
      <div className="text-base text-ink pt-1">
        find every way to make{" "}
        <span className="font-semibold">1/2</span>.
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink/60">
          {foundCount} of {total}
        </span>
        {complete && (
          <span className="text-ink/70 italic">— complete</span>
        )}
      </div>
    </section>
  );
}
