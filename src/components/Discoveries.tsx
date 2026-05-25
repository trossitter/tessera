import { useRef, useState, useEffect } from "react";
import type { Discovery } from "../workspace-state";

const SCALE_UNIT_WIDTH = 220;
const SCALE_BLOCK_HEIGHT = 22;

const COLOR_BY_DENOM: Record<number, string> = {
  1: "bg-whole",
  2: "bg-half",
  4: "bg-quarter",
  8: "bg-eighth",
};

const LABEL_COLOR: Record<number, string> = {
  1: "rgba(255,255,255,0.85)",
  2: "rgba(255,255,255,0.85)",
  4: "rgba(26,46,42,0.65)",
  8: "rgba(26,46,42,0.65)",
};

const LABEL: Record<number, string> = {
  1: "1", 2: "½", 4: "¼", 8: "⅛",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

function fmtFraction(f: { num: number; denom: number }): string {
  if (f.denom === 1) return String(f.num);
  return `${f.num}/${f.denom}`;
}

function configLabel(config: number[]): string {
  return config.map(d => d === 1 ? "1" : `1/${d}`).join(" + ");
}

function ConfigBar({ config, showLabels }: { config: number[]; showLabels?: boolean }) {
  return (
    <div className="flex">
      {config.map((denom, i) => (
        <div
          key={i}
          className={`${COLOR_BY_DENOM[denom] ?? "bg-taupe"} rounded-sm`}
          style={{
            width: SCALE_UNIT_WIDTH / denom,
            height: SCALE_BLOCK_HEIGHT,
            boxShadow: "inset 1px 0 0 0 rgba(0,0,0,0.18), inset -1px 0 0 0 rgba(0,0,0,0.18)",
            position: "relative",
          }}
        >
          {showLabels && (
            <span style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.max(7, SCALE_BLOCK_HEIGHT * 0.45),
              fontWeight: 700,
              color: LABEL_COLOR[denom] ?? "rgba(255,255,255,0.85)",
              pointerEvents: "none",
              userSelect: "none",
            }}>
              {LABEL[denom] ?? `1/${denom}`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DiscoveryContent({ discovery, showLabels }: { discovery: Discovery; showLabels?: boolean }) {
  return (
    <>
      <ConfigBar config={discovery.configA} showLabels={showLabels} />
      <span className="text-ink/40 text-xs leading-none pl-2">=</span>
      <ConfigBar config={discovery.configB} showLabels={showLabels} />
      <div className="text-xs text-ink/70 font-medium pt-0.5">
        {configLabel(discovery.configA)} = {configLabel(discovery.configB)}
      </div>
    </>
  );
}

const DRAG_THRESHOLD = 8;

function SortableDiscoveryGroup({ items, showLabels, onReplay }: {
  items: Discovery[];
  showLabels?: boolean;
  onReplay: (d: Discovery) => void;
}) {
  const [orderedIds, setOrderedIds] = useState(() => items.map(d => d.id));
  const [drag, setDrag] = useState<{
    id: string; overIndex: number;
    ghostX: number; ghostY: number; itemWidth: number; offsetY: number;
  } | null>(null);
  const pressRef = useRef<{ id: string; startY: number; active: boolean; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Append IDs for newly arriving discoveries
  useEffect(() => {
    setOrderedIds(prev => {
      const prevSet = new Set(prev);
      const newIds = items.filter(d => !prevSet.has(d.id)).map(d => d.id);
      return newIds.length ? [...prev, ...newIds] : prev;
    });
  }, [items]);

  const computeOverIndex = (clientY: number) => {
    if (!containerRef.current || orderedIds.length === 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const slotH = rect.height / orderedIds.length;
    return Math.max(0, Math.min(orderedIds.length - 1, Math.floor((clientY - rect.top) / slotH)));
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pressRef.current = {
      id, startY: e.clientY, active: false,
      offsetY: e.clientY - e.currentTarget.getBoundingClientRect().top,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressRef.current) return;
    if (!pressRef.current.active) {
      if (Math.abs(e.clientY - pressRef.current.startY) < DRAG_THRESHOLD) return;
      pressRef.current.active = true;
      const containerRect = containerRef.current?.getBoundingClientRect();
      setDrag({
        id: pressRef.current.id,
        overIndex: orderedIds.indexOf(pressRef.current.id),
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

  const handlePointerUp = (_e: React.PointerEvent, id: string) => {
    const was = pressRef.current;
    pressRef.current = null;
    if (!was) return;
    if (was.active && drag) {
      const fromIndex = orderedIds.indexOf(drag.id);
      if (fromIndex !== drag.overIndex) {
        setOrderedIds(prev => {
          const next = [...prev];
          next.splice(fromIndex, 1);
          next.splice(drag.overIndex, 0, drag.id);
          return next;
        });
      }
      setDrag(null);
    } else {
      const discovery = items.find(d => d.id === id);
      if (discovery) onReplay(discovery);
    }
  };

  const handlePointerCancel = () => {
    pressRef.current = null;
    setDrag(null);
  };

  const itemById = new Map(items.map(d => [d.id, d]));
  const displayOrder = orderedIds.map(id => itemById.get(id)).filter(Boolean) as Discovery[];

  // Shift visual order while dragging
  const visualOrder = [...displayOrder];
  if (drag) {
    const fromIdx = visualOrder.findIndex(d => d.id === drag.id);
    if (fromIdx !== -1) {
      const [item] = visualOrder.splice(fromIdx, 1);
      visualOrder.splice(drag.overIndex, 0, item);
    }
  }

  const dragItem = drag ? itemById.get(drag.id) : null;

  return (
    <>
      <div ref={containerRef} className="flex flex-col gap-2 pt-1">
        {visualOrder.map((discovery) => (
          <div
            key={discovery.id}
            onPointerDown={(e) => handlePointerDown(e, discovery.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, discovery.id)}
            onPointerCancel={handlePointerCancel}
            className="flex flex-col gap-1 rounded-md px-2 py-1.5 -mx-2 hover:bg-parchment transition-colors select-none"
            style={{
              touchAction: "none",
              opacity: drag?.id === discovery.id ? 0.2 : 1,
              cursor: drag ? "grabbing" : "grab",
            }}
          >
            <DiscoveryContent discovery={discovery} showLabels={showLabels} />
          </div>
        ))}
      </div>

      {dragItem && drag && (
        <div
          className="fixed z-50 pointer-events-none bg-paper border border-taupe rounded-md shadow-lg px-2 py-1.5 flex flex-col gap-1"
          style={{ left: drag.ghostX, top: drag.ghostY, width: drag.itemWidth, opacity: 0.93 }}
        >
          <DiscoveryContent discovery={dragItem} showLabels={showLabels} />
        </div>
      )}
    </>
  );
}

type Props = {
  discoveries: Discovery[];
  showLabels?: boolean;
  onReplay: (d: Discovery) => void;
};

function configReducedValue(config: number[]): { num: number; denom: number } {
  const commonDenom = config.reduce((acc, d) => lcm(acc, d), 1);
  const totalNum = config.reduce((acc, d) => acc + commonDenom / d, 0);
  const divisor = gcd(totalNum, commonDenom);
  return { num: totalNum / divisor, denom: commonDenom / divisor };
}

function configFloat(config: number[]): number {
  return config.reduce((sum, d) => sum + 1 / d, 0);
}

export function Discoveries({ discoveries, showLabels, onReplay }: Props) {
  if (discoveries.length === 0) {
    return (
      <section className="bg-paper rounded-lg shadow-sm border border-taupe p-4">
        <div className="text-sm text-ink/40 italic">
          try making the same amount two different ways
        </div>
      </section>
    );
  }

  const sorted = [...discoveries].sort((a, b) => {
    const vDiff = configFloat(a.configA) - configFloat(b.configA);
    if (Math.abs(vDiff) > 1e-9) return vDiff;
    return (a.configA.length + a.configB.length) - (b.configA.length + b.configB.length);
  });

  type Group = { label: string; items: Discovery[] };
  const groups: Group[] = [];
  for (const d of sorted) {
    const v = configReducedValue(d.configA);
    const label = fmtFraction(v);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(d);
    else groups.push({ label, items: [d] });
  }

  return (
    <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
      {groups.map((group) => (
        <section
          key={group.label}
          className="bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-2"
        >
          <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
            making {group.label}
          </header>
          <SortableDiscoveryGroup
            items={group.items}
            showLabels={showLabels}
            onReplay={onReplay}
          />
        </section>
      ))}
    </div>
  );
}
