# T04 — Adaptive hint delay (T1)

| Status | Depends on | Size |
|---|---|---|
| in review | — | S |

## Goal

Keep one hint delay per staff that adapts so the player reads a target share of steps (85% by
default) without help.

## Read first

`docs/SPEC.md` section 6, `src/core/hint-timer.ts`.

## Files (yours to change)

- `src/core/hint-timer.ts`

## Contract (architect-owned)

`DEFAULT_HINT_TIMER`, `TARGET_PRESETS`, `upStep(target, downStep)`, and the `HintTimer` class
exactly as declared in the stub.

## Rules

1. `upStep(target, downStep) = downStep · target / (1 − target)`.
2. `record(staff, true)` multiplies that staff's delay by `e^−downStep`; `record(staff, false)`
   multiplies it by `e^upStep`. The result is clamped to `[minMs, maxMs]` and returned.
3. Staves are independent.
4. The constructor merges `config` over `DEFAULT_HINT_TIMER` and throws `RangeError` unless
   `0.5 < target ≤ 0.99`, `minMs > 0`, `minMs ≤ maxMs`, `minMs ≤ initialMs ≤ maxMs` and
   `downStep > 0`.
5. `saved` delays replace `initialMs` per staff, clamped into the limits.
6. `delays()` and `config` return copies.

## Tests to pass

`npx vitest run tests/core/hint-timer.test.ts`. One test simulates 40,000 reads by a model
reader and checks that the unaided share settles within ±1.5 points of the target; it passes
only if the step sizes are right.

## Out of scope

Deciding which attempts count (first contact is the app's job), persistence.

## Done when

`npm run check:task -- T04` passes.

## Questions

## Notes from the implementer

- Implemented `upStep(target, downStep)` using `downStep * target / (1 - target)`.
- Implemented `HintTimer` class:
  - Constructor validates `target` in `(0.5, 0.99]`, `minMs > 0`, `minMs <= maxMs`, `minMs <= initialMs <= maxMs`, `downStep > 0`, throwing `RangeError` on invalid values.
  - Initializes staves 1 and 2 independently, clamping `saved` delays to `[minMs, maxMs]` or falling back to `initialMs`.
  - `delays()` and getter `config` return shallow copies to maintain immutability.
  - `record(staff, unaided)` multiplies the staff delay by `e^-downStep` or `e^upStep`, clamps to `[minMs, maxMs]`, updates internal state, and returns the new value.
- All checks in `npm run check:task -- T04` pass cleanly (typecheck, lint, architecture tests, step tests, hint timer tests).
