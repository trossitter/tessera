import { useReducer, useEffect } from "react";
import { Workspace } from "./components/Workspace";
import { Supply } from "./components/Supply";
import { Ascent } from "./components/Ascent";
import {
  initialWorkspace,
  workspaceReducer,
  type Denominator,
} from "./workspace-state";

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);

  const handleSpawn = (denominator: Denominator) => {
    const offset = ((state.nextId - 1) % 12) * 16;
    dispatch({ type: "spawn", denominator, x: 40 + offset, y: 40 + offset });
  };
  const handleMove = (id: string, x: number, y: number) => {
    dispatch({ type: "move", id, x, y });
  };

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
          />
          <Supply onSpawn={handleSpawn} />
        </div>
        <Ascent discoveries={state.discoveries} />
      </main>
    </div>
  );
}
