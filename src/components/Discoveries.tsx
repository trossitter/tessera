import type { Discovery } from "../workspace-state";

const SCALE_UNIT_WIDTH = 220;
const SCALE_BLOCK_HEIGHT = 22;

const COLOR_BY_DENOM: Record<number, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

function configFraction(config: number[]): { num: number; denom: number } {
  if (config.length === 0) return { num: 0, denom: 1 };
  return { num: config.length, denom: config[0] };
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

function DiscoveryRow({ discovery }: { discovery: Discovery }) {
  const a = configFraction(discovery.configA);
  const b = configFraction(discovery.configB);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <ConfigBar config={discovery.configA} />
        <span className="text-ink/60 text-sm">=</span>
        <ConfigBar config={discovery.configB} />
      </div>
      <div className="text-xs text-ink/75 font-medium">
        {a.num}/{a.denom} = {b.num}/{b.denom}
      </div>
    </div>
  );
}

type Props = {
  discoveries: Discovery[];
};

export function Discoveries({ discoveries }: Props) {
  const newestFirst = [...discoveries].reverse();
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col min-h-0 overflow-y-auto">
      <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
        equivalents found
      </header>
      <div className="flex-1 flex flex-col gap-4 pt-3">
        {newestFirst.length === 0 ? (
          <div className="text-sm text-ink/40 italic">
            arrange pieces in matching rows to find an equivalent
          </div>
        ) : (
          newestFirst.map((discovery) => (
            <DiscoveryRow key={discovery.id} discovery={discovery} />
          ))
        )}
      </div>
    </section>
  );
}
