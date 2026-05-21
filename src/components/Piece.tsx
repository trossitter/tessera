import { useRef, useState } from "react";
import { FractionBlock } from "./FractionBlock";
import { snap, SNAP_X, SNAP_Y } from "../workspace-state";
import type { Piece as PieceType } from "../workspace-state";

const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_MS = 250;
const HOLD_LABELS_MS = 3000;

type Props = {
  piece: PieceType;
  glowing?: boolean;
  glowPulsing?: boolean;
  showLabel?: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
};

export function Piece({ piece, glowing, glowPulsing, showLabel, onMove, onRemove, onHoldStart, onHoldEnd }: Props) {
  const startRef = useRef<{ pointerX: number; pointerY: number; time: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActiveRef = useRef(false);

  const clearHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdActiveRef.current) {
      holdActiveRef.current = false;
      onHoldEnd?.();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { pointerX: e.clientX, pointerY: e.clientY, time: Date.now() };
    setDrag({ dx: 0, dy: 0 });
    holdTimerRef.current = setTimeout(() => {
      holdActiveRef.current = true;
      onHoldStart?.();
    }, HOLD_LABELS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    setDrag({
      dx: e.clientX - startRef.current.pointerX,
      dy: e.clientY - startRef.current.pointerY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    clearHold();
    if (!startRef.current || !drag) return;
    const dx = e.clientX - startRef.current.pointerX;
    const dy = e.clientY - startRef.current.pointerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - startRef.current.time;

    if (dist < TAP_MAX_MOVE_PX && elapsed < TAP_MAX_MS) {
      onRemove(piece.id);
    } else {
      onMove(piece.id, piece.x + drag.dx, piece.y + drag.dy);
    }
    setDrag(null);
    startRef.current = null;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={glowPulsing ? "piece-glowing-hold" : glowing ? "piece-glowing" : undefined}
      style={{
        position: "absolute",
        left: piece.x,
        top: piece.y,
        transform: drag
          ? `translate(${snap(piece.x + drag.dx, SNAP_X) - piece.x}px, ${snap(piece.y + drag.dy, SNAP_Y) - piece.y}px)`
          : undefined,
        touchAction: "none",
        cursor: drag ? "grabbing" : "grab",
        zIndex: drag ? 10 : 1,
      }}
    >
      <FractionBlock denominator={piece.denominator} showLabel={showLabel} />
    </div>
  );
}
