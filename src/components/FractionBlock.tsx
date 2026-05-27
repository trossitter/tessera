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

type CoverRegion = { left: number; right: number; label: string };

type Props = {
  denominator: Denominator;
  scale?: number;
  showLabel?: boolean;
  coverage?: { primary: CoverRegion; secondary: CoverRegion | null; tertiary?: CoverRegion | null } | null;
};

const LABEL_STYLE_BASE = {
  position: "absolute" as const,
  top: 0, bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  letterSpacing: "0.01em",
  userSelect: "none" as const,
  pointerEvents: "none" as const,
  transition: "left 0.35s cubic-bezier(0.34,1.56,0.64,1), right 0.35s cubic-bezier(0.34,1.56,0.64,1)",
};

export function FractionBlock({ denominator, scale = 1, showLabel = false, coverage }: Props) {
  const h = PIECE_HEIGHT * scale;
  const fontSize = Math.max(9, h * 0.38);
  const color = LABEL_COLOR[denominator];

  const primary = coverage?.primary;
  const secondary = coverage?.secondary;
  const tertiary = coverage?.tertiary;

  // Single uncovered region: clip the piece so only the exposed area renders.
  const coverClip =
    primary && !secondary && (primary.left > 0 || primary.right > 0)
      ? `inset(0 ${primary.right * scale}px 0 ${primary.left * scale}px round 6px)`
      : undefined;

  return (
    <div
      className={`${COLOR_BY_DENOM[denominator]} rounded-md`}
      style={{ width: pieceWidth(denominator) * scale, height: h, boxShadow: PIECE_SHADOW, position: "relative", clipPath: coverClip }}
      aria-label={denominator === 1 ? "one whole" : `one ${denominator}th`}
    >
      {showLabel && (
        <>
          <span style={{
            ...LABEL_STYLE_BASE,
            left: (primary?.left ?? 0) * scale,
            right: (primary?.right ?? 0) * scale,
            fontSize, color,
          }}>
            {primary?.label ?? LABEL[denominator]}
          </span>
          {secondary && (
            <span
              key={`${secondary.left}-${secondary.right}`}
              className="label-second"
              style={{
                ...LABEL_STYLE_BASE,
                left: secondary.left * scale,
                right: secondary.right * scale,
                fontSize, color,
              }}
            >
              {secondary.label}
            </span>
          )}
          {tertiary && (
            <span
              key={`${tertiary.left}-${tertiary.right}`}
              className="label-second"
              style={{
                ...LABEL_STYLE_BASE,
                left: tertiary.left * scale,
                right: tertiary.right * scale,
                fontSize, color,
              }}
            >
              {tertiary.label}
            </span>
          )}
        </>
      )}
    </div>
  );
}
