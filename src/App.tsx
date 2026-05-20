import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { Workspace } from "./components/Workspace";
import { Supply } from "./components/Supply";
import { Discoveries } from "./components/Discoveries";
import { Challenge } from "./components/Challenge";
import {
  initialWorkspace,
  workspaceReducer,
  configKey,
  pieceIdsForConfig,
  getFilledRows,
  type Denominator,
  type Discovery,
} from "./workspace-state";

const GLOW_DURATION_MS = 1300;
const ENCOURAGEMENT_DURATION_MS = 3500;

// Challenge arc: composition → equivalence for parts → exhaust equivalences
const CHALLENGES = [
  { id: "three-qtr-compose", target: { num: 3, denom: 4 }, label: "3/4", required: 1 },
  { id: "three-qtr-equiv",   target: { num: 3, denom: 4 }, label: "3/4", required: 2 },
  { id: "half-exhaust",      target: { num: 1, denom: 2 }, label: "1/2", required: 3 },
] as const;

const ENCOURAGEMENTS = [
  "nice — keep going",
  "there you go — keep adding",
  "good start — keep playing",
];


type Phase = "sandbox" | "challenge";

const LAST_ROW_Y = 64 * 8; // MAX_ROW_Y from workspace-state

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);

  // --- entrance animation ---
  const [showEntrance, setShowEntrance] = useState(true);
  const [entranceFading, setEntranceFading] = useState(false);
  useEffect(() => {
    const fade = setTimeout(() => setEntranceFading(true), 900);
    const gone = setTimeout(() => setShowEntrance(false), 1350);
    return () => { clearTimeout(fade); clearTimeout(gone); };
  }, []);

  // --- phase & pill state ---
  const [phase, setPhase] = useState<Phase>("sandbox");
  const [showPill, setShowPill] = useState(false);
  const pillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspacePillFired = useRef(false);
  const discoveryPillFired = useRef(false);

  // --- challenge state ---
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeCredits, setChallengeCredits] = useState<string[]>([]); // configKeys of credited arrangements

  // --- visual fx ---
  const [glowingIds, setGlowingIds] = useState<Set<string>>(new Set());
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const encouragementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSpawnRef = useRef(false);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const guideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- pill helpers ---

  const firePill = useCallback(() => {
    setShowPill(true);
    if (pillTimer.current) clearTimeout(pillTimer.current);
    pillTimer.current = setTimeout(() => setShowPill(false), 6000);
  }, []);

  // Trigger 1: any piece reaches the last row — workspace is full
  useEffect(() => {
    if (phase !== "sandbox" || workspacePillFired.current) return;
    if (state.pieces.some(p => p.y >= LAST_ROW_Y)) {
      workspacePillFired.current = true;
      firePill();
    }
  }, [state.pieces, phase, firePill]);

  // Trigger 2: child has found two distinct ways to make 1
  useEffect(() => {
    if (phase !== "sandbox" || discoveryPillFired.current) return;
    const waysToOne = state.discoveries.filter(d =>
      Math.abs(d.configA.reduce((s, n) => s + 1 / n, 0) - 1) < 1e-9
    );
    if (waysToOne.length >= 2) {
      discoveryPillFired.current = true;
      firePill();
    }
  }, [state.discoveries, phase, firePill]);

  // --- opt-in handler ---

  const handleAcceptChallenge = () => {
    if (pillTimer.current) clearTimeout(pillTimer.current);
    setShowPill(false);
    dispatch({ type: "clear" });
    setPhase("challenge");
  };

  // --- workspace handlers ---

  const handleSpawn = (denominator: Denominator) => {
    // Block spawn once workspace is full — last row occupied
    if (state.pieces.some(p => p.y >= LAST_ROW_Y)) return;
    dispatch({ type: "spawn", denominator });
    // Zero-to-one encouragement on first piece placed
    if (!firstSpawnRef.current) {
      firstSpawnRef.current = true;
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      setEncouragement(msg);
      if (encouragementTimer.current) clearTimeout(encouragementTimer.current);
      encouragementTimer.current = setTimeout(() => setEncouragement(null), ENCOURAGEMENT_DURATION_MS);
    }
  };

  const handleMove = (id: string, x: number, y: number) => {
    dispatch({ type: "move", id, x, y });
  };

  const handleRemove = (id: string) => {
    dispatch({ type: "remove", id });
  };

  const handleReplay = (discovery: Discovery) => {
    dispatch({ type: "replay", discovery });
  };

  // --- challenge logic ---

  // Single-row detection: credit as soon as the child builds any filled row
  // summing to the challenge target. One row = one demonstration = one credit.
  useEffect(() => {
    if (phase !== "challenge") return;
    const current = CHALLENGES[challengeIndex];
    if (!current) return;
    const targetVal = current.target.num / current.target.denom;
    const credited = new Set(challengeCredits);
    for (const row of getFilledRows(state.pieces)) {
      if (Math.abs(row.sum - targetVal) < 1e-9) {
        const key = configKey(row.config);
        if (!credited.has(key)) {
          const ids = pieceIdsForConfig(state.pieces, key);
          setGlowingIds(new Set(ids));
          if (glowTimer.current) clearTimeout(glowTimer.current);
          glowTimer.current = setTimeout(() => setGlowingIds(new Set()), GLOW_DURATION_MS);
          setChallengeCredits(prev => [...prev, key]);
          const msg = credited.size === 0
            ? `you made ${current.label}.`
            : `you found another way to make ${current.label}.`;
          setGuideMessage(msg);
          if (guideTimer.current) clearTimeout(guideTimer.current);
          guideTimer.current = setTimeout(() => setGuideMessage(null), 5000);
          return;
        }
      }
    }
  }, [state.pieces, phase, challengeIndex, challengeCredits]);

  const handleNext = () => {
    const nextIdx = challengeIndex + 1;
    dispatch({ type: "clear" });
    setGuideMessage(null);
    setChallengeCredits([]);
    setChallengeIndex(nextIdx);
  };

  // --- keyboard undo/redo ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentChallenge = CHALLENGES[challengeIndex] ?? null;
  const allDone = challengeIndex >= CHALLENGES.length;
  const required = currentChallenge?.required ?? 0;
  const foundCount = challengeCredits.length;
  const challengeComplete = !allDone && foundCount >= required;
  const panelVisible = phase === "challenge" || state.discoveries.length > 0;

  const TILE = 200; // px per quadrant
  const IMG = TILE * 2; // full image render size

  return (
    <div className="h-full flex flex-col bg-parchment">

      {/* Entrance animation — 4 quadrants fly in from corners */}
      {showEntrance && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-parchment"
          style={{ transition: "opacity 450ms ease-out", opacity: entranceFading ? 0 : 1 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: `${TILE}px ${TILE}px`, gap: 0 }}>
            {([
              ["entrance-tl", "0px 0px"],
              ["entrance-tr", `-${TILE}px 0px`],
              ["entrance-bl", `0px -${TILE}px`],
              ["entrance-br", `-${TILE}px -${TILE}px`],
            ] as const).map(([cls, pos]) => (
              <div
                key={cls}
                className={cls}
                style={{
                  width: TILE,
                  height: TILE,
                  backgroundImage: "url(/assets/tessera3.png)",
                  backgroundSize: `${IMG}px ${IMG}px`,
                  backgroundPosition: pos,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <header className="flex items-center gap-3 px-5 py-3 border-b border-taupe/50">
        <img
          src="/assets/tessera3.png"
          alt=""
          aria-hidden
          className="w-10 h-10 rounded-md object-cover"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
        />
        <span
          className="text-xl font-semibold tracking-wide"
          style={{ color: "#1a2e2a" }}
        >
          tessera
        </span>
        <span className="flex-1" />
        <span
          className="text-xs"
          style={{ color: "#1a2e2a", opacity: 0.45, letterSpacing: "0.08em" }}
        >
          designed by Thalia
        </span>
      </header>

      <main className="flex-1 flex gap-4 p-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0 flex-1 min-w-0">
          {/* Workspace wrapper — relative so the opt-in overlay can be positioned over it */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <Workspace
              pieces={state.pieces}
              glowingIds={glowingIds}
              canUndo={state.past.length > 0}
              canRedo={state.future.length > 0}
              encouragement={encouragement}
              onMove={handleMove}
              onRemove={handleRemove}
              onUndo={() => dispatch({ type: "undo" })}
              onRedo={() => dispatch({ type: "redo" })}
              onClear={() => dispatch({ type: "clear" })}
            />

            {/* Guide attribution — names what the child just found */}
            {guideMessage && phase === "challenge" && (
              <div
                className="fade-in absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none"
                style={{ zIndex: 8 }}
              >
                <span style={{
                  background: "rgba(30,107,107,0.08)",
                  color: "#1e6b6b",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  padding: "5px 16px",
                  borderRadius: 20,
                  letterSpacing: "0.02em",
                }}>
                  {guideMessage}
                </span>
              </div>
            )}

            {/* Challenge pill — fades in when triggered, tappable */}
            {showPill && phase === "sandbox" && (
              <div
                className="fade-in absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <button
                  type="button"
                  onClick={handleAcceptChallenge}
                  className="pointer-events-auto active:scale-95 transition-transform"
                  style={{
                    background: "rgba(30,107,107,0.10)",
                    color: "#1e6b6b",
                    border: "1px solid rgba(30,107,107,0.28)",
                    borderRadius: 20,
                    padding: "6px 20px",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                  }}
                >
                  try making {CHALLENGES[0].label}.
                </button>
              </div>
            )}
          </div>

          <Supply onSpawn={handleSpawn} />
        </div>

        {/* Right panel: slides in on first discovery or when in challenge mode */}
        <div
          className="flex flex-col gap-4 min-h-0 overflow-hidden shrink-0"
          style={{
            width: panelVisible ? "32%" : "0",
            opacity: panelVisible ? 1 : 0,
            transition: "width 700ms ease-in-out, opacity 600ms ease-in-out",
          }}
        >
          {phase === "challenge" && (
            <div className="fade-in">
              <Challenge
                label={currentChallenge?.label ?? ""}
                required={required}
                foundCount={foundCount}
                complete={challengeComplete}
                allDone={allDone}
                onNext={handleNext}
              />
            </div>
          )}
          <Discoveries discoveries={state.discoveries} onReplay={handleReplay} />
        </div>
      </main>
    </div>
  );
}
