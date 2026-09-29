---
trigger: glob
globs: src/core/**
---

Code in `src/core/` is pure logic.

- No DOM, `window`, `document`, `navigator`, storage, OpenSheetMusicDisplay or Web MIDI.
- No `performance.now()`, `Date.now()` or `Math.random()`: time comes in as a parameter.
- No imports from `src/adapters`, `src/input`, `src/ui` or `src/app.ts`.
- `tests/architecture.test.ts` enforces these rules.
