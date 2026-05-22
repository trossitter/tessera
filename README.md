# Tessera

A fraction equivalence manipulative for children ages 9–11. Students arrange colored tiles — whole, half, quarter, eighth — and discover that different arrangements can occupy the same space. The equivalence comes first. The notation comes later.

Runs in the browser. Designed for iPad touch. No backend, no accounts, no data leaves the device.

**Live:** [tessera-nu-self.vercel.app](https://tessera-nu-self.vercel.app)

---

## The idea

Most fraction curricula introduce the symbol before the concept. Tessera inverts this: a child builds 2/4 next to 1/2, sees them span the same width, and the equation surfaces from the observation — not the other way around. The challenge sequence that follows gives that intuition somewhere to go.

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. No environment variables needed.

To build for production:

```bash
npm run build
```

Output lands in `dist/`. Push to `main` and Vercel deploys automatically.

## Stack

React 19 + TypeScript + Vite. Tailwind v4. All drag-and-drop via pointer events — no DnD library. All sound synthesized at runtime via the Web Audio API.

## Structure

```
src/
  App.tsx               — layout, phase logic, event wiring
  workspace-state.ts    — data model and reducer
  sounds.ts             — synthesized audio
  lesson/script.ts      — guide voice and phase transitions
  components/           — Workspace, Supply, Piece, FractionBlock,
                          Discoveries, SortableFinds, Challenge
```
