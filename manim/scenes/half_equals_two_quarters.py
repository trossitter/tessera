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
    BLUE,
    LEFT,
    RIGHT,
)


class HalfEqualsTwoQuarters(Scene):
    """1/2 = 2/4 by area preservation.

    Placeholder content — palette, type, and timing are not yet locked.
    Will be redone after the visual identity pass.
    """

    def construct(self):
        half = Rectangle(width=4, height=1, color=BLUE, fill_opacity=0.8)
        self.play(Create(half))
        self.wait(0.5)

        q1 = Rectangle(width=2, height=1, color=BLUE, fill_opacity=0.8)
        q1.move_to(half.get_center() + LEFT * 1)
        q2 = Rectangle(width=2, height=1, color=BLUE, fill_opacity=0.8)
        q2.move_to(half.get_center() + RIGHT * 1)

        self.play(Transform(half, VGroup(q1, q2)))
        self.wait(1)
