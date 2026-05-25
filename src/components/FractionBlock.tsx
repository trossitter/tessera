import { pieceWidth, PIECE_HEIGHT, type Denominator } from "../workspace-state";

const COLOR_BY_DENOM: Record<Denominator, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

const LABEL_COLOR: Record<Denominator, string> = {
  1: "rgba(255,255,255,0.85)",
  2: "rgba(255,255,255,0.85)",
  4: "rgba(26,46,42,0.65)",
  8: "rgba(26,46,42,0.65)",
};

const LABEL: Record<Denominator, string> = {
  1: "1", 2: "½", 4: "¼", 8: "⅛",
};

const PIECE_SHADOW =
  "inset 1px 0 0 0 rgba(0,0,0,0.18), inset -1px 0 0 0 rgba(0,0,0,0.18), 0 1px 2px 0 rgba(0,0,0,0.05)";

type Props = {
  denominator: Denominator;
  scale?: number;
  showLabel?: boolean;
  coverSide?: "left" | "right";
  coverPx?: number;
  remainingLabel?: string;
};

export function FractionBlock({ denominator, scale = 1, showLabel = false, coverSide, coverPx = 0, remainingLabel }: Props) {
  const h = PIECE_HEIGHT * scale;
  const labelLeft  = coverSide === "left"  ? coverPx * scale : 0;
  const labelRight = coverSide === "right" ? coverPx * scale : 0;
  return (
    <div
      className={`${COLOR_BY_DENOM[denominator]} rounded-md`}
      style={{
        width: pieceWidth(denominator) * scale,
        height: h,
        boxShadow: PIECE_SHADOW,
        position: "relative",
      }}
      aria-label={denominator === 1 ? "one whole" : `one ${denominator}th`}
    >
      {showLabel && (
        <span
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: labelLeft,
            right: labelRight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(9, h * 0.38),
            fontWeight: 700,
            color: LABEL_COLOR[denominator],
            letterSpacing: "0.01em",
            userSelect: "none",
            pointerEvents: "none",
            transition: "left 0.35s cubic-bezier(0.34,1.56,0.64,1), right 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {remainingLabel ?? LABEL[denominator]}
        </span>
      )}
    </div>
  );
}
