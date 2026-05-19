import { useReducer } from "react";
import { Workspace } from "./components/Workspace";
import { Supply } from "./components/Supply";
import { ChatTutor } from "./components/ChatTutor";
import {
  initialWorkspace,
  workspaceReducer,
  type Denominator,
} from "./workspace-state";

export default function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);

  const handleSpawn = (denominator: Denominator) => {
    const offset = ((state.nextId - 1) % 12) * 16;
    dispatch({
      type: "spawn",
      denominator,
      x: 40 + offset,
      y: 40 + offset,
    });
  };

  const handleMove = (id: string, x: number, y: number) => {
    dispatch({ type: "move", id, x, y });
  };

  return (
    <div className="h-full flex flex-col bg-parchment">
      <header className="px-6 py-3 border-b border-taupe">
        <span className="text-xs tracking-widest text-ink/50 uppercase">
          tessera
        </span>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          <Workspace pieces={state.pieces} onMove={handleMove} />
          <Supply onSpawn={handleSpawn} />
        </div>
        <ChatTutor />
      </main>
    </div>
  );
}
