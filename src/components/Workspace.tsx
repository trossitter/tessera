import { type RefObject } from "react";
import { Piece } from "./Piece";
import { FractionBlock } from "./FractionBlock";
import type { Piece as PieceType, Denominator } from "../workspace-state";
import { WHOLE_WIDTH } from "../workspace-state";

type Props = {
  pieces: PieceType[];
  glowingIds: Set<string>;
  canUndo: boolean;
  canRedo: boolean;
  encouragement: string | null;
  showLabels: boolean;
  snapPreview: { x: number; y: number; denominator: Denominator } | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleLabels: () => void;
};

export function Workspace({
  pieces,
  glowingIds,
  canUndo,
  canRedo,
  encouragement,
  showLabels,
  snapPreview,
  canvasRef,
  onMove,
  onRemove,
  onUndo,
  onRedo,
  onClear,
  onToggleLabels,
}: Props) {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe overflow-hidden min-h-[400px] flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-taupe">
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-2 py-1 rounded text-ink/70 hover:text-ink hover:bg-parchment transition-colors"
          aria-label="clear workspace"
        >
          clear
        </button>
        <span className="text-ink/20" aria-hidden>|</span>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="text-xs px-2 py-1 rounded text-ink/70 hover:text-ink hover:bg-parchment disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="undo"
        >
          ← undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="text-xs px-2 py-1 rounded text-ink/70 hover:text-ink hover:bg-parchment disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="redo"
        >
          redo →
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onToggleLabels}
          className={`text-xs px-2 py-1 rounded transition-colors ${showLabels ? "bg-ink/10 text-ink" : "text-ink/40 hover:text-ink hover:bg-parchment"}`}
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
          {pieces.map((piece) => (
            <Piece
              key={piece.id}
              piece={piece}
              glowing={glowingIds.has(piece.id)}
              showLabel={showLabels}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}

          {/* Snap preview — shows exactly where dragged piece will land */}
          {snapPreview && (
            <div
              style={{
                position: "absolute",
                left: snapPreview.x,
                top: snapPreview.y,
                opacity: 0.5,
                pointerEvents: "none",
                boxShadow: "0 0 0 2px rgba(30,107,107,0.7)",
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
