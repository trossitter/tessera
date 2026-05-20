import type { Discovery } from "../workspace-state";

const SCALE_UNIT_WIDTH = 220;
const SCALE_BLOCK_HEIGHT = 22;

const COLOR_BY_DENOM: Record<number, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

function fmtFraction(f: { num: number; denom: number }): string {
  if (f.denom === 1) return String(f.num);
  return `${f.num}/${f.denom}`;
}

function configLabel(config: number[]): string {
  return config.map(d => d === 1 ? "1" : `1/${d}`).join(" + ");
}

function ConfigBar({ config }: { config: number[] }) {
  return (
    <div className="flex">
      {config.map((denom, i) => (
        <div
          key={i}
          className={`${COLOR_BY_DENOM[denom] ?? "bg-taupe"} rounded-sm`}
          style={{
            width: SCALE_UNIT_WIDTH / denom,
            height: SCALE_BLOCK_HEIGHT,
            boxShadow:
              "inset 1px 0 0 0 rgba(0,0,0,0.18), inset -1px 0 0 0 rgba(0,0,0,0.18)",
          }}
        />
      ))}
    </div>
  );
}

function DiscoveryRow({
  discovery,
  onReplay,
}: {
  discovery: Discovery;
  onReplay: (d: Discovery) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onReplay(discovery)}
      className="flex flex-col gap-1 text-left w-full rounded-md px-2 py-1.5 -mx-2 hover:bg-parchment active:bg-parchment transition-colors"
      aria-label="tap to show this in the workspace"
    >
      <ConfigBar config={discovery.configA} />
      <span className="text-ink/40 text-xs leading-none pl-2">=</span>
      <ConfigBar config={discovery.configB} />
      <div className="text-xs text-ink/70 font-medium pt-0.5">
        {configLabel(discovery.configA)} = {configLabel(discovery.configB)}
      </div>
    </button>
  );
}

type Props = {
  discoveries: Discovery[];
  onReplay: (d: Discovery) => void;
};

function configReducedValue(config: number[]): { num: number; denom: number } {
  const commonDenom = config.reduce((acc, d) => lcm(acc, d), 1);
  const totalNum = config.reduce((acc, d) => acc + commonDenom / d, 0);
  const divisor = gcd(totalNum, commonDenom);
  return { num: totalNum / divisor, denom: commonDenom / divisor };
}

function configFloat(config: number[]): number {
  return config.reduce((sum, d) => sum + 1 / d, 0);
}

export function Discoveries({ discoveries, onReplay }: Props) {
  if (discoveries.length === 0) {
    return (
      <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4">
        <div className="text-sm text-ink/40 italic">
          try making the same amount two different ways
        </div>
      </section>
    );
  }

  const sorted = [...discoveries].sort((a, b) => {
    const vDiff = configFloat(a.configA) - configFloat(b.configA);
    if (Math.abs(vDiff) > 1e-9) return vDiff;
    return (a.configA.length + a.configB.length) - (b.configA.length + b.configB.length);
  });

  type Group = { label: string; items: Discovery[] };
  const groups: Group[] = [];
  for (const d of sorted) {
    const v = configReducedValue(d.configA);
    const label = fmtFraction(v);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(d);
    else groups.push({ label, items: [d] });
  }

  return (
    <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
      {groups.map((group) => (
        <section
          key={group.label}
          className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-2"
        >
          <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
            making {group.label}
          </header>
          <div className="flex flex-col gap-2 pt-1">
            {group.items.map((discovery) => (
              <DiscoveryRow
                key={discovery.id}
                discovery={discovery}
                onReplay={onReplay}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
