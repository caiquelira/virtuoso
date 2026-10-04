# Virtuoso compared with Synthesia and other programs

Written 2 October 2026 by Claude on claude.ai, against spec v0.2. Caíque has the full page, with
a feature map and a side-by-side table, in his claude.ai "Piano" project. This is the part that
matters for planning.

## Verdict

- No free program combines our three ideas: your own PDFs shown as an engraved score, key hints
  that back off as reading improves, and voicing graded from key velocity.
- The free programs (PianoBooster, Sightread, Neothesia) are MIDI players at heart: falling notes
  or a staff rebuilt from MIDI, graded on right notes (and timing in PianoBooster). None mentions
  velocity.
- The paid ones read real scores and track sight-reading, but their useful parts cost $39 once
  (Synthesia) or $100–$150 a year (Piano Marvel, MasterPiano). Piano Marvel assesses "note
  accuracy and rhythm accuracy" ([Play Mode](https://www.pianomarvel.com/feature/play-mode));
  MasterPiano Premium lists "velocity & intensity tracking" without saying what it judges
  ([pricing](https://masterpiano.com/pricing)).

| Program | Cost | What you read | Grades | Velocity |
|---|---|---|---|---|
| [Synthesia](https://synthesiagame.com/) | $39 once | Falling notes; sheet music optional, drawn from MIDI-level data | Notes, timing | Not mentioned |
| [Piano Marvel](https://pianomarvel.com/pricing) | Freemium; Premium $129.99 a year | Engraved score | Notes, rhythm | No |
| [MasterPiano](https://masterpiano.com/pricing) | Freemium; Premium $99.99 a year on the web | Engraved score | Notes, timing | Premium "velocity & intensity tracking", unexplained |
| [PianoBooster](https://github.com/pianobooster/PianoBooster) | Free, GPL-3.0 | Scrolling staff from MIDI | Notes, timing | Not mentioned |
| [Sightread](https://sightread.dev/about) | Free, GPL-3.0 | Falling notes, or a staff with simplified timing (beta) | Not yet | No |
| [Neothesia](https://github.com/PolyMeilex/Neothesia) | Free, GPL-3.0 | Falling notes | Counts wrong, early and late notes, no score | Ignored |

## Worth borrowing

- **Hands separate (M2).** Play staff 1, staff 2 or both; the other staff stays on screen but
  isn't required. Five of the six programs offer it, and our steps already know their staff, so
  it's a small change. From [Synthesia](https://synthesiagame.com/),
  [Piano Marvel](https://pianomarvel.com/article/what-makes-a-great-piano-learning-app),
  [PianoBooster](https://github.com/pianobooster/PianoBooster),
  [Sightread](https://github.com/sightread/sightread/blob/main/src/pages/play/components/SettingsPanel.tsx)
  and [Neothesia](https://github.com/PolyMeilex/Neothesia/blob/master/neothesia/src/scene/playing_scene/midi_player.rs).
- **Loop until it's clean (M2).** Piano Marvel splits a piece into sections and recommends 96% or
  more before moving on ([Practice Mode](https://pianomarvel.com/article/what-is-practice-mode)).
  Our loops could end the same way, for example at 90% of steps without a hint and the melody
  standing out.
- **Levels for fresh material (M4).** MasterPiano grades its pieces on the ABRSM scale
  ([App Store](https://apps.apple.com/us/app/masterpiano/id6758087301)), and Piano Marvel has
  levels and a sight-reading test
  ([support](https://support.pianomarvel.com/portal/en/kb/articles/how-do-i-upgrade-from-a-free-account-to-a-premium-account)).
  Our stall rule says "drop a level" without defining one; a simple difficulty score per bar
  (notes per beat, accidentals, leaps) would define it.
- **Enough unseen music (M4, M6).** A bar is fresh only once. At 10 to 20 seconds a bar, the
  3-minute fresh block uses 9 to 18 unseen bars per session, dozens a week, each converted and
  checked by hand. The paid platforms solve this with large graded libraries (Piano Marvel 25,000+
  songs, MasterPiano 8,000+ graded pieces). For us, the chorale exercises planned for M6 keep the
  block fed, so they should arrive with M4.
- **Timing windows (M5).** For tempo mode. Neothesia accepts a key pressed up to 500 ms before its
  note and counts a note late only after 160 ms
  ([source](https://github.com/PolyMeilex/Neothesia/blob/master/neothesia/src/scene/playing_scene/midi_player.rs));
  PianoBooster marks whether you're ahead of or behind the beat. Both make good starting values.

## Left out on purpose

- **Song library.** Caíque's PDFs are the library.
- **Accompaniment.** For solo piano, the keyboard makes all the sound.
- **Falling notes.** Notation first; keys appear only as a delayed hint.
- **Lit keys.** Synthesia can drive keyboards with key lights; our hints show on screen.
- **Phones and Safari.** Safari has no Web MIDI ([Can I use](https://caniuse.com/midi)), so the
  game targets Chrome or Edge on the PC.
- **Accounts and cloud.** Nothing leaves the PC.

## Caution

PianoBooster, Neothesia and Sightread are GPL-3.0. Read their code for ideas, but don't paste it
into this repository, or the game would have to be GPL if it's ever shared
([GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html#GPLRequireSourcePostedPublic)).
