# Tessera — Architecture

## What this is

Tessera is a single-lesson web app that teaches fraction equivalence to children ages 9–11. It is a browser-based manipulative: the child drags colored tiles, builds arrangements, and discovers that different configurations can occupy the same space. Notation (1/2, 2/4) enters only after the child has seen the physical relationship.

Sprint duration: one week (2026-05-18 → ~05-24). No backend. No persistence. No auth.

## Pedagogical design

**Concept before symbol.** The workspace enforces no rules about correct combinations. A child can put any tiles anywhere. Equivalence emerges when two arrangements happen to span the same width — the child sees it. Only then does the guide name it, and only later does the notation appear.

The lesson script follows a Montessori three-period structure: presentation (guided observation), identification (the child names it), demonstration of mastery (challenge arc). The guide asks more than it declares. It is silent until the child has placed their first piece.

**Compression to point.** The lesson has a direction: many pieces → one insight. The challenge phase reinforces this: each acknowledgment clears the workspace and sends a small record to the right panel. The workspace shrinks toward a single relationship, not toward more content. This is the right shape for understanding — not accumulation.

**No corrective feedback.** There are no wrong answers flagged with text or sound. The geometry carries all the information: tiles that don't sum to the target fraction simply don't match, and the child knows by looking.

## Tech stack

- **React 19 + TypeScript + Vite** — fast HMR for sprint pace; type safety for the state shape.
- **Tailwind v4 via `@tailwindcss/vite`** — all tokens defined in `src/index.css` under `@theme`; no tailwind config file needed.
- **Pointer events** throughout — no DnD library. Touch and mouse are handled identically via `onPointerDown / onPointerMove / onPointerUp / onPointerCancel`. All draggable elements call `setPointerCapture` on `pointerdown` so move and up events don't leak if the finger leaves the element.
- **Web Audio API** — all sounds are synthesized at runtime; no audio files are shipped or fetched.
- **No external state manager** — `useReducer` at the `App` level is sufficient; all state passes down as props.

## Coordinate system

The workspace canvas is always 640px wide (`WHOLE_WIDTH`), centered horizontally inside its container. All piece positions are in this coordinate space. The grid snaps to 80px horizontal (`SNAP_X`) and 64px vertical (`SNAP_Y`).

Piece dimensions:

```
width  = WHOLE_WIDTH / denominator   (640, 320, 160, 80 for 1, 2, 4, 8)
height = PIECE_HEIGHT = 56px
```

Rows are addressed by their Y coordinate. The valid row range is `SNAP_Y` (64) through `SNAP_Y * 8` (512). A piece reaching `y >= LAST_ROW_Y` (512) triggers the challenge pill.

## Data model

All state lives in `src/workspace-state.ts`.

```ts
type Denominator = 1 | 2 | 4 | 8;

type Piece = {
  id: string;
  denominator: Denominator;
  x: number;   // snapped to SNAP_X grid
  y: number;   // snapped to SNAP_Y grid
};

type Discovery = {
  id: string;
  configA: number[];  // sorted denominators of the smaller-piece row
  configB: number[];  // sorted denominators of the larger-piece row
};

type Snapshot = {
  pieces: Piece[];
  nextId: number;
  discoveries: Discovery[];
};

type WorkspaceState = Snapshot & {
  past: Snapshot[];      // undo stack
  future: Snapshot[];    // redo stack
  touchCount: number;
  seenConfigs: string[]; // append-only; every filled-row configKey ever built
};
```

`seenConfigs` is never rolled back by undo — it represents what the child has encountered, not the current workspace state. Discoveries are similarly append-only: a found equivalence is never removed even if the child undoes the arrangement that produced it.

## Reducer actions

`workspaceReducer` handles:

- `spawn` — place a piece in the next available slot (three-pass algorithm: same-denom row → any row → new row)
- `spawn_at` — place a piece at an explicit snapped coordinate (used by supply drag)
- `move` — snap-move an existing piece
- `remove` — delete a piece
- `clear` — remove all pieces, preserving discoveries and seenConfigs
- `replay` — reconstruct two rows from a `Discovery` object (sandbox replay)
- `replay_config` — append a configuration to the next empty row (challenge finds replay, additive)
- `undo` / `redo` — walk the past/future snapshot stack

Every mutating action calls `applyMutation`, which re-runs discovery detection and updates `seenConfigs`.

## Discovery detection

`detectDiscoveries(pieces)` in `workspace-state.ts`:

1. Groups pieces by Y coordinate.
2. For each row, computes `minX`, `maxX`, and checks whether pieces are contiguous (sum of widths equals `maxX − minX`). Rows that pass this test are "filled."
3. Compares all pairs of filled rows. A discovery is recorded when two rows share the same `minX` and `maxX` (identical horizontal span) but have different sorted denominator configs.
4. The discovery ID is the two sorted config keys joined with ` = `, which ensures uniqueness and deduplication.

A `configKey` is the sorted denominator array joined by commas: `"2,4,4"`.

## Phase model

`App.tsx` maintains two parallel phase concepts:

**`phase: "sandbox" | "challenge"`** — the broad mode. Sandbox allows free exploration; challenge restricts spawn (no whole-piece tile) and activates the challenge detection loop.

