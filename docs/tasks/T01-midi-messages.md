# T01 — Parse raw MIDI into events

| Status | Depends on | Size |
|---|---|---|
| in review | — | S |

## Goal

Turn the bytes Web MIDI delivers into the game's `InputEvent`s, and keep only the keyboard's own
channel so layered or accompaniment notes don't count twice.

## Read first

`docs/SPEC.md` section 3, `src/core/types.ts`, `src/core/midi.ts` (the stub and its doc comments).

## Files (yours to change)

- `src/core/midi.ts`

## Contract (architect-owned)

- `parseMidiMessage(data: ArrayLike<number>, time: number): InputEvent | null`
- `createChannelLock(): ChannelLock` with `accept(event)`, `channel`, `reset()`

## Rules

1. Status byte `0x9n` with velocity > 0 → `noteOn`; with velocity 0 → `noteOff`.
2. `0x8n` → `noteOff`; the release velocity is ignored.
3. `0xBn` controller 64 → `pedal`, `down` when value ≥ 64, `value` kept.
4. Channel = low nibble + 1 (1–16). `time` is passed through unchanged.
5. Everything else returns `null`: other controllers, program change, pitch bend, system
   messages (`0xF0`–`0xFF`), messages shorter than three bytes, data bytes above 127, and data
   without a status byte.
6. Channel lock: the first `noteOn` after creation or `reset()` sets the channel and passes.
   Before that, `noteOff` and `pedal` pass without setting it. After it, only events on the
   locked channel pass.

## Tests to pass

`npx vitest run tests/core/midi.test.ts`

## Out of scope

Running status across messages (Web MIDI delivers complete messages), system exclusive, MIDI 2.0.

## Done when

`npm run check:task -- T01` passes.

## Questions

## Notes from the implementer

- Implemented `parseMidiMessage` in `src/core/midi.ts` to parse complete 3-byte MIDI channel messages into `noteOn`, `noteOff`, or `pedal` (`InputEvent`), returning `null` for other controllers, program changes, pitch bends, system messages, messages shorter or longer than 3 bytes, non-integer or out-of-range data bytes (>127), and messages lacking a status byte.
- Implemented `createChannelLock` in `src/core/midi.ts` to track and lock to the channel of the first `noteOn` event while allowing initial `noteOff` and `pedal` events through, filtering subsequent events to match the locked channel, and resetting upon `reset()`.
- Successfully validated with `npm run check:task -- T01` (typecheck, Biome lint, architecture tests, steps tests, and midi unit tests all passing).

