const SCALE_W = 220;
const SCALE_H = 28;

type Props = {
  label: string;
  target: { num: number; denom: number };
  required: number;
  foundCount: number;
  allDone: boolean;
};

export function Challenge({ label, target, required, foundCount, allDone }: Props) {
  const targetWidth = SCALE_W * (target.num / target.denom);

  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-5 flex flex-col gap-4">
      <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
        challenge
      </header>

      {allDone ? (
        <div className="text-sm text-ink/60 italic pt-1">
          look at what you made.
        </div>
      ) : (
        <>
          {/* Visual target — the shape the child is trying to fill */}
          <div style={{ width: SCALE_W, height: SCALE_H, position: "relative", borderRadius: 5, border: "1.5px solid rgba(26,46,42,0.18)" }}>
            <div style={{
              width: targetWidth,
              height: "100%",
              background: "rgba(26,46,42,0.10)",
              borderRadius: 3,
            }} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50 italic tracking-wide">
              {required === 1 ? "show me this." : `show me this ${required} ways.`}
            </span>
            {required > 1 && (
              <span className="text-xs text-ink/50">
                {foundCount} of {required}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
