# 0004 — Grade voicing from key velocity, from the first version

Status: accepted · 29 September 2026

**Decision.** Grade whether the melody note is louder than the other keys of each step, using MIDI
note-on velocity. Default melody: the highest required key on staff 1; the player can choose
another note (M3). Default margin: 10 velocity units, to tune from calibration data.

**Why.** Grading only right notes rewards robotic playing, the player's main worry after trying
PianoBooster. In skilled playing the melody is louder, and its small timing lead is mostly a side
effect of that loudness (Goebl 2001), so velocity is the right first measure.

**Risk.** Budget keyboards may report velocity coarsely. `tools/midi-check.html` measures the
PSR-E363's spread; the margin follows the data.

**Would change if** the keyboard's velocity proves too noisy, in which case voicing would be
graded over several chords rather than one.
