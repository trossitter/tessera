export function ChatTutor() {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4 flex flex-col min-h-0">
      <h2 className="text-sm font-medium text-amber-800 mb-2">Tutor</h2>
      <div className="flex-1 overflow-y-auto space-y-2 text-sm">
        <div className="bg-amber-100 rounded-xl px-3 py-2 max-w-[90%]">
          Hi! I'm so glad you're here. Today we're going to play with fractions.
        </div>
        <div className="bg-amber-100 rounded-xl px-3 py-2 max-w-[90%]">
          Look at the fraction box. Can you find two pieces that together make the same as one half?
        </div>
      </div>
      <div className="mt-2 text-xs text-amber-700">[interactions coming day 3]</div>
    </section>
  );
}
