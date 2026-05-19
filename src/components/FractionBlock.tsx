import { pieceWidth, PIECE_HEIGHT, type Denominator } from "../workspace-state";

const COLOR_BY_DENOM: Record<Denominator, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

// Inset hairlines on left + right edges signal piece boundaries without
// taking horizontal pixels (two halves still total exactly one whole).
// The outer drop shadow is the same subtlety as Tailwind's shadow-sm.
const PIECE_SHADOW =
  "inset 1px 0 0 0 rgba(0,0,0,0.18), inset -1px 0 0 0 rgba(0,0,0,0.18), 0 1px 2px 0 rgba(0,0,0,0.05)";

type Props = {
  denominator: Denominator;
};

export function FractionBlock({ denominator }: Props) {
  return (
    <div
      className={`${COLOR_BY_DENOM[denominator]} rounded-md`}
      style={{
        width: pieceWidth(denominator),
        height: PIECE_HEIGHT,
        boxShadow: PIECE_SHADOW,
      }}
      aria-label={denominator === 1 ? "one whole" : `one ${denominator}th`}
    />
  );
}
