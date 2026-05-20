# Tessera — Architecture (Draft)

> _Draft, 2026-05-18. Decisions captured to date; expected to evolve through the week._

## What this is

Tessera is a single-lesson web app teaching **fraction equivalence** to 9–11 year olds — the inverse of the typical edtech submission. It refuses condescension, trusts the learner, and lets materials carry the meaning. Sprint duration: one week (2026-05-18 → ~05-24).

## Pedagogical principle

**Concept before symbol.** Equivalence is taught as area preservation, discovered through manipulation of pieces, *before* any numerator/denominator notation enters. Three-period lesson sequence (Montessori): presentation → identification → demonstration of mastery.

This inverts the American standard, which front-loads notation and procedure before intuition. That ordering is part of why fractions tend to feel harder than they need to be — by 4th grade, the notation arrives stale, attached to procedures memorized rather than understood. 9–11 is on the older end of the international range for fraction equivalence (Singapore Math: ~age 9; Montessori fraction insets: ages 5–6); the late introduction is symptomatic, not necessary.

## Compression to point

The lesson has a direction: from complexity to simplicity. The child begins in open exploration — many pieces, many arrangements, many possible moves. As understanding arrives, that complexity should visibly resolve.

**The wrong shape:** a side panel slides in, appending discoveries to the right. The workspace shrinks. The child now sees *more* on screen, not less. This is the shape of accumulation, not insight.

**The right shape:** when the lesson concludes, the entire context compresses into a single point — one equation, one symbol, the insight distilled. The workspace does not acquire a sidebar; it collapses. The child sees *less* on screen, which is the shape of understanding.

This is how mathematics actually works. Infinite line segments, individually meaningless, can be held all at once as a single plane. A proof that requires twenty lemmas is eventually apprehended as one idea. Equivalence — 1/2 = 2/4 = 4/8 — is many arrangements resolved into one relationship.

The UI must carry this structure. The transition from manipulation to mastery should feel like zooming out until many things become one thing — not like opening a drawer.

**Implementation intent:** at lesson completion, the workspace does not gain a panel. It transitions — full screen — to the resolved form: the equivalence chain, large, centered, still. The manipulative has done its work and recedes. This is not a modal or a side panel; it is the lesson arriving at its destination.

The right-panel slide-in used during early development is a placeholder mechanism with no pedagogical meaning and should be replaced before the experience is considered complete.

## Two layers

| Layer | Tech | Role |
|---|---|---|
| **Interactive manipulative** | React 19 + TypeScript + Tailwind v4 + SVG + pointer events | The child's hands-on work: drag, snap, combine, split fraction pieces. |
| **Expository animation** | Manim Community (Python) → pre-rendered WebM, committed | Short (5–15s) precise mathematical clips at moments of revelation. Embedded as `<video>` elements. |

The interactive layer is the lesson; the expository layer reinforces in a different visual register, never re-teaches.

## Tech stack rationale

- **Vite + React 19 + TypeScript** — fast HMR for the sprint pace; type safety useful for the lesson script + state shape; well-supported on iPad Safari (required by spec).
- **Tailwind v4 via `@tailwindcss/vite`** — palette and spacing tuneable quickly during the visual identity pass; zero runtime overhead.
- **Pointer events** over mouse-only DnD libraries — uniform touch+mouse handling; cleaner than `react-dnd` for this scope.
- **SVG + divs** (not canvas) — composes naturally with React, keyboard-accessibility-friendly later, easier to style with Tailwind. Canvas reserved for if/when we need physics-feel smash animations.
- **Manim Community** — produces precise mathematical animations in the 3Blue1Brown lineage; pre-rendered videos avoid runtime Python dependency in the browser.
- **No LLM, no backend, no auth, no persistence** — spec explicitly does not require these; sprint emphasizes *interaction quality* over technical breadth.

## State model

In-memory only, session-scoped. Approximate shape:

```ts
type Block = {
  id: string;
  numerator: number;
  denominator: number;
  position: { x: number; y: number };
};
type LessonPhase = "exploration" | "identification" | "mastery" | "complete";
type State = {
  blocks: Block[];
  phase: LessonPhase;
  scriptIndex: number; // pointer into scripted dialogue
};
```

Reducer over user actions (`drag`, `combine`, `split`, `advanceScript`, ...). No global store — `useReducer` at the App level is sufficient.

## Self-correcting materials

Wrong combinations are not flagged with text. The geometry refuses incorrect equivalences: pieces that don't sum to a known fraction simply don't snap into the unit-whole anchor. The child notices through manipulation, not corrective feedback. No "incorrect!" alert; no sad sound.

## Manim integration

```
tessera/
  manim/
    .venv/                       ← Python virtualenv (gitignored)
    scenes/
      half_equals_two_quarters.py
      ...
  public/animations/
    half_equals_two_quarters.webm  ← rendered, committed to repo
```

Render: `cd manim && source .venv/bin/activate && manim -ql scenes/<file>.py <SceneName>`.
Output is moved into `public/animations/` and referenced by the React app via `<video src="/animations/...webm" />`.

Planned scenes (3–5 clips total):
1. **`half_equals_two_quarters`** — 1/2 dissolves into 2/4 by area preservation.
2. **`half_equals_four_eighths`** — extending the same idea once more.
3. **`one_third_not_two_quarters`** — negative example: the pieces don't fit.
4. _(optional)_ **`generating_equivalents`** — doubling: split each piece in half, get an equivalent fraction.
5. _(optional)_ **`family_of_half`** — the chain 1/2 = 2/4 = 4/8 laid out together.

## Open decisions

- **Palette and type** — direction: muted, Hilda-inspired, no candy colors. Type: quiet serif for prose, sans-serif for UI. Specifics TBD.
- **Lesson script authorship** — who drafts the tutor's lines.
- **Sound design** — silent / subtle snap / voiced. Default position: silent, with optional subtle snap on piece-fit.
- **Check-for-understanding format** — manipulation-based ("show me three ways to make 3/4"), not multiple choice. Number and difficulty TBD.
- **Wordmark/header presentation** — quiet lowercase "tessera" vs. no wordmark.

## Influences

- **Maria Montessori** — self-correcting materials; trust the learner; presentation → identification → mastery.
- **bell hooks** (*Teaching to Transgress*) — refuse the banking model; tutor asks rather than declares.
- **Grant Sanderson** (3Blue1Brown / Manim) — teach above their level; visual intuition before formalism.
- ***Hilda*** (cartoon) — quiet aesthetic; muted palette; refuse the dopamine loop.

## Out of scope

Per spec: no LLM-based conversational agent, no multi-lesson curriculum, no learner accounts, no progress persistence, no adaptive AI, no analytics. Per design discipline: no badges, streaks, gamification, "Great job!" voice, candy palette.
