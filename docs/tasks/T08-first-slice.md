# T08 — Wire the first playable slice

| Status | Depends on | Size |
|---|---|---|
| in review | T01–T07 | L |

## Goal

The player opens a score, picks bars, and practises them in wait mode on his keyboard, with
adaptive hints, voicing marks and an end-of-range summary. This completes milestone M1.

## Read first

`docs/SPEC.md` sections 5–7, `docs/ARCHITECTURE.md` section 4 (the sequence diagram), all of
`src/`.

## Files (yours to change)

- `src/app.ts`, `src/styles.css`, `index.html`
- New files under `src/ui/` for screens, if you need them.
- New test files under `tests/app/` for pure logic you extract. Don't touch any other test.

## Contract (architect-owned)

`startApp(root: HTMLElement): void` is the only export `main.ts` uses.

## Rules

**Start screen**

1. Open a file (`.musicxml`, `.xml`, `.mxl`) or "Try the sample" (the Bach chorale in
   `samples/`, imported with `?raw`). Read `.mxl` as a binary string so OSMD can unzip it;
   read the others as text.
2. Choose the input: MIDI keyboard (default) or computer keyboard. Show the MIDI input names once
   connected, and any error message from `start()` verbatim.
3. Choose the bar range (from, to), defaulting to the first two bars.

**Playing**

4. Show the current bar and the next one. When the cursor enters a new bar, re-render so that bar
   is first.
5. Drive `WaitEngine` with input events and with `tick(performance.now())` on every animation
   frame. `noteCorrect` → mark `correct`; `noteWrong` → `flashWrong`; `hintShown` → `showHint`
   and mark those notes `hinted` when they are finally pressed; key events also go to
   `press`/`release`.
6. On `stepCompleted`: for each staff outcome, call `hintTimer.record(staff, unaided)` **only if
   this is the first time the step's bar is completed in this session**; then
   `engine.setHintDelays(timer.delays())`; grade voicing and mark the melody note; clear the
   hint.
7. On `finished`: show the summary: steps played, share unaided per staff, melody-stood-out rate
   and mean lead, and T1 per staff now. Offer "Loop again" (new engine, same range; repeats no
   longer change T1) and "Change bars".

**Settings (simple panel)**

8. Target preset (gentle, standard, push), longest and shortest T1, voicing margin. Changing a
   setting applies from the next loop. Nothing is saved yet (M2).

## Tests to pass

`npm run check`. Add unit tests for any pure logic you extract (for example the first-contact
rule), in new files under `tests/app/`, and run them with `npx vitest run tests/app/`.

You can't open a browser in your run. The coordinator checks the screens with screenshots and
tells you what to fix; Caíque then play-tests on the keyboard.

## Out of scope

Persistence, library, PDF view, tempo or flow mode, melody override.

## Done when

`npm run check` passes (all of M1 is done by now), and the play-test below passes on the real keyboard.

**Play-test (Caíque, PSR-E363, Chrome):**

1. `npm run dev`, open http://localhost:5173, allow MIDI.
2. Try the sample, bars 1–2, MIDI keyboard. Play correctly and slowly: notes turn green, the
   cursor advances, no keys light.
3. Wait without playing: after about 2 s the missing keys light on the strip.
4. Play a chord with the top note clearly louder: filled melody mark. Play it flat: hollow mark.
5. Finish: the summary appears. Loop again: T1 values don't change on the repeat.

## Questions

## Notes from the implementer

- Implemented `startApp(root: HTMLElement)` in `src/app.ts`:
  - **Start screen**: "Try the sample" loads `samples/bach-bwv269-opening.musicxml` (`?raw`); file picker supports `.musicxml`, `.xml`, and `.mxl` (read as binary string for OSMD decompression).
  - **Input selection**: Defaults to MIDI keyboard with `WebMidiInput`; asks for MIDI permission only following a user click ("Connect MIDI" button, switching to MIDI keyboard radio, or "Start playing" with MIDI selected). Initial message directs the player to click Connect MIDI. Supports `FakeInput` for computer keyboard with guide.
  - **Bar range**: Defaults to first two bars (1–2), validates and clamps within score measure count.
  - **Playing view**: Renders the current and next bar via `ScoreView.showMeasures`; whenever cursor advances into a new bar, re-renders so that bar is first. If `moveTo` throws, stops playing and presents an on-screen error banner.
  - **Wait engine & key strip**: Drives `WaitEngine` on animation frame (`requestAnimationFrame` + `tick(performance.now())`) and input events. Note correct/wrong/hint/pressed events update `ScoreView` notes and `KeyStrip`.
  - **Voicing & first contact**: Evaluates voicing on `stepCompleted` and adds melody marks (`melodyStoodOut` vs `melodyWeak`). Tracks first contact per bar with `FirstContactTracker`; `hintTimer.record` only fires during the first completion of a bar in the session.
  - **Summary**: Displays steps played, share unaided for staff 1 & 2, voicing rate & mean lead, and T1 delays now. Provides "Loop again" (repeats preserve T1 values) and "Change bars" buttons.
  - **Settings modal**: Allows editing target preset (gentle, standard, push), min/max T1, and voicing margin. Validates that shortest T1 <= longest T1 before saving, displaying an inline error message if invalid. Clamps `initialMs` into `[minMs, maxMs]` to guarantee `HintTimer` never throws `RangeError`.
- Fixes applied per review:
  - **Pickup bars (ScoreView)**: Fixed `ScoreView.showMeasures` by setting `EngravingRules.MinMeasureToDrawIndex = first`, `MaxMeasureToDrawIndex = last`, and matching `MinMeasureToDrawNumber`/`MaxMeasureToDrawNumber` to `first`/`last` when pickup exists or `first + 1`/`last + 1` otherwise, preventing OSMD's implicit measure override from misaligning rendered bars.
  - **MIDI access on user gesture**: Removed `connectMidi()` on page mount; only triggers after a click.
  - **Settings validation and safe initialMs**: Added `clampInitialMs`, `getHintTimerConfig`, and `validateSettings` in `src/settings.ts`, with tests in `tests/app/settings.test.ts`.
  - **Play error reporting**: Caught `moveTo` errors, immediately terminating the game loop and displaying the error on screen.
  - **Start screen bar inputs width**: Added `width: 100%; box-sizing: border-box; min-width: 0;` to `.range-inputs input[type="number"]` and `min-width: 0;` to `.range-inputs label`.
- Extracted pure logic:
  - `src/first-contact.ts`: `FirstContactTracker`
  - `src/summary.ts`: `buildPracticeSummary`, formatting helpers
  - `src/range.ts`: `findRangeStepIndices`, `defaultBarRange`, `clampBarRange`
  - `src/settings.ts`: `createDefaultSettings`, `updatePreset`, `clampInitialMs`, `getHintTimerConfig`, `validateSettings`
- Unit tests added in `tests/app/`:
  - `tests/app/first-contact.test.ts`
  - `tests/app/summary.test.ts`
  - `tests/app/range.test.ts`
  - `tests/app/settings.test.ts`
- Added styling in `src/styles.css` for app layout, screens, panels, summary cards, and settings modal.
