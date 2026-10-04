# T07 — Score view and key strip

| Status | Depends on | Size |
|---|---|---|
| in review | T02 | L |

## Goal

Show the current bar and the next one with a cursor on the current step, color notes as the
player plays, and draw an on-screen keyboard that lights hint keys.

## Read first

`docs/SPEC.md` section 5, `docs/ARCHITECTURE.md` section 6 (the verified OSMD view calls),
`src/ui/score-view.ts`, `src/ui/key-strip.ts`, `src/adapters/osmd-steps.ts`.

## Files (yours to change)

- `src/ui/score-view.ts`, `src/ui/key-strip.ts`, `src/styles.css`
- New: `demo/view.html` and `demo/view.ts` (a page to exercise the view by hand)

## Contract (architect-owned)

`ScoreView` (`load`, `showMeasures`, `moveTo`, `mark`, `clearMarks`), `NoteMark`, and `KeyStrip`
(`press`, `release`, `showHint`, `clearHint`, `flashWrong`) as declared in the stubs.

## Rules

**ScoreView**

1. One OSMD instance per view, SVG backend, `autoResize: false`, no title, composer or part
   names, measure numbers on.
2. `load(xml, range)` loads the score and returns `stepsFromOsmd(osmd, { range })` from the
   same instance.
3. `showMeasures(first, last)` takes 0-based bar indices; OSMD's draw options are 1-based.
   Render, then show the cursor.
4. `moveTo(step)` resets the cursor and advances with `cursor.next()` until the iterator's
   `CurrentMeasureIndex` and `currentTimeStamp.RealValue` match the step. It must not loop
   forever if the step isn't drawn: throw an Error instead.
5. `mark(step, pitch, mark)` colors the written notes of `step` whose expected pitch is `pitch`:
   `correct` green, `hinted` amber (the player needed help). `melodyStoodOut` draws a small
   filled accent circle just above the note head; `melodyWeak` draws a hollow amber circle.
   Marks are remembered and re-applied after every render; `clearMarks()` removes them.
6. Colors come from CSS custom properties in `src/styles.css` (`--mark-correct`,
   `--mark-hinted`, `--mark-melody`), with light and dark values.

**KeyStrip**

7. An SVG keyboard for the range (61 keys for the PSR-E363), full width, about 90 px tall,
   with each C labelled in scientific pitch (C2 … C7).
8. `press`/`release` show a faint fill; `showHint` a strong amber fill that replaces the
   previous hint; `flashWrong` a red fill for about 400 ms.
9. Keys have `data-note` attributes with the MIDI number.

**Demo page**

10. `demo/view.html` loads `fixtures/musicxml/02-chords-accidentals-voices.musicxml` (import it
    with Vite's `?raw` suffix) and has buttons: Previous step, Next step, Mark correct, Mark
    hinted, Melody stood out, Melody weak, Hint current keys, Clear. The current bar and the
    next bar are shown; moving past a bar re-renders the range.

## Tests to pass

`npm run check:task -- T07`. The view is checked visually: attach screenshots of `demo/view.html` in light
and dark mode showing a cursor, green and amber notes, both melody marks, and a lit hint.

## Out of scope

The game flow (T08), zooming, page turns, fingering display.

## Done when

`npm run check:task -- T07` passes and the screenshots show every state listed above.

## Hints

- Verified on OSMD 2.1.3 in Chromium: `setOptions({ drawFromMeasureNumber, drawUpToMeasureNumber })`
  then `render()`; `cursor.show()`; `cursor.next()`; `cursor.GNotesUnderCursor()`;
  `gNote.setColor(color, { applyToNoteheads: true, applyToStem: true })`.
- `gNote.sourceNote.halfTone + 12` is the written MIDI pitch; fold it with the step's notes to
  find the expected pitch.
- For the melody circles, read the note head's SVG element (`gNote.getSVGGElement()`), use its
  bounding box, and append a `<circle>` to the same SVG.

## Questions

## Notes from the implementer

- Implemented `ScoreView` in `src/ui/score-view.ts`:
  - One OSMD instance per view with SVG backend, `autoResize: false`, no title, composer or part names, and measure numbers on. Sets `CursorIgnoreRepetitions = true`.
  - Cursor configured with neutral translucent blue-gray highlight (`color: "#64748b", alpha: 0.25`) kept in private constant `ScoreView.CURSORS_OPTIONS` and passed in every `setOptions` call (the constructor's and `showMeasures`) so OSMD does not reset to its default green cursor.
  - `load(xml, range)` loads MusicXML into OSMD and returns steps via `stepsFromOsmd(this.osmd, { range })`.
  - `showMeasures(first, last)` converts 0-based bar indices to 1-based OSMD options (`drawFromMeasureNumber`, `drawUpToMeasureNumber`), renders, shows the cursor, and reapplies remembered marks.
  - `moveTo(step)` resets cursor and steps through with `cursor.next()` until matching `CurrentMeasureIndex` and `currentTimeStamp.RealValue`, safely aborting with an Error if the step is not drawn.
  - `mark(step, pitch, mark)` applies `setColor` for `correct` and `hinted` using CSS variables (`--mark-correct`, `--mark-hinted`), and creates accent `<circle>` SVGs for `melodyStoodOut` (filled circle) and `melodyWeak` (hollow circle).
  - Melody circles on chords pick the notehead corresponding to the melody note itself by its rank/`vfnoteIndex` in the chord. The circle is placed just above the notehead for top notes and single notes; for inner-voice melody notes with another notehead of the chord directly above, the circle is placed just to the left of the notehead to avoid covering other notes.
  - Marks are remembered and re-applied after every render; `clearMarks()` clears marks and refreshes the score.
  - Container is assigned `.virtuoso-score`, using mark colors scoped for high contrast on white paper in both light and dark themes.
- Implemented `KeyStrip` in `src/ui/key-strip.ts`:
  - Full-width SVG keyboard (~90px high) for the given range with each C labelled in scientific pitch (C2...C7) and `data-note` attributes on all keys.
  - Handled `press`/`release` (faint fill), `showHint`/`clearHint` (strong amber fill), and `flashWrong` (400ms red flash timer).
- Configured CSS variables and styling in `src/styles.css`:
  - Defined high-contrast mark colors on white paper (`--score-mark-correct`, `--score-mark-hinted`, `--score-mark-melody`) for `.virtuoso-score` and `.score-card` in both light and dark modes.
  - Maintained pale/bright mark colors (`#4ade80`, `#fbbf24`, `#60a5fa`, `#f87171`) for dark backgrounds like the key strip in dark mode.
- Created `demo/view.html` and `demo/view.ts` loading `fixtures/musicxml/02-chords-accidentals-voices.musicxml` via Vite's `?raw` suffix with all required buttons (Previous step, Next step, Mark correct, Mark hinted, Melody stood out, Melody weak, Hint current keys, Clear), bar re-rendering when crossing bar boundaries, interactive key clicks, and a dark mode toggle.
- `npm run check:task -- T07` passes completely with all typechecks, linter checks, and test suites passing.
