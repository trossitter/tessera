import { FractionBox } from "./components/FractionBox";
import { ChatTutor } from "./components/ChatTutor";

export default function App() {
  return (
    <div className="h-full flex flex-col bg-amber-50">
      <header className="px-6 py-3 bg-white border-b border-amber-200">
        <h1 className="text-xl font-semibold text-amber-900">Fraction Friends</h1>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-4 min-h-0">
        <FractionBox />
        <ChatTutor />
      </main>
    </div>
  );
}
