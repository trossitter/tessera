import { pieceWidth, PIECE_HEIGHT, type Denominator } from "../workspace-state";

const COLOR_BY_DENOM: Record<Denominator, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

type Props = {
  denominator: Denominator;
};

export function FractionBlock({ denominator }: Props) {
  return (
    <div
      className={`${COLOR_BY_DENOM[denominator]} rounded-md shadow-sm`}
      style={{
        width: pieceWidth(denominator),
        height: PIECE_HEIGHT,
      }}
      aria-label={denominator === 1 ? "one whole" : `one ${denominator}th`}
    />
  );
}
