import { useReducer, useEffect, useState } from "react";
import { Workspace } from "./components/Workspace";
import { Supply } from "./components/Supply";
import { Discoveries } from "./components/Discoveries";
import { Challenge } from "./components/Challenge";
import {
  initialWorkspace,
  workspaceReducer,
  type Denominator,
} from "./workspace-state";

const CHALLENGE_TOUCH_THRESHOLD = 8;
const CHALLENGE_TIME_THRESHOLD_MS = 90 * 1000;

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [challengeActive, setChallengeActive] = useState(false);

  const handleSpawn = (denominator: Denominator) => {
    dispatch({ type: "spawn", denominator });
  };
  const handleMove = (id: string, x: number, y: number) => {
    dispatch({ type: "move", id, x, y });
  };

  useEffect(() => {
    if (challengeActive) return;
    const timer = setTimeout(
      () => setChallengeActive(true),
      CHALLENGE_TIME_THRESHOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [challengeActive]);

  useEffect(() => {
    if (!challengeActive && state.touchCount >= CHALLENGE_TOUCH_THRESHOLD) {
      setChallengeActive(true);
    }
  }, [state.touchCount, challengeActive]);

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

  return (
    <div className="h-full flex flex-col bg-parchment">
      <header className="px-6 py-3 border-b border-taupe">
        <span className="text-xs tracking-widest text-ink/50 uppercase">
          tessera
        </span>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          <Workspace
            pieces={state.pieces}
            canUndo={state.past.length > 0}
            canRedo={state.future.length > 0}
            onMove={handleMove}
            onUndo={() => dispatch({ type: "undo" })}
            onRedo={() => dispatch({ type: "redo" })}
            onClear={() => dispatch({ type: "clear" })}
          />
          <Supply onSpawn={handleSpawn} />
        </div>
        <div className="flex flex-col gap-4 min-h-0">
          {challengeActive && <Challenge discoveries={state.discoveries} />}
          <Discoveries discoveries={state.discoveries} />
        </div>
      </main>
    </div>
  );
}
