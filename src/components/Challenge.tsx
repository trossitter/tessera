import type { Discovery } from "../workspace-state";

type Target = { num: number; denom: number };

type ChallengeSpec = {
  id: string;
  target: Target;
};

// Staggered: each challenge unlocks when the previous is complete.
const CHALLENGES: ChallengeSpec[] = [
  { id: "half", target: { num: 1, denom: 2 } },
  { id: "quarter", target: { num: 1, denom: 4 } },
  { id: "three-quarter", target: { num: 3, denom: 4 } },
  { id: "whole", target: { num: 1, denom: 1 } },
];

const DENOMS = [1, 2, 4, 8];

// Uniform-denominator configs that sum exactly to the target.
function configsForTarget(target: Target): number[][] {
  const configs: number[][] = [];
  for (const d of DENOMS) {
    // n pieces of denominator d → n/d = target.num/target.denom
    // n = target.num * d / target.denom
    const n = (target.num * d) / target.denom;
    if (Number.isInteger(n) && n >= 1) {
      configs.push(Array.from({ length: n }, () => d));
    }
  }
  return configs;
}

function targetLabel(target: Target): string {
  return target.num === target.denom ? "1" : `${target.num}/${target.denom}`;
}

function configKey(c: number[]): string {
  return c.join(",");
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

  // Walk the staggered list. Show each challenge in turn; stop after
  // the first incomplete one so the next is not revealed yet.
  const visible: { spec: ChallengeSpec; foundCount: number; total: number }[] =
    [];
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
