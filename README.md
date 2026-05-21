# Tessera

Tessera is a fraction equivalence manipulative for children ages 9–11. Students drag colored tiles representing whole, half, quarter, and eighth pieces onto a workspace, build arrangements, and discover equivalences visually — before any notation enters.

It runs in the browser and is designed to work on iPad with touch or Apple Pencil. There is no backend, no authentication, and no persistent storage.

Live: [tessera-nu-self.vercel.app](https://tessera-nu-self.vercel.app)

## What it teaches

Fraction equivalence through area preservation. Two arrangements that occupy the same horizontal span are equivalent — the child sees this before the symbols 1/2 or 2/4 are introduced. The lesson follows a Montessori three-period sequence: open exploration → identification → demonstration of mastery.

## Running locally

```bash
npm install
npm run dev
```

The app starts on `http://localhost:5173`. No environment variables are needed.

## Building for production

```bash
npm run build
```

Output lands in `dist/`. The app is a static site; any static host works. Vercel is the current deployment target — push to `main` and Vercel picks it up automatically.

## Project structure

```
src/
  App.tsx                  — top-level layout, phase logic, all event wiring
  workspace-state.ts       — data model, reducer, discovery detection
  sounds.ts                — Web Audio API sound generation
  index.css                — Tailwind theme + named animation classes
  lesson/
    script.ts              — guide voice lines and phase advance triggers
  components/
    Workspace.tsx          — canvas container + toolbar (clear, undo/redo, label toggle)
    Supply.tsx             — tile tray at bottom; tap to spawn, drag to place
    Piece.tsx              — draggable tile on the workspace; tap to remove
    FractionBlock.tsx      — colored rectangle, optionally labeled
    Discoveries.tsx        — sandbox equivalence panel (right side)
    SortableFinds.tsx      — challenge find cards, tappable + drag-to-reorder
    Challenge.tsx          — challenge status header in right panel
public/
  assets/
    tessera3.png           — mosaic tile image used in header and entrance animation
```

## Tech stack

React 19 + TypeScript + Vite. Tailwind v4 via `@tailwindcss/vite`. No DnD library — all drag-and-drop is implemented with pointer events directly. No external audio files — all sounds are synthesized via the Web Audio API at runtime.

## Key interactions

**Tap a supply tile** — spawns a piece into the next open workspace slot.

**Drag a supply tile** — shows a live snap preview in the workspace; releases piece at that position.

**Tap a workspace piece** — removes it (short tap, under 250ms, under 10px travel).

**Drag a workspace piece** — moves it; snaps to an 80×64px grid during drag.

**Hold any piece or supply tile for 2 seconds** — fraction labels appear on all pieces while held; releasing hides them. The ½ toolbar button pulses gold during a hold.

**½ toolbar button** — toggles fraction labels on/off persistently. Always has a visible border.

**Discoveries panel** — appears when the first equivalence is found. Tap any row to replay that arrangement in the workspace.

**Challenge finds** — tap a card to append that configuration to the next empty row. Drag to reorder within a group.

**Header logo (mosaic image)** — tapping it reloads the page.

**"tessera" header text** — tapping it clears the sandbox.

**Lesson guide card** — shows the guide's current line. Tap anywhere on the card to advance to the next line or phase.

## Challenge arc

After the sandbox phase (triggered by filling the workspace or finding two distinct ways to make 1), the child is offered a challenge sequence:

1. Find one way to make 3/4
2. Find two ways to make 3/4
3. Find three ways to make 1/2

Each time a filled row matches the target, the matching pieces pulse continuously. A fraction pill appears at the bottom of the workspace — the child taps it to acknowledge and send the find to the right panel. The workspace clears after acknowledgment.

## Development notes

Undo and redo are supported via Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z. The workspace state keeps a full past/future snapshot stack. Discovery records are append-only and are never rolled back by undo — a child never loses what they found.

`seenConfigs` in workspace state is similarly append-only: it tracks every distinct filled-row configuration the child has ever built, independent of undo state.
