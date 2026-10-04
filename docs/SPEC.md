# Virtuoso — Product Spec

Version 0.2 · 29 September 2026 · Owner: Caíque (product), Claude (architecture)

This file says **what** the game does and why. `docs/ARCHITECTURE.md` says how it is built.
Task files in `docs/tasks/` turn both into work items. If this spec and a task file disagree,
stop and ask; don't pick one.

## 1. Purpose

Help one player learn specific classical piano pieces from his own scores, while

- his **sight-reading** keeps improving, even though most practice time goes to pieces, and
- he learns to play **musically**, not robotically: the melody must sing over the accompaniment.

The player is an early-intermediate adult who reads from sheet music and practises under two
hours a week. His long-term piece is Luo Ni's "G Minor Bach" (after BWV 847).

## 2. Principles

1. **Notation first.** The player reads the score. Keys light up only as a delayed hint.
2. **Feedback after the attempt, not during it.** Hints come after a real try, results after
   each step. Constant guidance helps while it is on screen and hurts learning once removed
   (the "guidance hypothesis": [a test of it](https://www.researchgate.net/publication/12347489_Reduced-Frequency_Concurrent_and_Terminal_Feedback_A_Test_of_the_Guidance_Hypothesis),
   [a review](https://link.springer.com/article/10.3758/s13423-012-0333-8)).
3. **Grade music, not only notes.** From the first version the game grades voicing, using the
   key velocity the keyboard sends.
4. **Reading progress is measured and defended**, not assumed (section 8).
5. **Local, free and offline.** No accounts, no servers, no paid services. Everything runs in
   Chrome or Edge on the player's PC.

## 3. Hardware and setup

- Keyboard: Yamaha PSR-E363, 61 touch-sensitive keys, MIDI notes 36–96. Yamaha labels middle C
  (MIDI 60) as "C3"; the game uses scientific names (C4 = 60) everywhere.
- Connection: USB TO HOST, USB 2.0 A-to-B cable under 3 m, no driver.
- Before playing: press **PORTABLE GRAND** (plain piano, Dual and Split off) and set
  **FUNCTION 008 TouchRes** to 2 or 3, never 4 (Fixed).
- `tools/midi-check.html` checks all of this, measures how finely the keyboard reports
  velocity, and records sessions for tests.
- Any other MIDI keyboard works; its key range is a setting.

## 4. Scores

- The player's PDFs are the source of truth. Each is converted once to MusicXML (Audiveris),
  checked bar by bar against the PDF, fixed in MuseScore if needed, then added to the library.
  (Import tooling is milestone M3. Until then, the game opens MusicXML files directly.)
- The game reads `.musicxml`, `.xml` and `.mxl`.
- Piano scores only: the first part with two staves (or the first part, if none has two).
- **Steps.** A step is a moment in the score where at least one note starts. All notes starting
  at that moment, in both hands, form one step and are played together.
  - Tie continuations keep sounding and are not pressed again.
  - Grace notes are shown but not required (for now).
  - Rests are not steps.
  - Repeats are not unfolded: the game follows the written order, each bar once.
  - Notes outside the keyboard move by whole octaves into range; the written pitch is kept.

## 5. The practice loop (wait mode)

1. The player picks a piece and a range of bars.
2. The screen shows the **current bar and the next bar**, a cursor on the current step, and an
   on-screen key strip under the score.
3. The game waits. Each correct key turns its note green. A wrong key flashes on the key strip.
4. If a staff still has missing keys when its **hint delay (T1)** runs out, those keys light on
   the key strip. No note names are shown.
5. When every key of the step has been pressed (since the step began), the cursor moves on.
   A key held down from the previous step must be pressed again.
6. After a chord, the melody note gets a small mark: it stood out, or it didn't (section 7).
7. At the end of the range: a short summary (steps read unaided, melody stood out), then the
   player can loop the range.

Tempo mode (a metronome and timing grades) and flow mode (play through without stopping) come
later (section 11).

## 6. Hint delay (T1)

The wait before keys light up adapts to the player, separately for each staff.

- **Unaided read** for a staff in a step: every required key of that staff pressed strictly
  before `start + T1`, no wrong note attributed to that staff, and no hint shown for it.
- Wrong notes are attributed to the staff of the nearest key still missing (ties: staff 1).
- After an unaided read, T1 is multiplied by `e^-0.04` (about −4%). Otherwise it is multiplied
  by `e^(0.04 · p / (1 − p))`, where `p` is the target share of unaided reads. With `p` = 0.85
  that is about +25%. This weighted staircase settles where the player reads `p` of the steps
  unaided ([Kaernbach 1991](https://link.springer.com/content/pdf/10.3758/BF03214307.pdf),
  [weighted staircases](https://pmc.ncbi.nlm.nih.gov/articles/PMC11735050/)).
- Only **first contact** with a bar (section 8) and fresh-reading bars update T1. Repeats use
  T1 but never change it.

| Setting | Default | Set by |
|---|---|---|
| Starting T1 | 2.0 s, each staff | game, then learned |
| Longest T1 | 6.0 s | player |
| Shortest T1 | 0.4 s | player |
| Target unaided share `p` | 0.85; presets gentle 0.90, push 0.75 | player |

About 85%: [Wilson et al. 2019](https://www.nature.com/articles/s41467-019-12552-4) found that
learning algorithms trained by error correction learn fastest near 85% accuracy. It has not been
tested for music reading; treat it as a starting point that the player's data can move.

## 7. Voicing

MIDI note-on messages carry velocity (1–127): how fast the key went down, which sets its
loudness. In skilled playing the melody is louder than the other voices; the small timing lead
of the melody (about 30 ms) is mostly a side effect of that loudness
([Goebl 2001](https://pubmed.ncbi.nlm.nih.gov/11508980)). So the game grades voicing by velocity.

- **Melody note of a step:** by default the highest required key on staff 1 (the "skyline"
  rule). The player can mark another note of the step as the melody (for inner-voice or
  left-hand melodies; milestone M3).
- A step is graded only if it has at least two distinct required keys and a melody note.
- **Lead** = melody velocity − loudest other required key's velocity.
- **Stood out** = lead ≥ margin. Default margin: 10 velocity units, a starting guess to tune
  with `tools/midi-check.html` data from the player's keyboard.
- Feedback comes after the step (a mark by the melody note) and in the summary.

## 8. Reading progress

(Milestone M4, except first contact, which starts in M2.)

- **First contact.** A bar is fresh until the player completes it once. After that it trains
  memory, not reading. Research counts a passage as sight-reading material
  [only until it has been played once](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2020.497530/full),
  and sight-reading skill follows time spent on
  [sight-reading specifically](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00646/full).
- **Fresh-reading block.** Each session opens with 3 minutes of unseen bars from the library,
  easier than the current piece.
- **Reading speed** = current T1 per staff. The game keeps a weekly value and shows the trend.
- **Stall rule.** If a staff's weekly T1 has not dropped in 3 weeks, the fresh block grows to
  6 minutes or its material drops a level. If T1 sits at its maximum for a week, the fresh block
  switches to easier material (one hand, fewer accidentals).

## 9. Data kept on the PC

(Milestone M2.) In the browser's IndexedDB: the library, every step result, first-contact flags
per bar, T1 per staff, voicing results, settings. Nothing leaves the PC. An export/import of all
data as JSON guards against a cleared browser.

## 10. Not in scope for now

Tempo mode, flow mode, dynamics marks, articulation, pedal grading, generated exercises, the
melody override UI, Safari and mobile, accounts, cloud sync.

## 11. Milestones

| | Milestone | Player can… |
|---|---|---|
| M1 | First slice (tasks T01–T08) | open a MusicXML file, play a bar range in wait mode on the keyboard, see keys light after T1, get voicing marks |
| M2 | Practice loop | loop ranges; T1, first contact and history persist; settings; session summary |
| M3 | Library and import | convert PDFs with Audiveris, check them beside the PDF, keep a library, mark melody notes |
| M4 | Reading guarantee | fresh-reading block, weekly reading-speed trend, stall rule |
| M5 | Musicality in flow | flow mode (no stopping), then tempo mode, dynamics, articulation (note-offs), pedal |
| M6 | Derived exercises | fresh material from real music: Bach chorales reduced by voice and transposed |

## 12. Glossary

- **Step**: notes starting at the same moment; played together.
- **Required keys**: a step's keys, excluding tie continuations and grace notes, after folding.
- **Staff 1 / staff 2**: upper / lower staff of the piano part.
- **T1**: hint delay per staff.
- **Unaided**: read in time, without a hint or wrong note.
- **First contact**: the first completion of a bar.
- **Voicing lead / margin**: see section 7.
- **Folding**: moving an out-of-range note by octaves into the keyboard's range.
