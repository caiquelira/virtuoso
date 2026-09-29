# T02 — MusicXML → steps through OSMD

| Status | Depends on | Size |
|---|---|---|
| todo | — | M |

## Goal

Read a MusicXML score with OpenSheetMusicDisplay's parser and produce the game's `Step[]`: each
moment where at least one note must be pressed, with every note that starts there.

## Read first

`docs/SPEC.md` section 4, `docs/ARCHITECTURE.md` section 6 (verified OSMD facts),
`src/core/types.ts`, `src/core/steps.ts`, `src/adapters/osmd-steps.ts`, and the four files in
`fixtures/musicxml/`.

## Files (yours to change)

- `src/adapters/osmd-steps.ts`

## Contract (architect-owned)

- `stepsFromOsmd(osmd, options?): ParsedScore` for an OSMD instance that has loaded a score.
- `parseScore(xml, options?): Promise<ParsedScore>` creates a detached OSMD instance (no
  rendering), loads the text and calls `stepsFromOsmd`.
- `ParsedScore = { title: string | null; measureCount: number; steps: Step[] }`.
- `options.range` defaults to `PSR_E363_RANGE`.

## Rules

1. Set `osmd.EngravingRules.CursorIgnoreRepetitions = true` before iterating, so the walk
   follows the written order and each bar appears once.
2. Walk `osmd.Sheet.MusicPartManager.getIterator()` to the end. Group notes by
   `currentTimeStamp.RealValue`; the step's `measureIndex` is the iterator's
   `CurrentMeasureIndex` where that timestamp first appears.
3. Use the first instrument with two staves (else the first instrument). Staff 1 is its first
   staff, staff 2 its second. Ignore other instruments.
4. For each non-rest note: `written = halfTone + 12`, `expected = foldIntoRange(written, range)`,
   `voice = ParentVoice.VoiceId`, `isGrace = voiceEntry.IsGrace`,
   `tiedFromPrevious = NoteTie exists and NoteTie.StartNote !== note`.
5. Keep only timestamps with at least one required note (not tied, not grace). Sort steps by
   timestamp and set `index` to the position. Sort each step's notes by staff, then written
   pitch.
6. `title` is the trimmed `Sheet.TitleString`, or `null` if empty. `measureCount` is
   `Sheet.SourceMeasures.length`.
7. `parseScore` rejects with an `Error` when OSMD cannot load the text.

## Tests to pass

`npx vitest run tests/adapters/osmd-steps.test.ts` (runs under jsdom).

## Out of scope

Rendering (T07), octave-shift (8va) marks, cue notes, percussion, several piano parts, `.mxl`
unzipping (OSMD does it).

## Done when

`npm run check:task -- T02` passes.

## Hints

- Under jsdom, OSMD prints "HTMLCanvasElement's getContext() … not implemented". It's harmless
  for parsing.
- Import the class with `import { OpenSheetMusicDisplay } from "opensheetmusicdisplay"`; the
  stub imports only the type.
- OSMD's model types are exported from the package root; prefer them over `any`.

## Questions

## Notes from the implementer
