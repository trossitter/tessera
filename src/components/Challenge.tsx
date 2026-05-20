import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  required: number;
  foundCount: number;
  canSubmit: boolean;
  complete: boolean;
  allDone: boolean;
  onSubmit: () => void;
  onNext: () => void;
};

export function Challenge({
  label,
  required,
  foundCount,
  canSubmit,
  complete,
  allDone,
  onSubmit,
  onNext,
}: Props) {
  const [celebrating, setCelebrating] = useState(false);
  const prevComplete = useRef(false);

  useEffect(() => {
    if (complete && !prevComplete.current) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 1200);
      return () => clearTimeout(t);
    }
    prevComplete.current = complete;
  }, [complete]);

  return (
    <section
      className={`bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-3${celebrating ? " challenge-celebrate" : ""}`}
    >
      <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
        challenge
      </header>

      {allDone ? (
        <div className="text-base text-ink/60 italic pt-1">
          all challenges complete.
        </div>
      ) : (
        <>
          <div className="text-base text-ink pt-1">
            find {required === 1 ? "a way" : `${required} ways`} to make{" "}
            <span className="font-semibold">{label}</span>.
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-ink/60">
              {foundCount} of {required} found
            </span>
          </div>

          {canSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              className="self-start text-sm px-4 py-2 rounded-md active:scale-95 transition-all font-medium"
              style={{ background: "#f5f0e0", color: "#8a6010", border: "1.5px solid #b8891e" }}
            >
              submit ✓
            </button>
          )}

          {complete && (
            <div className="flex flex-col gap-3 pt-1">
              <div className="text-sm font-medium text-ink">
                you found them all!
              </div>
              <button
                type="button"
                onClick={onNext}
                className="self-start text-sm px-5 py-2.5 rounded-md bg-ink text-paper hover:bg-ink/80 active:scale-95 transition-all font-medium"
              >
                next challenge →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
