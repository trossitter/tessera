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

The UI must carry this structure. The transition from manipulation to mastery should feel like zooming out until many things become one thing — not fulfilling an assigned math task

The right-panel slide-in used during early development is a placeholder mechanism with no pedagogical meaning and should be replaced before the experience is considered complete.

## Two layers

| Layer | Tech | Role |
|---|---|---|
| **Interactive manipulative** | React 19 + TypeScript + Tailwind v4 + SVG + pointer events | The child's hands-on work: the pieces can be touched and toggled or dragged. All tiles can grid-snap or combine, . |
## removed from project 5/21| **Expository animation** | Manim Community (Python) → pre-rendered WebM, committed | Short (5–15s) precise mathematical clips at moments of revelation. Embedded as `<video>` elements. |

The interactive layer is the lesson; the expository layer reinforces in a different visual register, never re-teaches.

## Tech stack rationale

- **Vite + React 19 + TypeScript** — fast HMR for the sprint pace; type safety useful for the lesson script + state shape; well-supported on iPad Safari (required by spec).
- **Tailwind v4 via `@tailwindcss/vite`** — palette and spacing tuneable quickly during the visual identity pass; zero runtime overhead.
- **Pointer events** over mouse-only DnD libraries — uniform touch+mouse handling; cleaner than `react-dnd` for this scope.
- **SVG + divs** (not canvas) — composes naturally with React, keyboard-accessibility-friendly later, easier to style with Tailwind. Canvas reserved for if/when we need physics-feel smash animations.
- **Manim Community** — produces precise mathematical animations in the 3Blue1Brown lineage; pre-rendered videos avoid runtime Python dependency in the browser.
- **No LLM, no backend, no auth, no persistence** — spec explicitly does not require these; emphasizing *interaction quality* over technical breadth.

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


## Open decisions

- **Lesson script authorship** — who drafts the tutor's lines.
- **Sound design** — silent / subtle snap / voiced. Consideration for background music and triumph pieces when success is achieved
- **Check-for-understanding format** — Number and difficulty TBD. week long prototype explores only dyadic fractions.


## Influences

- **Maria Montessori** — self-correcting materials; trust the learner; presentation → identification → mastery.
- **bell hooks** (*Teaching to Transgress*) — refuse the banking model; tutor asks rather than declares.
- **Grant Sanderson** (3Blue1Brown / Manim) — teach above their level; visual intuition before formalism.
- ***Hilda*** (cartoon) — quiet aesthetic; muted palette; refuse the dopamine loop.
 - **Palette and type** — direction: muted, Hilda-inspired, no candy colors. Type: quiet serif for prose, sans-serif for UI. 

## Out of scope

Per spec: no LLM-based conversational agent, no multi-lesson curriculum, no learner accounts, no progress persistence, no adaptive AI, no analytics. Per design discipline: no badges, streaks, over-gamification, "Great job!" voice, candy palette.
