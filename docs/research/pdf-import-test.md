# PDF import test (Audiveris), 3 October 2026

Run by Claude on claude.ai to size milestone M3 (library and import). Caíque has the full report
page in his claude.ai "Piano" project ("Virtuoso Import Test"). The outputs are in
`C:\Users\Pichau\Projetos\Virtuoso\omr-test\`: `.mxl` files as converted, and `.omr` Audiveris
projects to fix.

## Setup

- Audiveris 5.11.0 in batch mode, run in the Linux sandbox that the Claude desktop app keeps on
  the PC (about 35 s per page, 23 pages).
- Reference: for PDFs exported from notation programs, the printed notes were read back from the
  PDF's music font (staff position, clef, key, accidentals and 8va lines) and compared bar by bar
  with the MusicXML, plus a check that every voice fills its bar. Spot checks by eye confirmed the
  reference in 9 disputed bars.
- Not compared: ties, slurs, dynamics, fingering, and hand assignment (except through the rhythm
  check). OCR was off (tessdata_fast lacks the legacy engine Audiveris needs), so text sometimes
  became stray marks.

## Results (bars right as converted)

| Piece | Engraved with | Bars right | Notes at right pitch | Main problems |
|---|---|---|---|---|
| Luo Ni, G minor Bach | MuseScore 3 | 54/70 (77%) | 89.8% | bass clef missed on 5 of 23 systems (15 bars); 4 phantom notes (bars 25, 26, 69) |
| Passacaglia (Handel–Halvorsen, Pianistos) | Finale | 106/124 (85%) | 96.3% | octave clef and 8va line misread (11 bars); stray notes (5); rhythm (2) |
| If I Am With You (Jujutsu Kaisen) | MuseScore 4 | 37/52 (71%) | 94.7% | 8va missed (5); clef changes missed (3); rhythm (5); other (2) |
| Thanks for all people (Umineko) | MuseScore 2 | 22/50 (44%) | 78.7% | 8va lines missed or applied the wrong way (23); key change missed (3); other (2) |
| Photograph (Her) | Sibelius | 4/45 (9%) | 86.7% | mid-bar left-hand clef changes ignored (21); 16th runs lost (10); 6/4 to 3/4 missed (10) |
| Bluebird | outlines, no music font | not checkable | — | two-voice left hand: rhythm broken in 80 of 133 bars |

Totals for the 5 checkable pieces: all bars found (474/474 across all six); 6,072 of 6,139
printed notes found (98.9%); 223 of 341 bars right (65%).

## What it means for M3

1. Fix signs (clef, key, 8va) in Audiveris before export; in MuseScore a clef change keeps the
   wrong pitches.
2. Build the PDF-font cross-check into M3, so the import screen shows only the flagged bars. It
   works when the PDF keeps its music font (5 of 6 here).
3. Prefer the transcriber's MuseScore or MusicXML file when one is published (3 of the 6 PDFs are
   MuseScore exports), and check it against the PDF the same way.
4. PDFs drawn as outlines (Bluebird) need a visual check.
5. The Bach is about 9 fixes from fully correct: a good first import.

## How the cross-check worked

Glyphs were matched by SMuFL code points: noteheads E0A2–E0A4, clefs E050 and E062 (and their
8va forms), accidentals E260–E264, ottava lines E510–E517. Older engravers use their own fonts,
mapped by hand: Maestro (Finale), Opus and BravuraSebastian (Sibelius), MScoreRegular
(MuseScore 2). Key signatures were recognised by the staff positions of their accidentals.
