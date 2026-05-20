import { Piece } from "./Piece";
import type { Piece as PieceType } from "../workspace-state";

type Props = {
  pieces: PieceType[];
  glowingIds: Set<string>;
  canUndo: boolean;
  canRedo: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export function Workspace({
  pieces,
  glowingIds,
  canUndo,
  canRedo,
  onMove,
  onUndo,
  onRedo,
  onClear,
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
        <span className="text-ink/20" aria-hidden>
          |
        </span>
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
      </div>
      <div className="relative flex-1">
        {pieces.map((piece) => (
          <Piece
            key={piece.id}
            piece={piece}
            glowing={glowingIds.has(piece.id)}
            onMove={onMove}
          />
        ))}
      </div>
    </section>
  );
}
