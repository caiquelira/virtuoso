# Task board

Milestone M1, the first playable slice. Each task is one branch and one pull request.

| Task | What | Status | Depends on | Size |
|---|---|---|---|---|
| [T01](T01-midi-messages.md) | Parse raw MIDI into events; channel lock | done | — | S |
| [T02](T02-score-steps.md) | MusicXML → steps through OSMD | done | — | M |
| [T03](T03-wait-engine.md) | Wait-mode engine | done | — | M |
| [T04](T04-hint-timer.md) | Adaptive hint delay (T1) | done | — | S |
| [T05](T05-voicing.md) | Voicing grade | done | — | S |
| [T06](T06-input-sources.md) | MIDI, computer-keyboard and replay inputs | todo | T01 | M |
| [T07](T07-score-view.md) | Score view and key strip | todo | T02 | L |
| [T08](T08-first-slice.md) | Wire the first playable slice | todo | T01–T07 | L |

**Order.** T01–T05 are independent and can run in parallel. T06 needs T01, T07 needs T02, and
T08 comes last.

**Status values:** `todo`, `in progress`, `in review`, `done`, `blocked`.

Every task file has the same sections. Contract sections are owned by the architect; the
implementer fills in **Questions** and **Notes from the implementer** and sets the task file's
Status. This board is updated only when a pull request is merged, and `npm run check:task`
reads it to know which tasks are done.
