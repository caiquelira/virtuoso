# Recorded sessions

Real playing from the player's keyboard, used to test the game without a piano.

Record with `tools/midi-check.html` (section 5), save the JSON here, and name it after what it
contains, for example `fixture-02-bar-1-soft-melody.json`. The format is `RecordedSession` in
`src/input/replay.ts`: `version: 1`, optional `device` and `recordedAt`, and `events` with times
in milliseconds from the first event.
