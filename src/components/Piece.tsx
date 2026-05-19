import { useRef, useState } from "react";
import { FractionBlock } from "./FractionBlock";
import type { Piece as PieceType } from "../workspace-state";

type Props = {
  piece: PieceType;
  onMove: (id: string, x: number, y: number) => void;
};

export function Piece({ piece, onMove }: Props) {
  const startRef = useRef<{ pointerX: number; pointerY: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { pointerX: e.clientX, pointerY: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    setDrag({
      dx: e.clientX - startRef.current.pointerX,
      dy: e.clientY - startRef.current.pointerY,
    });
  };

  const handlePointerUp = () => {
    if (!startRef.current || !drag) return;
    onMove(piece.id, piece.x + drag.dx, piece.y + drag.dy);
    setDrag(null);
    startRef.current = null;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: piece.x,
        top: piece.y,
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
        touchAction: "none",
        cursor: drag ? "grabbing" : "grab",
        zIndex: drag ? 10 : 1,
      }}
    >
      <FractionBlock denominator={piece.denominator} />
    </div>
  );
}
