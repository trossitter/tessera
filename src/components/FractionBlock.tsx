import { pieceWidth, PIECE_HEIGHT, type Denominator } from "../workspace-state";

const COLOR_BY_DENOM: Record<Denominator, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

// Hairlines scale inversely with denominator: larger pieces get thicker
// edge lines so their boundaries read with similar prominence to the
// smaller ones, which previously had visibly more shading per pixel.
const HAIRLINE_PX_BY_DENOM: Record<number, number> = {
  1: 3,
  2: 2,
  4: 2,
  8: 1,
};

function pieceShadow(denominator: number): string {
  const px = HAIRLINE_PX_BY_DENOM[denominator] ?? 1;
  return [
    `inset ${px}px 0 0 0 rgba(0,0,0,0.22)`,
    `inset -${px}px 0 0 0 rgba(0,0,0,0.22)`,
    "0 1px 2px 0 rgba(0,0,0,0.05)",
  ].join(", ");
}

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
        boxShadow: pieceShadow(denominator),
      }}
      aria-label={denominator === 1 ? "one whole" : `one ${denominator}th`}
    />
  );
}
