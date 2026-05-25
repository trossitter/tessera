import { type RefObject } from "react";
import { Piece } from "./Piece";
import { FractionBlock } from "./FractionBlock";
import type { Piece as PieceType, Denominator } from "../workspace-state";
import { WHOLE_WIDTH, pieceWidth } from "../workspace-state";

type CoverRegion = { left: number; right: number; label: string };
type Coverage = { primary: CoverRegion; secondary: CoverRegion | null };

const UNICODE_FRACS: Record<string, string> = {
  "1/2": "½", "1/3": "⅓", "1/4": "¼", "1/6": "⅙", "1/8": "⅛",
  "2/3": "⅔", "3/4": "¾", "5/6": "⅚",
  "3/8": "3⁄8", "5/8": "5⁄8", "7/8": "7⁄8",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function fractionLabel(num: number, denom: number): string {
  const g = gcd(num, denom);
  const n = num / g, d = denom / g;
  if (d === 1) return String(n);
  return UNICODE_FRACS[`${n}/${d}`] ?? `${n}⁄${d}`;
}

function computeCoverage(pieces: PieceType[]): Map<string, Coverage> {
  const map = new Map<string, Coverage>();

  for (const covered of pieces) {
    const coveredW = pieceWidth(covered.denominator);

    // Collect distinct covering intervals (fully inside, strictly smaller).
    const seenKeys = new Set<string>();
    const intervals: { relX: number; w: number; denom: number }[] = [];
    for (const covering of pieces) {
      if (covering.id === covered.id) continue;
      if (covering.y !== covered.y) continue;
      const coveringW = pieceWidth(covering.denominator);
      if (coveringW >= coveredW) continue;
      if (covering.x < covered.x || covering.x + coveringW > covered.x + coveredW) continue;
      const key = `${covering.x},${covering.denominator}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      intervals.push({ relX: covering.x - covered.x, w: coveringW, denom: covering.denominator });
    }
    if (intervals.length === 0) continue; // fully covered

    // Merge covered pixel intervals.
    const ranges = intervals
      .map(iv => [iv.relX, iv.relX + iv.w] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of ranges) {
      if (merged.length && s <= merged[merged.length - 1][1])
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      else merged.push([s, e]);
    }

    // Find uncovered gaps; pick the largest for label placement.
    const gaps: [number, number][] = [];
    let cursor = 0;
    for (const [s, e] of merged) {
      if (cursor < s) gaps.push([cursor, s]);
      cursor = e;
    }
    if (cursor < coveredW) gaps.push([cursor, coveredW]);
    if (gaps.length === 0) continue;

    // Label each gap independently as its fraction of the whole.
    const gapLabel = ([gL, gR]: [number, number]) => {
      const px = gR - gL;
      const g2 = gcd(px, WHOLE_WIDTH);
      return fractionLabel(px / g2, WHOLE_WIDTH / g2);
    };

    // Sort gaps largest first; take up to 2.
    const sorted = [...gaps].sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    const [pL, pR] = sorted[0];
    const primary: CoverRegion = { left: pL, right: coveredW - pR, label: gapLabel(sorted[0]) };
    const secondary: CoverRegion | null = sorted[1]
      ? { left: sorted[1][0], right: coveredW - sorted[1][1], label: gapLabel(sorted[1]) }
      : null;

    map.set(covered.id, { primary, secondary });
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
                  fontSize: "1.2rem",
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
                  coverage={cov ?? null}
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
