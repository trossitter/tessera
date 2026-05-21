import { useRef, useState } from "react";

type Find = { label: string; config: number[]; formula: string };

const FIND_COLORS: Record<number, string> = {
  1: "bg-whole", 2: "bg-half", 4: "bg-quarter", 8: "bg-eighth",
};

const DRAG_THRESHOLD = 8;

function FindRow({ find }: { find: Find }) {
  return (
    <>
      <div className="flex">
        {find.config.map((denom, j) => (
          <div
            key={j}
            className={`${FIND_COLORS[denom] ?? "bg-taupe"} rounded-sm`}
            style={{
              width: 220 / denom,
              height: 22,
              boxShadow: "inset 1px 0 0 0 rgba(0,0,0,0.18), inset -1px 0 0 0 rgba(0,0,0,0.18)",
            }}
          />
        ))}
      </div>
      <div className="text-xs text-ink/70 font-medium">{find.formula}</div>
    </>
  );
}

type DragState = {
  fromIndex: number;
  overIndex: number;
  ghostX: number;
  ghostY: number;
  itemWidth: number;
  offsetY: number;
};

export function SortableFinds({
  finds,
  onReorder,
  onReplay,
}: {
  finds: Find[];
  onReorder: (from: number, to: number) => void;
  onReplay: (config: number[]) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const pressRef = useRef<{
    index: number;
    startY: number;
    active: boolean;
    offsetY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const computeOverIndex = (clientY: number) => {
    if (!containerRef.current || finds.length === 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = clientY - rect.top;
    const slotH = rect.height / finds.length;
    return Math.max(0, Math.min(finds.length - 1, Math.floor(relY / slotH)));
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const itemRect = e.currentTarget.getBoundingClientRect();
    pressRef.current = {
      index,
      startY: e.clientY,
      active: false,
      offsetY: e.clientY - itemRect.top,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressRef.current) return;
    const dy = e.clientY - pressRef.current.startY;
    if (!pressRef.current.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      pressRef.current.active = true;
      const containerRect = containerRef.current?.getBoundingClientRect();
      setDrag({
        fromIndex: pressRef.current.index,
        overIndex: pressRef.current.index,
        ghostX: containerRect?.left ?? 0,
        ghostY: e.clientY - pressRef.current.offsetY,
        itemWidth: containerRect?.width ?? 200,
        offsetY: pressRef.current.offsetY,
      });
    } else {
      setDrag(prev => prev ? {
        ...prev,
        ghostY: e.clientY - prev.offsetY,
        overIndex: computeOverIndex(e.clientY),
      } : null);
    }
  };

  const handlePointerUp = (_e: React.PointerEvent, index: number) => {
    const was = pressRef.current;
    pressRef.current = null;
    if (!was) return;
    if (was.active && drag) {
      if (drag.fromIndex !== drag.overIndex) onReorder(drag.fromIndex, drag.overIndex);
      setDrag(null);
    } else {
      onReplay(finds[index].config);
    }
  };

  const handlePointerCancel = () => {
    pressRef.current = null;
    setDrag(null);
  };

  // Visual order: move dragged item to overIndex slot so other items shift around it
  const order = [...Array(finds.length).keys()];
  if (drag) {
    order.splice(drag.fromIndex, 1);
    order.splice(drag.overIndex, 0, drag.fromIndex);
  }

  return (
    <>
      <div ref={containerRef} className="flex flex-col gap-2 pt-1">
        {order.map((originalIdx) => {
          const isDragging = drag?.fromIndex === originalIdx;
          return (
            <div
              key={originalIdx}
              onPointerDown={(e) => handlePointerDown(e, originalIdx)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, originalIdx)}
              onPointerCancel={handlePointerCancel}
              className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-parchment transition-colors select-none"
              style={{
                touchAction: "none",
                opacity: isDragging ? 0.2 : 1,
                cursor: drag ? "grabbing" : "grab",
              }}
            >
              <FindRow find={finds[originalIdx]} />
            </div>
          );
        })}
      </div>

      {drag && (
        <div
          className="fixed z-50 pointer-events-none bg-paper border border-taupe rounded-md shadow-lg px-2 py-1.5 flex flex-col gap-0.5"
          style={{
            left: drag.ghostX,
            top: drag.ghostY,
            width: drag.itemWidth,
            opacity: 0.93,
          }}
        >
          <FindRow find={finds[drag.fromIndex]} />
        </div>
      )}
    </>
  );
}
