import { useRef } from "react";
import { FractionBlock } from "./FractionBlock";
import { SUPPLY_DENOMS, type Denominator } from "../workspace-state";

type Props = {
  showLabels: boolean;
  excludeWhole?: boolean;
  onSpawn: (denominator: Denominator) => void;
  onDragStart: (denominator: Denominator, clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
  onDragCancel: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
};

const SUPPLY_SCALE = 0.5;
const DRAG_THRESHOLD_PX = 6;
const HOLD_LABELS_MS = 2000;

export function Supply({ showLabels, excludeWhole = false, onSpawn, onDragStart, onDragMove, onDragEnd, onDragCancel, onHoldStart, onHoldEnd }: Props) {
  const denoms = excludeWhole ? SUPPLY_DENOMS.filter(d => d !== 1) : SUPPLY_DENOMS;
  const pressRef = useRef<{
    denominator: Denominator;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActiveRef = useRef(false);

  const clearHold = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdActiveRef.current) { holdActiveRef.current = false; onHoldEnd?.(); }
  };

  const handlePointerDown = (e: React.PointerEvent, d: Denominator) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pressRef.current = { denominator: d, startX: e.clientX, startY: e.clientY, dragging: false };
    holdTimerRef.current = setTimeout(() => {
      holdActiveRef.current = true;
      onHoldStart?.();
    }, HOLD_LABELS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressRef.current) return;
    if (pressRef.current.dragging) {
      onDragMove(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - pressRef.current.startX;
    const dy = e.clientY - pressRef.current.startY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
      pressRef.current.dragging = true;
      onDragStart(pressRef.current.denominator, e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent, d: Denominator) => {
    clearHold();
    if (!pressRef.current) return;
    if (pressRef.current.dragging) {
      onDragEnd(e.clientX, e.clientY);
    } else {
      onSpawn(d);
    }
    pressRef.current = null;
  };

  const handlePointerCancel = () => {
    clearHold();
    if (pressRef.current?.dragging) onDragCancel();
    pressRef.current = null;
  };

  return (
    <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-3">
      {denoms.map((d, i) => (
        <div
          key={d}
          className="flex gap-1 justify-center piece-jiggle"
          style={{ animationDelay: `${3.2 + i * 0.12}s` }}
        >
          {Array.from({ length: d }, (_, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`add one ${d === 1 ? "whole" : `${d}th`}`}
              className="rounded-md cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => handlePointerDown(e, d)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, d)}
              onPointerCancel={handlePointerCancel}
            >
              <FractionBlock denominator={d} scale={SUPPLY_SCALE} showLabel={showLabels} />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
