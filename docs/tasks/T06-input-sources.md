# T06 — MIDI, computer-keyboard and replay inputs

| Status | Depends on | Size |
|---|---|---|
| todo | T01 | M |

## Goal

Three interchangeable sources of `InputEvent`s behind the `KeyboardInput` interface: the real
keyboard through Web MIDI, the computer keyboard (so anyone can develop without a piano), and
recorded sessions (so tests can use real playing).

## Read first

`docs/SPEC.md` section 3, `docs/ARCHITECTURE.md` sections 5 and 8, `src/input/keyboard-input.ts`,
the three stub files below, `src/core/midi.ts`.

## Files (yours to change)

- `src/adapters/web-midi.ts`
- `src/input/fake-input.ts`
- `src/input/replay.ts`

## Contract (architect-owned)

- `WebMidiInput` with `start`, `stop`, `connectedInputs()`.
- `codeToNote`, `velocityFor`, `FAKE_VELOCITY`, octave limits and the `FakeInput` class.
- `RecordedSession`, `retime`, `SessionRecorder`, `ReplayInput`.

## Rules

**WebMidiInput**

1. If `navigator.requestMIDIAccess` is missing, reject with a message that names Chrome or Edge.
2. Call `navigator.requestMIDIAccess({ sysex: false })`. If it rejects, reject with a message
   telling the player to allow MIDI for the site.
3. Listen to every input in `access.inputs`, and to inputs that appear later (`statechange`),
   each exactly once. Resolve even when no keyboard is connected yet.
4. For each message: `parseMidiMessage(event.data, event.timeStamp)`, then pass it through a
   `ChannelLock`; deliver what survives.
5. `stop()` detaches everything and resets the lock. Calling it twice is fine.

**FakeInput**

6. Layout and velocities as in the stub's doc comment; `KeyboardEvent.code`, so it works on any
   keyboard layout. Z and X shift an octave, clamped to −3..+3.
7. Ignore auto-repeat. On key-up, release the note that key actually started, even if the octave
   changed meanwhile. Events use channel 1 and `event.timeStamp`.

**Replay**

8. `retime` as documented in the stub. `SessionRecorder` stores times relative to the first
   event and omits `device` when not given. `ReplayInput` schedules events with `setTimeout`
   from `performance.now()` and cancels them on `stop()`.

## Tests to pass

`npx vitest run tests/adapters/web-midi.test.ts tests/input/`

## Out of scope

MIDI output, Bluetooth pairing UI, choosing among several keyboards (all inputs are merged).

## Done when

`npm run check:task -- T06` passes. The real keyboard is play-tested in T08.

## Questions

## Notes from the implementer
