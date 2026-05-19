import type { Discovery } from "../workspace-state";

type Target = { num: number; denom: number };

type ChallengeSpec = {
  id: string;
  target: Target;
};

const CHALLENGES: ChallengeSpec[] = [
  { id: "half", target: { num: 1, denom: 2 } },
  { id: "quarter", target: { num: 1, denom: 4 } },
  { id: "three-quarter", target: { num: 3, denom: 4 } },
  { id: "whole", target: { num: 1, denom: 1 } },
];

// Enumerate all multisets of pieces (denominations 1, 2, 4, 8) that sum
// exactly to the target. Each multiset is returned in ascending denomination
// order so it matches the canonical configKey form.
//
// Work in eighth-units (lcm of the denominators is 8) to keep integer math.
function configsForTarget(target: Target): number[][] {
  const targetUnits = (target.num * 8) / target.denom;
  if (!Number.isInteger(targetUnits)) return [];
  const results: number[][] = [];
  // a = count of [1]s (8 units each)
  // b = count of [2]s (4 units each)
  // c = count of [4]s (2 units each)
  // d = count of [8]s (1 unit each)
  for (let a = 0; a * 8 <= targetUnits; a++) {
    for (let b = 0; a * 8 + b * 4 <= targetUnits; b++) {
      for (let c = 0; a * 8 + b * 4 + c * 2 <= targetUnits; c++) {
        const d = targetUnits - a * 8 - b * 4 - c * 2;
        if (d < 0) continue;
        if (a + b + c + d === 0) continue;
        const config: number[] = [];
        for (let i = 0; i < a; i++) config.push(1);
        for (let i = 0; i < b; i++) config.push(2);
        for (let i = 0; i < c; i++) config.push(4);
        for (let i = 0; i < d; i++) config.push(8);
        results.push(config);
      }
    }
  }
  return results;
}

function targetLabel(target: Target): string {
  return target.num === target.denom ? "1" : `${target.num}/${target.denom}`;
}

function configKey(c: number[]): string {
  return [...c].sort((a, b) => a - b).join(",");
}

function configsTouched(discoveries: Discovery[]): Set<string> {
  const set = new Set<string>();
  for (const d of discoveries) {
    set.add(configKey(d.configA));
    set.add(configKey(d.configB));
  }
  return set;
}

function ChallengeCard({
  label,
  foundCount,
  total,
  complete,
}: {
  label: string;
  foundCount: number;
  total: number;
  complete: boolean;
}) {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-2">
      <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
        challenge
      </header>
      <div className="text-base text-ink pt-1">
        find every way to make <span className="font-semibold">{label}</span>.
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink/60">
          {foundCount} of {total}
        </span>
        {complete && <span className="text-ink/70 italic">— complete</span>}
      </div>
    </section>
  );
}

type Props = {
  discoveries: Discovery[];
};

export function Challenge({ discoveries }: Props) {
  const touched = configsTouched(discoveries);

  const visible: {
    spec: ChallengeSpec;
    foundCount: number;
    total: number;
  }[] = [];
  for (const spec of CHALLENGES) {
    const configs = configsForTarget(spec.target);
    const foundCount = configs.filter((c) => touched.has(configKey(c))).length;
    visible.push({ spec, foundCount, total: configs.length });
    if (foundCount < configs.length) break;
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map(({ spec, foundCount, total }) => (
        <ChallengeCard
          key={spec.id}
          label={targetLabel(spec.target)}
          foundCount={foundCount}
          total={total}
          complete={foundCount >= total}
        />
      ))}
    </div>
  );
}
