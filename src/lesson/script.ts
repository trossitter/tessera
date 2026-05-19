/**
 * Tessera — lesson script for fraction equivalence.
 *
 * Design principles in effect (see ../../ARCHITECTURE.md):
 *   - Concept before symbol: the child manipulates pieces and discovers
 *     equivalence physically before any notation enters.
 *   - The guide asks more than it declares.
 *   - The guide is silent until the child has begun.
 *   - Mastery is shown through manipulation, not multiple choice.
 *
 * Each Phase carries one or more guide lines (shown as separate bubbles)
 * and an optional Manim cue. Phase transitions are wired in the lesson
 * engine, not here.
 */

export type ManimCue =
  | "half_equals_two_quarters"
  | "half_equals_four_eighths"
  | "one_third_not_two_quarters";

export type LessonEvent =
  | "first_interaction"
  | "discovered_half_equals_two_quarters"
  | "task_complete";

export type AdvanceTrigger =
  | { kind: "after_event"; event: LessonEvent }
  | { kind: "user_ready" };

export type Phase = {
  id: string;
  guideLines: string[];
  manimCue?: ManimCue;
  advance: AdvanceTrigger;
};

export const LESSON_SCRIPT: Phase[] = [
  {
    id: "silence",
    guideLines: [],
    advance: { kind: "after_event", event: "first_interaction" },
  },
  {
    id: "exploration_prompt",
    guideLines: ["What do you notice?"],
    advance: { kind: "after_event", event: "discovered_half_equals_two_quarters" },
  },
  {
    id: "naming",
    guideLines: [
      "You found two pieces that fit the same space as one.",
      "That sameness has a name. It's called equivalence.",
    ],
    advance: { kind: "user_ready" },
  },
  {
    id: "notation",
    guideLines: [
      "We could write the larger piece as 1/2.",
      "The two smaller pieces, together, as 2/4.",
      "Watch.",
    ],
    manimCue: "half_equals_two_quarters",
    advance: { kind: "user_ready" },
  },
  {
    id: "notation_aside",
    guideLines: ["Same amount of space. A different way of writing it."],
    advance: { kind: "user_ready" },
  },
  {
    id: "practice",
    guideLines: ["Show me three different ways to make 3/4 of the whole."],
    advance: { kind: "after_event", event: "task_complete" },
  },
  {
    id: "complete",
    guideLines: ["Look at what you made."],
    advance: { kind: "user_ready" },
  },
];
