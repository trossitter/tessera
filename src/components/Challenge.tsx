import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  required: number;
  foundCount: number;
  complete: boolean;
  allDone: boolean;
  onNext: () => void;
};

export function Challenge({
  label,
  required,
  foundCount,
  complete,
  allDone,
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

          {required > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/60">
                {foundCount} of {required} found
              </span>
            </div>
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
