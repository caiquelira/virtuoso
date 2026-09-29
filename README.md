# Piano Game

Learn classical piano pieces bar by bar from your own scores. The game shows the score, waits for
you to play each step on a MIDI keyboard, lights the keys only when you need help, and grades
whether the melody sings over the accompaniment.

**Status:** starter pack. Contracts, tests and docs are in place; the game itself is being built
task by task (`docs/tasks/`). The MIDI check page works today.

## Quick start

Requires Node.js 22 or later, and Chrome or Edge.

```
npm ci
npm run dev
```

- http://localhost:5173 — the game (a placeholder until task T08).
- http://localhost:5173/tools/midi-check.html — check the keyboard now: connection, channels,
  velocity spread, and session recording.

`npm run check` runs the typecheck, the linter and the tests. Until the tasks are done, most
tests fail on purpose: they describe the work.

## Keyboard setup (Yamaha PSR-E363)

1. USB TO HOST port to the PC, USB 2.0 A-to-B cable under 3 m. No driver.
2. Press **PORTABLE GRAND** (plain piano; Dual and Split off).
3. **FUNCTION → 008 TouchRes** set to 2 or 3, not 4 (Fixed).
4. Allow MIDI when Chrome asks.

## Where things are

| Path | What |
|---|---|
| `docs/SPEC.md` | What the game does and why |
| `docs/ARCHITECTURE.md` | How it's built; verified OSMD facts |
| `docs/decisions/` | Decision records |
| `docs/tasks/` | The task board and one file per task |
| `docs/WORKFLOW.md` | How Caíque, Claude and the Antigravity agents work together |
| `AGENTS.md`, `.agents/rules/` | Rules the coding agents load automatically |
| `src/core/` | Pure game logic |
| `src/adapters/`, `src/input/` | OSMD parsing, Web MIDI, computer keyboard, replay |
| `src/ui/`, `src/app.ts` | Screen |
| `tests/`, `fixtures/` | Contracts: tests and their data |
| `samples/` | Playable excerpts (a Bach chorale opening) |
| `tools/midi-check.html` | Keyboard check and session recorder |