**`lessonPhase: number`** — indexes into `LESSON_SCRIPT` in `src/lesson/script.ts`. Each phase has `guideLines` (the guide's voice, shown one at a time) and an `advance` trigger (either a `user_ready` tap or an automatic event like `discovered_half_equals_two_quarters`).

The two are mostly independent: the lesson engine advances based on what the child does, while the sandbox/challenge phase is driven by explicit opt-in (the challenge pill).

## Challenge arc

Three challenges defined in `App.tsx`:

```ts
{ id: "three-qtr-compose", target: { num: 3, denom: 4 }, label: "3/4", required: 1 }
{ id: "three-qtr-equiv",   target: { num: 3, denom: 4 }, label: "3/4", required: 2 }
{ id: "half-exhaust",      target: { num: 1, denom: 2 }, label: "1/2", required: 3 }
```

Detection runs on every `state.pieces` change. When a filled row sums to the target value within floating-point tolerance (`< 1e-9`) and its configKey hasn't already been credited in this challenge, the app enters **hold state**:

- Matching pieces receive `pulsingIds` (infinite gold glow animation, not a one-shot).
- A large fraction pill appears at the bottom of the workspace.
- All drag/remove interactions are suppressed while holding.

The child taps the pill to acknowledge. This:
1. Plays `playSnap`.
2. Adds the config to `challengeCredits` and `challengeFinds`.
3. Clears `holdingConfig`.
4. After a 1.3-second glow, clears the workspace. If the required count is met, shows the completion overlay.

## Supply drag

Supply tiles support both tap (spawn to grid) and drag (place at exact position). The distinction is handled entirely in `Supply.tsx` using a 6px movement threshold. Pointer capture is set on `pointerdown`.

While dragging, `App.tsx` computes a `snapPreview`: the snapped grid position where the piece would land if released at the current cursor position, projected into workspace coordinates. The preview renders as a semi-transparent `FractionBlock` inside the canvas. The full-scale ghost (centered on the finger) hides when the preview is showing inside the workspace.

## Hold-to-peek (fraction labels)

Two label states coexist:

- `showLabels` — persistent toggle via the ½ toolbar button.
- `holdLabels` — active while any piece or supply tile is held for ≥ 2000ms.

The effective state is `effectiveShowLabels = showLabels || holdLabels`. The ½ button renders differently for each state: always-visible border (default), `bg-ink/10` (persistent on), or `label-button-active` pulsing gold animation (hold active).

Both `Piece.tsx` and `Supply.tsx` independently implement the hold timer and fire `onHoldStart` / `onHoldEnd` callbacks that propagate to `App`.

## Sound system

`src/sounds.ts` maintains a single shared `AudioContext` instance (`_ctx`). All sounds are procedurally generated:

- `playDrop(volume)` — 12ms shaped noise burst, bandpass filter at 2800 Hz. Used for the label toggle and hold-to-peek activation. Quiet mechanical click.
- `playSnap(volume)` — 70ms noise burst with exponential decay. Used for challenge acknowledgment moments.

The shared context eliminates the first-press inconsistency caused by creating a new `AudioContext` per call. Context is resumed if suspended (browser autoplay policy).

## CSS animations

All animations are defined by name in `src/index.css` and applied as utility classes:

- `fade-in` — elements entering the DOM (guide cards, overlays, panels)
- `piece-glowing` — one-shot gold glow, 1.3s, plays when a piece is credited
- `piece-glowing-hold` — infinite pulsing gold glow, plays while hold state is active (challenge pieces waiting for acknowledgment)
- `label-button-active` — infinite gold pulse on the ½ button during hold-to-peek
- `encouragement-toast` — fade-in-out, 3.5s total, for first-spawn nudge
- `entrance-tl/tr/bl/br` — four quadrant fly-in animations that compose the entrance splash

## Component tree

```
App
├── Entrance overlay (fixed, z-50; tap to skip)
├── Header
│   ├── Logo img (tap → page reload)
│   └── "tessera" span (tap → clear)
├── Main (flex row)
│   ├── Left column (flex column)
│   │   ├── Lesson guide card (tap anywhere → advance)
│   │   ├── Workspace
│   │   │   ├── Toolbar (clear, undo, redo, ½ toggle)
│   │   │   ├── Canvas (640px, relative positioned)
│   │   │   │   ├── Encouragement toast
│   │   │   │   ├── Piece × N (absolute, pointer-event drag/tap)
│   │   │   │   └── Snap preview (absolute, pointer-events none)
│   │   │   ├── Challenge pill overlay (showPill)
│   │   │   ├── Completion overlay (showCompletion)
│   │   │   └── Acknowledgment pill (holdingConfig)
│   │   └── Supply (tap or drag to add tiles)
│   └── Right panel (animated width: 0 → 32%)
│       ├── Challenge (status header)
│       ├── SortableFinds × label groups (finds from challenge)
│       └── Discoveries (sandbox equivalences)
└── Supply ghost (fixed, z-50; visible during drag outside canvas)
```

## Palette

Defined as CSS custom properties under `@theme` in `src/index.css`:

| Token | Value | Use |
|---|---|---|
| `paper` | `#f8f5ee` | Card and workspace backgrounds |
| `parchment` | `#ede8d8` | App background, hover states |
| `ink` | `#1a2e2a` | All text |
| `taupe` | `#c4b89e` | Borders, dividers |
| `gold` | `#b8882a` | Glow and pulse accents |
| `whole` | `#c07840` | Terracotta — whole piece |
| `half` | `#216858` | Deep forest teal — half piece |
| `quarter` | `#e8d5c4` | Warm blush — quarter piece |
| `eighth` | `#78c4ba` | Sky teal — eighth piece |

## Influences on design decisions

- **Maria Montessori** — self-correcting materials; presentation → identification → mastery.
- **bell hooks** (*Teaching to Transgress*) — the guide asks rather than declares; refuses the banking model.
- **Grant Sanderson** (3Blue1Brown) — visual intuition before formalism.
- ***Hilda*** (cartoon) — muted palette, quiet aesthetic, no candy colors, no dopamine loops.

## Out of scope

No LLM, no backend, no auth, no analytics, no persistence, no adaptive AI, no badges or streaks, no multi-lesson curriculum. These are not deferrals — they are design choices.
