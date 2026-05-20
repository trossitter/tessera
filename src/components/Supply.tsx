import { useRef } from "react";
import { FractionBlock } from "./FractionBlock";
import { SUPPLY_DENOMS, type Denominator } from "../workspace-state";

type Props = {
  onSpawn: (denominator: Denominator) => void;
  onDragStart: (denominator: Denominator, clientX: number, clientY: number) => void;
};

const SUPPLY_SCALE = 0.5;
const DRAG_THRESHOLD_PX = 6;

export function Supply({ onSpawn, onDragStart }: Props) {
  const pressRef = useRef<{
    denominator: Denominator;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, d: Denominator) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pressRef.current = { denominator: d, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressRef.current || pressRef.current.dragging) return;
    const dx = e.clientX - pressRef.current.startX;
    const dy = e.clientY - pressRef.current.startY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
      pressRef.current.dragging = true;
      onDragStart(pressRef.current.denominator, e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (_e: React.PointerEvent, d: Denominator) => {
    if (!pressRef.current) return;
    if (!pressRef.current.dragging) onSpawn(d);
    pressRef.current = null;
  };

  const handlePointerCancel = (_e: React.PointerEvent) => { pressRef.current = null; };

  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-3">
      {SUPPLY_DENOMS.map((d) => (
        <div key={d} className="flex gap-1 justify-center">
          {Array.from({ length: d }, (_, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`add one ${d === 1 ? "whole" : `${d}th`}`}
              className="rounded-md cursor-grab active:cursor-grabbing touch-none"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => handlePointerDown(e, d)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, d)}
              onPointerCancel={handlePointerCancel}
            >
              <FractionBlock denominator={d} scale={SUPPLY_SCALE} />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
