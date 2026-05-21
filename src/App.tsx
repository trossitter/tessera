import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { LESSON_SCRIPT } from "./lesson/script";
import { playSnap, playDrop } from "./sounds";
import { pieceWidth, PIECE_HEIGHT, snap, SNAP_X, SNAP_Y } from "./workspace-state";
import { Workspace } from "./components/Workspace";
import { Supply } from "./components/Supply";
import { Discoveries } from "./components/Discoveries";
import { Challenge } from "./components/Challenge";
import { FractionBlock } from "./components/FractionBlock";
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

const TILE_PX = 360;

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);

  // --- entrance animation (20% faster than original 2.2s) ---
  const [showEntrance, setShowEntrance] = useState(true);
  const [entranceFading, setEntranceFading] = useState(false);
  const entranceFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entranceGoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    entranceFadeRef.current = setTimeout(() => setEntranceFading(true), 2300);
    entranceGoneRef.current = setTimeout(() => setShowEntrance(false), 2900);
    return () => {
      if (entranceFadeRef.current) clearTimeout(entranceFadeRef.current);
      if (entranceGoneRef.current) clearTimeout(entranceGoneRef.current);
    };
  }, []);

  const skipEntrance = () => {
    if (entranceFadeRef.current) clearTimeout(entranceFadeRef.current);
    if (entranceGoneRef.current) clearTimeout(entranceGoneRef.current);
    setEntranceFading(true);
    entranceGoneRef.current = setTimeout(() => setShowEntrance(false), 600);
  };

  // --- phase & pill state ---
  const [phase, setPhase] = useState<Phase>("sandbox");
  const [showPill, setShowPill] = useState(false);
  const workspacePillFired = useRef(false);
  const discoveryPillFired = useRef(false);

  // --- challenge state ---
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeCredits, setChallengeCredits] = useState<string[]>([]);
  const [holdingConfig, setHoldingConfig] = useState<number[] | null>(null);
  const [challengeFinds, setChallengeFinds] = useState<{ label: string; config: number[]; formula: string }[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);

  // --- supply drag ---
  const supplyDenomRef = useRef<Denominator | null>(null);
  const [supplyDragPos, setSupplyDragPos] = useState<{ clientX: number; clientY: number } | null>(null);
  const [snapPreview, setSnapPreview] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // --- labels toggle + hold-to-peek ---
  const [showLabels, setShowLabels] = useState(false);
  const [holdLabels, setHoldLabels] = useState(false);
  const effectiveShowLabels = showLabels || holdLabels;

  // --- lesson engine ---
  const [lessonPhase, setLessonPhase] = useState(0);
  const [lessonLineIndex, setLessonLineIndex] = useState(0);

  // --- visual fx ---
  const [glowingIds, setGlowingIds] = useState<Set<string>>(new Set());
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const encouragementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSpawnRef = useRef(false);

  // --- pill helpers ---

  const firePill = useCallback(() => {
    setShowPill(true); // stays until child chooses
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

  // --- lesson engine advancement ---

  // first_interaction: silence → exploration_prompt
  // (fired in handleSpawn when firstSpawnRef first trips)

  // discovered_half_equals_two_quarters
  useEffect(() => {
    if (lessonPhase !== 1) return;
    const found = state.discoveries.some(d =>
      d.configA.length === 1 && d.configA[0] === 2 &&
      d.configB.length === 2 && d.configB[0] === 4 && d.configB[1] === 4
    );
    if (found) setLessonPhase(2);
  }, [state.discoveries, lessonPhase]);

  // task_complete: practice → complete
  // (fired in handleNext when challenges are finished)

  // Reset line index when lesson phase changes
  useEffect(() => { setLessonLineIndex(0); }, [lessonPhase]);

  const handleAdvanceLesson = () => {
    if (lessonLineIndex < lessonLines.length - 1) {
      setLessonLineIndex(i => i + 1);
    } else {
      setLessonPhase(p => p + 1);
    }
  };

  // --- opt-in handlers ---

  const handleAcceptChallenge = () => {
    setShowPill(false);
    dispatch({ type: "clear" });
    setPhase("challenge");
  };

  // --- supply drag handlers ---
  // Pointer capture stays on the supply element throughout; events bubble here via callbacks.

  const computeSnapPreview = (denominator: Denominator, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { setSnapPreview(null); return; }
    const rect = canvas.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      const w = pieceWidth(denominator);
      const snappedX = Math.max(0, Math.min(snap(clientX - rect.left - w / 2, SNAP_X), rect.width - w));
      const snappedY = Math.max(SNAP_Y, Math.min(snap(clientY - rect.top - PIECE_HEIGHT / 2, SNAP_Y), LAST_ROW_Y));
      setSnapPreview({ x: snappedX, y: snappedY });
    } else {
      setSnapPreview(null);
    }
  };

  const handleDragStart = (denominator: Denominator, clientX: number, clientY: number) => {
    supplyDenomRef.current = denominator;
    setSupplyDragPos({ clientX, clientY });
    computeSnapPreview(denominator, clientX, clientY);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    setSupplyDragPos({ clientX, clientY });
    const denom = supplyDenomRef.current;
    if (denom) computeSnapPreview(denom, clientX, clientY);
  };

  const handleDragEnd = (clientX: number, clientY: number) => {
    const denominator = supplyDenomRef.current;
    supplyDenomRef.current = null;
    setSupplyDragPos(null);
    setSnapPreview(null);
    if (!denominator) return;
    const canvas = canvasRef.current;
    if (!canvas) { dispatch({ type: "spawn", denominator }); return; }
    const rect = canvas.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      const w = pieceWidth(denominator);
      const snappedX = Math.max(0, Math.min(snap(clientX - rect.left - w / 2, SNAP_X), rect.width - w));
      const snappedY = Math.max(SNAP_Y, Math.min(snap(clientY - rect.top - PIECE_HEIGHT / 2, SNAP_Y), LAST_ROW_Y));
      dispatch({ type: "spawn_at", denominator, x: snappedX, y: snappedY });
    } else {
      dispatch({ type: "spawn", denominator });
    }
  };

  const handleDragCancel = () => {
    supplyDenomRef.current = null;
    setSupplyDragPos(null);
    setSnapPreview(null);
  };

  const dismissSpawnCount = useRef(0);
  const handleDismissChallenge = () => {
    setShowPill(false);
    dismissSpawnCount.current = 0; // reset counter — re-prompt after 10 more pieces
  };

  // --- workspace handlers ---

  const handleSpawn = (denominator: Denominator) => {
    if (state.pieces.some(p => p.y >= LAST_ROW_Y)) return;
    if (holdingConfig) return;
    dispatch({ type: "spawn", denominator });
    // Re-prompt after dismissal: every 10 pieces
    if (!showPill && (workspacePillFired.current || discoveryPillFired.current)) {
      dismissSpawnCount.current += 1;
      if (dismissSpawnCount.current >= 10) {
        dismissSpawnCount.current = 0;
        setShowPill(true);
      }
    }
    if (!firstSpawnRef.current) {
      firstSpawnRef.current = true;
      setLessonPhase(p => p === 0 ? 1 : p); // silence → exploration_prompt
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

  // Detection: when a filled row sums to the target, enter hold state.
  // The child must acknowledge by tapping the fraction pill before continuing.
  useEffect(() => {
    if (phase !== "challenge" || holdingConfig) return;
    const current = CHALLENGES[challengeIndex];
    if (!current) return;
    const targetVal = current.target.num / current.target.denom;
    const credited = new Set(challengeCredits);
    for (const row of getFilledRows(state.pieces)) {
      if (Math.abs(row.sum - targetVal) < 1e-9) {
        const key = configKey(row.config);
        if (!credited.has(key)) {
          // Glow the matching pieces and hold — wait for child's acknowledgment
          const ids = pieceIdsForConfig(state.pieces, key);
          setGlowingIds(new Set(ids));
          setHoldingConfig(row.config);
          return;
        }
      }
    }
  }, [state.pieces, phase, challengeIndex, challengeCredits, holdingConfig]);

  // Child taps the fraction pill — acknowledges what they built
  const handleAcknowledge = () => {
    if (!holdingConfig) return;
    const current = CHALLENGES[challengeIndex];
    if (!current) return;
    const key = configKey(holdingConfig);
    playSnap(0.25);
    const newCount = challengeCredits.length + 1;
    const willComplete = newCount >= current.required;
    setChallengeCredits(prev => [...prev, key]);
    setChallengeFinds(prev => [{
      label: current.label,
      config: holdingConfig,
      formula: holdingConfig.map(d => d === 1 ? "1" : `1/${d}`).join(" + "),
    }, ...prev]);
    setHoldingConfig(null);
    if (glowTimer.current) clearTimeout(glowTimer.current);
    glowTimer.current = setTimeout(() => {
      setGlowingIds(new Set());
      dispatch({ type: "clear" });
      if (willComplete) setShowCompletion(true);
    }, GLOW_DURATION_MS);
  };

  const handleNext = () => {
    const nextIdx = challengeIndex + 1;
    setShowCompletion(false);
    dispatch({ type: "clear" });
    setHoldingConfig(null);
    setChallengeCredits([]);
    setChallengeIndex(nextIdx);
    if (nextIdx >= CHALLENGES.length) setLessonPhase(p => Math.max(p, 6));
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
  const panelVisible = phase === "challenge" || state.discoveries.length > 0 || challengeFinds.length > 0;

  const currentLesson = LESSON_SCRIPT[lessonPhase];
  const lessonLines = currentLesson?.guideLines ?? [];
  const lessonNeedsReady = currentLesson?.advance.kind === "user_ready";
  const currentLessonLine = lessonLines[lessonLineIndex] ?? null;
  const isLastLessonLine = lessonLineIndex >= lessonLines.length - 1;

  const FIND_COLORS: Record<number, string> = {
    1: "bg-whole", 2: "bg-half", 4: "bg-quarter", 8: "bg-eighth",
  };

  return (
    <div className="h-full flex flex-col bg-parchment">

      {/* Entrance — 4 quadrants close into one centered image; tap to skip */}
      {showEntrance && (
        <div
          className="fixed inset-0 z-50 bg-parchment flex items-center justify-center cursor-pointer"
          style={{ transition: "opacity 600ms ease-out", opacity: entranceFading ? 0 : 1 }}
          onPointerDown={skipEntrance}
        >
          <div style={{ display: "grid", gridTemplateColumns: `${TILE_PX}px ${TILE_PX}px`, gap: 0 }}>
            {[
              ["entrance-tl", "0px 0px"],
              ["entrance-tr", `-${TILE_PX}px 0px`],
              ["entrance-bl", `0px -${TILE_PX}px`],
              ["entrance-br", `-${TILE_PX}px -${TILE_PX}px`],
            ].map(([cls, pos]) => (
              <div
                key={cls}
                className={cls}
                style={{
                  width: TILE_PX,
                  height: TILE_PX,
                  backgroundImage: "url(/assets/tessera3.png)",
                  backgroundSize: `${TILE_PX * 2}px ${TILE_PX * 2}px`,
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
          alt="reload"
          role="button"
          tabIndex={0}
          className="w-10 h-10 rounded-md object-cover cursor-pointer active:scale-95 transition-transform"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          onClick={() => window.location.reload()}
          onKeyDown={(e) => e.key === "Enter" && window.location.reload()}
        />
        <span
          role="button"
          tabIndex={0}
          className="text-xl font-semibold tracking-wide cursor-pointer"
          style={{ color: "#1a2e2a" }}
          onClick={() => dispatch({ type: "clear" })}
          onKeyDown={(e) => e.key === "Enter" && dispatch({ type: "clear" })}
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
        <div className="flex flex-col gap-5 min-h-0 flex-1 min-w-0">

          {/* Lesson guide voice — one line at a time */}
          {currentLessonLine && (
            <div
              key={`${lessonPhase}-${lessonLineIndex}`}
              className={`fade-in bg-paper rounded-lg border border-taupe px-4 py-3 flex items-center justify-between gap-3 ${(!isLastLessonLine || lessonNeedsReady) ? "cursor-pointer active:bg-parchment transition-colors" : ""}`}
              onClick={(!isLastLessonLine || lessonNeedsReady) ? handleAdvanceLesson : undefined}
            >
              <p className="text-sm text-ink/80 leading-snug italic">{currentLessonLine}</p>
              {(!isLastLessonLine || lessonNeedsReady) && (
                <span className="shrink-0 text-xs text-ink/35" aria-hidden>→</span>
              )}
            </div>
          )}

          {/* Workspace */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <Workspace
              pieces={state.pieces}
              glowingIds={holdingConfig ? new Set() : glowingIds}
              pulsingIds={holdingConfig ? glowingIds : new Set()}
              canUndo={state.past.length > 0}
              canRedo={state.future.length > 0}
              encouragement={encouragement}
              showLabels={effectiveShowLabels}
              holdActive={holdLabels}
              snapPreview={snapPreview && supplyDenomRef.current
                ? { ...snapPreview, denominator: supplyDenomRef.current }
                : null}
              canvasRef={canvasRef}
              onMove={holdingConfig ? () => {} : handleMove}
              onRemove={holdingConfig ? () => {} : handleRemove}
              onUndo={() => dispatch({ type: "undo" })}
              onRedo={() => dispatch({ type: "redo" })}
              onClear={() => dispatch({ type: "clear" })}
              onToggleLabels={() => { playDrop(); setShowLabels(v => !v); }}
              onHoldStart={() => { playDrop(); setHoldLabels(true); }}
              onHoldEnd={() => setHoldLabels(false)}
            />

            {/* Challenge prompt — competes with the sandbox */}
            {showPill && phase === "sandbox" && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg z-10"
                style={{ background: "rgba(247,243,232,0.90)", backdropFilter: "blur(8px)" }}
              >
                <div
                  className="bg-paper rounded-xl border border-taupe shadow-lg flex flex-col gap-6 mx-6 fade-in"
                  style={{ padding: "36px 32px", maxWidth: 340, width: "100%" }}
                >
                  <div className="flex flex-col gap-2">
                    <p className="text-3xl font-bold text-ink tracking-widest uppercase leading-tight">
                      making {CHALLENGES[0].label}.
                    </p>
                    <p className="text-sm text-ink/50 tracking-wide">clear the workspace. pick a target.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleAcceptChallenge}
                      className="text-sm px-5 py-3 rounded-lg font-bold tracking-widest uppercase transition-all active:scale-95"
                      style={{ background: "#1e6b6b", color: "#f7f3e8", fontFamily: "inherit" }}
                    >
                      take the challenge →
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissChallenge}
                      className="text-sm px-5 py-2.5 rounded-lg text-ink/50 tracking-wide hover:text-ink hover:bg-parchment transition-all active:scale-95"
                      style={{ fontFamily: "inherit" }}
                    >
                      keep exploring
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Completion overlay — competes with sandbox, clears the field */}
            {showCompletion && phase === "challenge" && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg z-10 fade-in"
                style={{ background: "rgba(247,243,232,0.92)", backdropFilter: "blur(8px)" }}
              >
                <div className="flex flex-col gap-6 items-center text-center mx-8">
                  <p className="text-3xl font-bold text-ink tracking-widest uppercase leading-tight">
                    look at what you made.
                  </p>
                  {!allDone && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="text-sm px-6 py-3 rounded-lg font-bold tracking-widest uppercase transition-all active:scale-95"
                      style={{ background: "#1e6b6b", color: "#f7f3e8", fontFamily: "inherit" }}
                    >
                      keep going →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hold state — child must tap their fraction to send it to the panel */}
            {holdingConfig && phase === "challenge" && (
              <div
                className="absolute inset-0 flex items-end justify-center pb-10 z-10"
                style={{ pointerEvents: "none" }}
              >
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="fade-in pointer-events-auto active:scale-95 transition-transform"
                  style={{
                    background: "#1e6b6b",
                    color: "#f7f3e8",
                    border: "none",
                    borderRadius: 32,
                    padding: "14px 40px",
                    fontSize: "1.8rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    boxShadow: "0 6px 28px rgba(30,107,107,0.35)",
                  }}
                >
                  {currentChallenge?.label ?? ""}
                </button>
              </div>
            )}
          </div>

          <Supply
            showLabels={effectiveShowLabels}
            excludeWhole={phase === "challenge" && !!currentChallenge && currentChallenge.target.num < currentChallenge.target.denom}
            onSpawn={handleSpawn}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            onHoldStart={() => { playDrop(); setHoldLabels(true); }}
            onHoldEnd={() => setHoldLabels(false)}
          />
        </div>

        {/* Right panel — unified scroll: challenge status + finds + sandbox discoveries */}
        <div
          className="flex flex-col min-h-0 overflow-hidden shrink-0"
          style={{
            width: panelVisible ? "32%" : "0",
            opacity: panelVisible ? 1 : 0,
            transition: "width 700ms ease-in-out, opacity 600ms ease-in-out",
          }}
        >
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
            {phase === "challenge" && (
              <div className="fade-in">
                <Challenge
                  label={currentChallenge?.label ?? ""}
                  required={required}
                  foundCount={foundCount}
                  allDone={allDone}
                />
              </div>
            )}

            {/* Challenge finds — grouped by fraction, tappable to replay */}
            {(() => {
              const groups = new Map<string, typeof challengeFinds>();
              for (const find of challengeFinds) {
                if (!groups.has(find.label)) groups.set(find.label, []);
                groups.get(find.label)!.push(find);
              }
              return Array.from(groups.entries()).map(([label, finds]) => (
                <section
                  key={label}
                  className="fade-in bg-paper rounded-lg shadow-sm border border-taupe p-4 flex flex-col gap-2"
                >
                  <header className="text-xs tracking-widest text-ink/50 uppercase border-b border-taupe pb-2">
                    making {label}
                  </header>
                  <div className="flex flex-col gap-2 pt-1">
                    {[...finds].reverse().map((find, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => dispatch({ type: "replay_config", config: find.config as import("./workspace-state").Denominator[] })}
                        className="flex flex-col gap-0.5 text-left w-full rounded-md px-2 py-1.5 -mx-2 hover:bg-parchment active:bg-parchment transition-colors"
                        aria-label="tap to show this in the workspace"
                      >
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
                      </button>
                    ))}
                  </div>
                </section>
              ));
            })()}

            <Discoveries discoveries={state.discoveries} showLabels={effectiveShowLabels} onReplay={handleReplay} />
          </div>
        </div>
      </main>

      {/* Ghost — full scale, centered on finger; hides when snap preview takes over in workspace */}
      {supplyDragPos && supplyDenomRef.current && !snapPreview && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: supplyDragPos.clientX - pieceWidth(supplyDenomRef.current) / 2,
            top: supplyDragPos.clientY - PIECE_HEIGHT / 2,
            opacity: 0.72,
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.28))",
          }}
        >
          <FractionBlock denominator={supplyDenomRef.current} showLabel={effectiveShowLabels} />
        </div>
      )}
    </div>
  );
}
