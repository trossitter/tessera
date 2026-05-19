"""
Tessera — fraction-equivalence expository clips.

Render:
    cd tessera/manim
    source .venv/bin/activate
    manim -ql scenes/half_equals_two_quarters.py HalfEqualsTwoQuarters

Output lands in media/videos/.../<SceneName>.mp4 by default.
Final clips are exported as .webm and moved to tessera/public/animations/
for the React app to embed via <video> elements.
"""

from manim import (
    Scene,
    Rectangle,
    Create,
    Transform,
    VGroup,
    LEFT,
    RIGHT,
)

# Hilda's Hills palette — kept in sync with src/index.css @theme block.
PARCHMENT = "#F5F1E8"
HALF = "#C77D6E"  # the half-piece and its two quarter-equivalents stay one color,
                  # so the eye reads area-preservation, not a color story.


class HalfEqualsTwoQuarters(Scene):
    """1/2 = 2/4 by area preservation.

    A single half-piece splits into two quarter-pieces that occupy the
    same space. Both states use the same color so the invariant — total
    area — is visually obvious. Notation is intentionally absent.
    """

    def construct(self):
        self.camera.background_color = PARCHMENT

        half = Rectangle(width=4, height=1, color=HALF, fill_opacity=0.9, stroke_opacity=0)
        self.play(Create(half))
        self.wait(0.5)

        q1 = Rectangle(width=2, height=1, color=HALF, fill_opacity=0.9, stroke_opacity=0)
        q1.move_to(half.get_center() + LEFT * 1.05)
        q2 = Rectangle(width=2, height=1, color=HALF, fill_opacity=0.9, stroke_opacity=0)
        q2.move_to(half.get_center() + RIGHT * 1.05)

        self.play(Transform(half, VGroup(q1, q2)))
        self.wait(1)
