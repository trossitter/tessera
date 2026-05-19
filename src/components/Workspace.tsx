import { Piece } from "./Piece";
import type { Piece as PieceType } from "../workspace-state";

type Props = {
  pieces: PieceType[];
  onMove: (id: string, x: number, y: number) => void;
};

export function Workspace({ pieces, onMove }: Props) {
  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe relative overflow-hidden min-h-[400px] flex-1">
      {pieces.map((piece) => (
        <Piece key={piece.id} piece={piece} onMove={onMove} />
      ))}
    </section>
  );
}
