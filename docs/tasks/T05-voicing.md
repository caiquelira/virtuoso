# T05 — Voicing grade

| Status | Depends on | Size |
|---|---|---|
| done | — | S |

## Goal

After each chord, tell whether the melody note stood out from the other keys, using the key
velocities the engine recorded.

## Read first

`docs/SPEC.md` section 7, `src/core/voicing.ts`, `src/core/steps.ts`.

## Files (yours to change)

- `src/core/voicing.ts`

## Contract (architect-owned)

`DEFAULT_VOICING_MARGIN`, `melodyPitch`, `gradeVoicing`, `summarizeVoicing` and their types
exactly as declared in the stub.

## Rules

1. `melodyPitch(step, override?)`: `null` if the step has fewer than two distinct required
   keys. If `override` is one of them, return it. Otherwise return the highest required key on
   staff 1, or `null` if staff 1 has none.
2. `gradeVoicing(step, velocities, options?)`: `null` if `melodyPitch` is `null` or any required
   key has no velocity. Otherwise compare the melody's velocity with the other required keys
   only (ignore extra entries in `velocities`):
   `loudestOther` = their maximum, `meanOther` = their mean,
   `lead = melodyVelocity − loudestOther`, `stoodOut = lead ≥ margin` (default 10).
3. `summarizeVoicing(results)`: counts, `rate = stoodOut / graded`, `meanLead` = mean of
   `lead`; both `null` when nothing was graded.

## Tests to pass

`npx vitest run tests/core/voicing.test.ts`

## Out of scope

Held melody notes against moving accompaniment, dynamics marks, timing lead.

## Done when

`npm run check:task -- T05` passes.

## Questions

## Notes from the implementer

- Implemented `melodyPitch`: returns `null` if fewer than 2 distinct required keys, supports valid override key belonging to the required pitches, and otherwise defaults to the highest required pitch on staff 1 (or `null` if staff 1 has none).
- Implemented `gradeVoicing`: grades steps having a melody and velocities for all required keys. Compares melody velocity against other required keys (ignoring extra velocity entries), calculating `loudestOther`, `meanOther`, `lead`, and `stoodOut` against the margin (default 10).
- Implemented `summarizeVoicing`: aggregates `graded`, `stoodOut`, `rate`, and `meanLead` across graded steps (reporting `null` for rate and meanLead when empty).
- All checks pass cleanly with strict typing and no linter warnings.
