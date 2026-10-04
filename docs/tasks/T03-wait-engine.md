# T03 — Wait-mode engine

| Status | Depends on | Size |
|---|---|---|
| done | — | M |

## Goal

The heart of the game: a pure state machine that waits at each step until every required key is
pressed, judges each key press, fires hints when a staff's delay runs out, and reports a result
per step.

## Read first

`docs/SPEC.md` sections 5 and 6, `docs/ARCHITECTURE.md` section 4, `src/core/types.ts`,
`src/core/steps.ts`, `src/core/wait-engine.ts`.

## Files (yours to change)

- `src/core/wait-engine.ts`

## Contract (architect-owned)

The `WaitEngine` class, `WaitEngineOptions`, `EngineOutput`, `StepResult`, `StaffOutcome` and
`WrongNote` exactly as declared in the stub.

## Rules

1. `start(time)` begins at `options.from` and emits `stepStarted`. Steps with no required keys
   are skipped silently. If nothing in `from..to` is playable, emit `finished`. Calling `start`
   twice throws.
2. A step's required keys are `requiredPitches(step)`: distinct, folded, no tie continuations or
   grace notes. A key written in both staves is one key and counts for both staves.
3. `handle(noteOn)`:
   - a required key not yet pressed in this step → `noteCorrect`, recording its velocity and
     time;
   - a required key already pressed → nothing;
   - any other key → `noteWrong`, attributed to the staff of the nearest required key **still
     missing** (tie: staff 1).
   Only presses after the step started count; a key held from the previous step needs a new
   press.
4. When every required key is pressed: emit `stepCompleted` with the result, then either
   `stepStarted` for the next playable step (same time) or `finished`.
5. `handle(noteOff | pedal)` returns `[]`. Before `start` and after `finished`, `handle` and
   `tick` return `[]`.
6. `tick(time)`: for each staff with missing keys whose hint hasn't been shown, if
   `time >= startedAt + hintDelayMs[staff]`, emit `hintShown` with that staff's missing keys
   (ascending). Staff 1 before staff 2. At most one hint per staff per step.
7. Delays are read when checked, so `setHintDelays` affects the running step.
8. Staff outcome: `unaided` = every required key of the staff pressed strictly before
   `startedAt + delay` (delay in effect at completion), no wrong note attributed to it **and**
   its hint not shown. `hinted` = its hint was emitted. `wrongNotes` = count attributed to it. One outcome per staff
   with required keys, staff 1 first.

## Tests to pass

`npx vitest run tests/core/wait-engine.test.ts`

## Out of scope

Timing grades, tempo, loops (the app restarts the engine), note-off handling, persistence.

## Done when

`npm run check:task -- T03` passes.

## Hints

Build the step's key sets once, when it starts, with `requiredPitches`,
`requiredPitchesForStaff` and `stavesOf` from `src/core/steps.ts`.

## Questions

## Notes from the implementer

- Implemented `WaitEngine` state machine in `src/core/wait-engine.ts` managing step progression across `from..to`.
- Handled skipping steps with no playable notes and emitting `finished` when nothing is playable or when the last playable step completes.
- Implemented `handle(noteOn)`: correct note tracking, ignoring duplicate presses within a step, and attributing wrong notes to the staff of the nearest missing pitch (breaking ties in favor of staff 1).
- Implemented `tick(time)` hint mechanism: timing each staff independently, showing hints once per staff per step in ascending order, staff 1 before staff 2.
- Implemented `stepCompleted` result construction: calculating `unaided` per staff (strictly before `startedAt + delay`, no wrong notes attributed, no hints shown), recording satisfied velocities, press timestamps, and wrong note logs.
- Strict TypeScript adhered to with no `any`, no non-null assertions (`!`), and pure core state machine logic without browser or environment APIs.
- Verified definition of done with `npm run check:task -- T03` (typecheck, lint, and all 34 relevant unit tests pass).
