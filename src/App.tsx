import { useReducer, useEffect, useRef, useState } from "react";
import { Workspace } from "./components/Workspace";
import { Supply } from "./components/Supply";
import { Discoveries } from "./components/Discoveries";
import { Challenge } from "./components/Challenge";
import {
  initialWorkspace,
  workspaceReducer,
  configKey,
  pieceIdsForConfig,
  type Denominator,
  type Discovery,
} from "./workspace-state";

const GLOW_DURATION_MS = 1300;
const ENCOURAGEMENT_DURATION_MS = 3500;

const CHALLENGES = [
  { id: "half",       target: { num: 1, denom: 2 }, label: "1/2", required: 1 },
  { id: "three-qtr", target: { num: 3, denom: 4 }, label: "3/4", required: 1 },
  { id: "whole",     target: { num: 1, denom: 1 }, label: "1",   required: 1 },
] as const;

const ENCOURAGEMENTS = [
  "nice — keep going",
  "there you go — keep adding",
  "good start — keep playing",
];

function discoveryMatchesTarget(d: Discovery, target: { num: number; denom: number }): boolean {
  const targetVal = target.num / target.denom;
  const val = d.configA.reduce((s, denom) => s + 1 / denom, 0);
  return Math.abs(val - targetVal) < 1e-9;
}

type Phase = "sandbox" | "prompted" | "challenge";

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);

  // --- phase & opt-in state ---
  const [phase, setPhase] = useState<Phase>("sandbox");
  const [everPrompted, setEverPrompted] = useState(false);
  const [spawnsSinceDismiss, setSpawnsSinceDismiss] = useState(0);
  const [nudgeInterval, setNudgeInterval] = useState(50);

  // --- challenge state ---
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [pendingDiscovery, setPendingDiscovery] = useState<Discovery | null>(null);

  // --- visual fx ---
  const [glowingIds, setGlowingIds] = useState<Set<string>>(new Set());
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const encouragementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSpawnRef = useRef(false);

  // --- prompt trigger ---

  // Piece-count nudge only — fires at 50 → 25 → 12 → 6 → 3 spawns
  useEffect(() => {
    if (phase !== "sandbox") return;
    if (spawnsSinceDismiss >= nudgeInterval) {
      setPhase("prompted");
    }
  }, [spawnsSinceDismiss, nudgeInterval, phase]);

  // --- opt-in handlers ---

  const handleAcceptChallenge = () => {
    dispatch({ type: "clear" });
    setPhase("challenge");
    setEverPrompted(true);
    setSpawnsSinceDismiss(0);
  };

  const handleDismissChallenge = () => {
    setPhase("sandbox");
    setEverPrompted(true);
    setSpawnsSinceDismiss(0);
    setNudgeInterval((prev) => Math.max(3, Math.floor(prev / 2)));
  };

  // --- workspace handlers ---

  const handleSpawn = (denominator: Denominator) => {
    dispatch({ type: "spawn", denominator });
    if (phase === "sandbox") {
      setSpawnsSinceDismiss((prev) => prev + 1);
    }
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

  // Detect new discovery matching current challenge
  useEffect(() => {
    if (phase !== "challenge" || pendingDiscovery) return;
    const current = CHALLENGES[challengeIndex];
    if (!current) return;
    const acknowledged = new Set(acknowledgedIds);
    for (const d of state.discoveries) {
      if (discoveryMatchesTarget(d, current.target) && !acknowledged.has(d.id)) {
        setPendingDiscovery(d);
        return;
      }
    }
  }, [state.discoveries, phase, challengeIndex, acknowledgedIds, pendingDiscovery]);

  const handleSubmit = () => {
    if (!pendingDiscovery) return;
    const keyA = configKey(pendingDiscovery.configA);
    const keyB = configKey(pendingDiscovery.configB);
    const idsA = pieceIdsForConfig(state.pieces, keyA);
    const idsB = pieceIdsForConfig(state.pieces, keyB);
    setGlowingIds(new Set([...idsA, ...idsB]));
    if (glowTimer.current) clearTimeout(glowTimer.current);
    glowTimer.current = setTimeout(() => setGlowingIds(new Set()), GLOW_DURATION_MS);
    setAcknowledgedIds((prev) => [...prev, pendingDiscovery.id]);
    setPendingDiscovery(null);
  };

  const handleNext = () => {
    const nextIdx = challengeIndex + 1;
    dispatch({ type: "clear" });
    if (nextIdx < CHALLENGES.length) {
      const nextChallenge = CHALLENGES[nextIdx];
      const autoAck = state.discoveries
        .filter((d) => discoveryMatchesTarget(d, nextChallenge.target))
        .map((d) => d.id);
      setAcknowledgedIds(autoAck);
    } else {
      setAcknowledgedIds([]);
    }
    setChallengeIndex(nextIdx);
    setPendingDiscovery(null);
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
  const foundCount = acknowledgedIds.length;
  const challengeComplete = !allDone && !pendingDiscovery && foundCount >= required;
  const panelVisible = phase === "challenge" || state.discoveries.length > 0;

  return (
    <div className="h-full flex flex-col bg-parchment">
      <header className="flex items-center gap-3 px-5 py-2.5 border-b border-taupe/50">
        <img
          src="/assets/tessera3.png"
          alt=""
          aria-hidden
          className="w-8 h-8 rounded-md object-cover"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
        />
        <span
          className="text-base font-semibold"
          style={{ color: "#1a2e2a", letterSpacing: "0.06em" }}
        >
          tessera
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

            {/* Challenge opt-in overlay */}
            {phase === "prompted" && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg z-10"
                style={{
                  background: "rgba(247,243,232,0.82)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <div
                  className="bg-paper rounded-xl border border-taupe shadow-md flex flex-col gap-5 mx-4"
                  style={{ padding: "28px 28px", maxWidth: 300, width: "100%" }}
                >
                  <p className="text-lg text-ink font-medium leading-snug">
                    {everPrompted
                      ? "you deserve a challenge."
                      : "ready for a challenge?"}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleAcceptChallenge}
                      className="text-sm px-4 py-2.5 rounded-md font-medium transition-all active:scale-95"
                      style={{ background: "#1e6b6b", color: "#f7f3e8" }}
                    >
                      take the challenge
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissChallenge}
                      className="text-sm px-4 py-2.5 rounded-md text-ink/60 hover:text-ink hover:bg-parchment transition-all active:scale-95"
                    >
                      keep exploring
                    </button>
                  </div>
                </div>
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
                canSubmit={!!pendingDiscovery && !challengeComplete}
                complete={challengeComplete}
                allDone={allDone}
                onSubmit={handleSubmit}
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
