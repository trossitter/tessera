import { type RefObject } from "react";
import { Piece } from "./Piece";
import { FractionBlock } from "./FractionBlock";
import type { Piece as PieceType, Denominator } from "../workspace-state";
import { WHOLE_WIDTH, pieceWidth } from "../workspace-state";

type Coverage = { side: "left" | "right"; coverPx: number; remainingLabel: string };

const UNICODE_FRACS: Record<string, string> = {
  "1/2": "½", "1/4": "¼", "3/4": "¾", "1/8": "⅛",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function remainingLabel(coveredDenom: number, coveringDenom: number): string {
  const rawNum = coveringDenom - coveredDenom;
  const rawDenom = coveredDenom * coveringDenom;
  const g = gcd(rawNum, rawDenom);
  const num = rawNum / g;
  const denom = rawDenom / g;
  return UNICODE_FRACS[`${num}/${denom}`] ?? `${num}⁄${denom}`;
}

function computeCoverage(pieces: PieceType[]): Map<string, Coverage> {
  // Count how many smaller pieces fully overlap each piece
  const coverCounts = new Map<string, number>();
  const coverBy = new Map<string, PieceType>();
  for (const covered of pieces) {
    for (const covering of pieces) {
      if (covering.id === covered.id) continue;
      if (covering.y !== covered.y) continue;
      const coveredW = pieceWidth(covered.denominator);
      const coveringW = pieceWidth(covering.denominator);
      if (coveringW >= coveredW) continue; // must be strictly smaller
      // covering must be fully inside covered
      if (covering.x < covered.x || covering.x + coveringW > covered.x + coveredW) continue;
      coverCounts.set(covered.id, (coverCounts.get(covered.id) ?? 0) + 1);
      coverBy.set(covered.id, covering);
    }
  }
  const map = new Map<string, Coverage>();
  for (const covered of pieces) {
    if ((coverCounts.get(covered.id) ?? 0) !== 1) continue; // skip 0 or 2+ covers
    const covering = coverBy.get(covered.id)!;
    const coveredW = pieceWidth(covered.denominator);
    const coveringW = pieceWidth(covering.denominator);
    const isLeftEdge  = covering.x === covered.x;
    const isRightEdge = covering.x + coveringW === covered.x + coveredW;
    if (!isLeftEdge && !isRightEdge) continue; // skip middle placement
    map.set(covered.id, {
      side: isLeftEdge ? "left" : "right",
      coverPx: coveringW,
      remainingLabel: remainingLabel(covered.denominator, covering.denominator),
    });
  }
  return map;
}

type Props = {
  pieces: PieceType[];
  glowingIds: Set<string>;
  pulsingIds: Set<string>;
  canUndo: boolean;
  canRedo: boolean;
  encouragement: string | null;
  showLabels: boolean;
  holdActive: boolean;
  seedJiggle: boolean;
  snapPreview: { x: number; y: number; denominator: Denominator } | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleLabels: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

export function Workspace({
  pieces,
  glowingIds,
  pulsingIds,
  canUndo,
  canRedo,
  encouragement,
  showLabels,
  holdActive,
  seedJiggle,
  snapPreview,
  canvasRef,
  onMove,
  onRemove,
  onUndo,
  onRedo,
  onClear,
  onToggleLabels,
  onHoldStart,
  onHoldEnd,
}: Props) {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe overflow-hidden min-h-[400px] flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-taupe">
        <button
          type="button"
          onClick={onClear}
          className="text-sm px-4 py-2.5 rounded-md text-ink/70 hover:text-ink hover:bg-parchment transition-colors active:scale-95"
          aria-label="clear workspace"
        >
          clear
        </button>
        <span className="text-ink/20" aria-hidden>|</span>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="text-xs px-2 py-1.5 rounded text-ink/70 hover:text-ink hover:bg-parchment disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="undo"
        >
          ← undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="text-xs px-2 py-1.5 rounded text-ink/70 hover:text-ink hover:bg-parchment disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="redo"
        >
          redo →
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onToggleLabels}
          className={`text-xl px-4 py-2 rounded-md border transition-colors active:scale-95 ${
            holdActive
              ? "label-button-active border-gold/40 text-ink"
              : showLabels
              ? "bg-ink/10 text-ink border-ink/20"
              : "text-ink/40 hover:text-ink hover:bg-parchment border-taupe"
          }`}
          aria-label="toggle fraction labels"
        >
          ½
        </button>
      </div>

      {/* Centered 640px coordinate canvas — pieces are positioned relative to this */}
      <div className="flex-1 flex justify-center overflow-hidden">
        <div ref={canvasRef} className="relative" style={{ width: WHOLE_WIDTH }}>
          {/* Encouragement toast */}
          {encouragement && (
            <div
              className="encouragement-toast"
              style={{
                position: "absolute",
                top: 12,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              <span
                style={{
                  background: "rgba(30,107,107,0.10)",
                  color: "#1e6b6b",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  padding: "4px 14px",
                  borderRadius: 20,
                  letterSpacing: "0.02em",
                }}
              >
                {encouragement}
              </span>
            </div>
          )}

          {/* Pieces */}
          {(() => {
            const coverage = showLabels ? computeCoverage(pieces) : new Map<string, Coverage>();
            return pieces.map((piece) => {
              const cov = coverage.get(piece.id);
              return (
                <Piece
                  key={piece.id}
                  piece={piece}
                  glowing={glowingIds.has(piece.id)}
                  glowPulsing={pulsingIds.has(piece.id)}
                  showLabel={showLabels}
                  jiggle={seedJiggle && piece.id === "piece-seed"}
                  jiggleDelay={4}
                  coverSide={cov?.side}
                  coverPx={cov?.coverPx}
                  remainingLabel={cov?.remainingLabel}
                  onMove={onMove}
                  onRemove={onRemove}
                  onHoldStart={onHoldStart}
                  onHoldEnd={onHoldEnd}
                />
              );
            });
          })()}

          {/* Snap preview — shows exactly where dragged piece will land */}
          {snapPreview && (
            <div
              style={{
                position: "absolute",
                left: snapPreview.x,
                top: snapPreview.y,
                opacity: 0.5,
                pointerEvents: "none",
                boxShadow: "0 0 8px 2px rgba(30,107,107,0.35)",
                borderRadius: 6,
              }}
            >
              <FractionBlock denominator={snapPreview.denominator} showLabel={showLabels} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
