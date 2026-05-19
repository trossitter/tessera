import { FractionBox } from "./components/FractionBox";
import { ChatTutor } from "./components/ChatTutor";

export default function App() {
  return (
    <div className="h-full flex flex-col bg-parchment">
      <header className="px-6 py-3 border-b border-taupe">
        <span className="text-xs tracking-widest text-ink/50 uppercase">tessera</span>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-4 min-h-0">
        <FractionBox />
        <ChatTutor />
      </main>
    </div>
  );
}
