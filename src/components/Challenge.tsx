
type Props = {
  label: string;
  required: number;
  foundCount: number;
  allDone: boolean;
};

export function Challenge({
  label,
  required,
  foundCount,
  allDone,
}: Props) {

  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-3">
      <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
        challenge
      </header>

      {allDone ? (
        <div className="text-base text-ink/60 italic pt-1">
          look at what you made.
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
        </>
      )}
    </section>
  );
}
