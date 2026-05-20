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

const CHALLENGE_TIME_THRESHOLD_MS = 60 * 1000;
const GLOW_DURATION_MS = 1300;

// required = how many distinct equivalences the child must find to advance
const CHALLENGES = [
  { id: "half",      target: { num: 1, denom: 2 }, label: "1/2", required: 1 },
  { id: "three-qtr", target: { num: 3, denom: 4 }, label: "3/4", required: 1 },
  { id: "whole",     target: { num: 1, denom: 1 }, label: "1",   required: 1 },
] as const;

function discoveryMatchesTarget(
  d: Discovery,
  target: { num: number; denom: number },
): boolean {
  const targetVal = target.num / target.denom;
  const val = d.configA.reduce((s, denom) => s + 1 / denom, 0);
  return Math.abs(val - targetVal) < 1e-9;
}

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  // IDs of discoveries the child has consciously submitted for the current challenge
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [pendingDiscovery, setPendingDiscovery] = useState<Discovery | null>(null);
  const [glowingIds, setGlowingIds] = useState<Set<string>>(new Set());
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSpawn = (denominator: Denominator) => {
    dispatch({ type: "spawn", denominator });
  };
  const handleMove = (id: string, x: number, y: number) => {
    dispatch({ type: "move", id, x, y });
  };
  const handleReplay = (discovery: Discovery) => {
    dispatch({ type: "replay", discovery });
  };

  // Challenge activates on first discovery, or after 60s fallback
  useEffect(() => {
    if (challengeActive) return;
    const timer = setTimeout(() => setChallengeActive(true), CHALLENGE_TIME_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [challengeActive]);

  useEffect(() => {
    if (!challengeActive && state.discoveries.length > 0) {
      setChallengeActive(true);
    }
  }, [state.discoveries.length, challengeActive]);

  // Detect a new discovery that matches the current challenge
  useEffect(() => {
    if (!challengeActive || pendingDiscovery) return;
    const current = CHALLENGES[challengeIndex];
    if (!current) return;
    const acknowledged = new Set(acknowledgedIds);
    for (const d of state.discoveries) {
      if (discoveryMatchesTarget(d, current.target) && !acknowledged.has(d.id)) {
        setPendingDiscovery(d);
        return;
      }
    }
  }, [state.discoveries, challengeActive, challengeIndex, acknowledgedIds, pendingDiscovery]);

  const handleSubmit = () => {
    if (!pendingDiscovery) return;
    // Glow both rows that formed the discovery
    const keyA = configKey(pendingDiscovery.configA);
    const keyB = configKey(pendingDiscovery.configB);
    const idsA = pieceIdsForConfig(state.pieces, keyA);
    const idsB = pieceIdsForConfig(state.pieces, keyB);
    setGlowingIds(new Set([...idsA, ...idsB]));
    if (glowTimer.current) clearTimeout(glowTimer.current);
    glowTimer.current = setTimeout(() => setGlowingIds(new Set()), GLOW_DURATION_MS);
    setAcknowledgedIds(prev => [...prev, pendingDiscovery.id]);
    setPendingDiscovery(null);
  };

  const handleNext = () => {
    const nextIdx = challengeIndex + 1;
    const nextChallenge = CHALLENGES[nextIdx];
    if (nextChallenge) {
      // Auto-acknowledge discoveries already found for the next challenge
      const autoAck = state.discoveries
        .filter(d => discoveryMatchesTarget(d, nextChallenge.target))
        .map(d => d.id);
      setAcknowledgedIds(autoAck);
    } else {
      setAcknowledgedIds([]);
    }
    setChallengeIndex(nextIdx);
    setPendingDiscovery(null);
  };

  // Keyboard undo/redo
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

  const panelVisible = challengeActive || state.discoveries.length > 0;

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
        <span className="text-base font-semibold" style={{ color: "#1a2e2a", letterSpacing: "0.06em" }}>
          tessera
        </span>
      </header>
      <main className="flex-1 flex gap-4 p-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0 flex-1 min-w-0">
          <Workspace
            pieces={state.pieces}
            glowingIds={glowingIds}
            canUndo={state.past.length > 0}
            canRedo={state.future.length > 0}
            onMove={handleMove}
            onUndo={() => dispatch({ type: "undo" })}
            onRedo={() => dispatch({ type: "redo" })}
            onClear={() => dispatch({ type: "clear" })}
          />
          <Supply onSpawn={handleSpawn} />
        </div>

        <div
          className="flex flex-col gap-4 min-h-0 overflow-hidden shrink-0"
          style={{
            width: panelVisible ? "32%" : "0",
            opacity: panelVisible ? 1 : 0,
            transition: "width 700ms ease-in-out, opacity 600ms ease-in-out",
          }}
        >
          {challengeActive && (
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
