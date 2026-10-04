# Working together: Caíque, the driver and the agents

| Who | Does |
|---|---|
| Caíque | Product decisions, play-tests on the real keyboard |
| The driver: Claude Code on Caíque's PC (`CLAUDE.md`) | Spec, architecture, contracts and tests, task files; runs the agents, checks and reviews their work, opens and merges pull requests |
| Antigravity agents | One task each, in their own worktree; the driver commits their work and opens the pull request |
| Claude on claude.ai (Piano project) | Designed the project and wrote the starter pack; second opinion when Caíque asks |

Claude on claude.ai was the architect until 4 October 2026, when it handed the role to the
driver.

The repository is the only channel between them. Anything not written here doesn't exist for the
next agent.

## One-time setup

1. **Repository.** The code lives in the private repo `caiquelira/virtuoso`. The Claude GitHub
   app has access to it, so Claude on claude.ai can still open or review pull requests when
   asked.
2. **Agent machine.** The agents run in Caíque's main Windows profile (his decision, 4 October
   2026). A VM or a separate Windows user holding only this repo would be safer: Antigravity's own
   known-issues page lists data exfiltration and code execution through prompt injection, and
   isolation limits what a fooled agent can reach. Until then, the driver keeps the agents'
   allow-list exact and reads every diff before pushing.
3. **Antigravity CLI.** `agy`, signed in, with an exact allow-list; see `docs/RUNBOOK.md`.
4. **GitHub CLI** (still to do). `winget install --id GitHub.cli`, then `gh auth login`, so the
   driver can open and comment on pull requests itself.

## Per task

1. The driver picks a `todo` task from `docs/tasks/README.md` whose dependencies are done.
   Independent tasks run in parallel, two agents at a time.
2. The driver prepares a worktree and branch, runs the agent (`docs/RUNBOOK.md`), checks the
   result, commits it, pushes the branch and opens a pull request.
3. The driver reviews the pull request against the spec and the tests, and sends must-fix items
   back to the agent. If an agent fails the same thing twice, the driver splits the task or fixes
   the contract.
4. The driver merges once its review finds nothing that must be fixed (UI tasks only after
   Caíque's play-test), then sets the task to `done` on the board (`docs/tasks/README.md`).

## Play-tests

UI tasks and T08 end with a play-test on the PC connected to the keyboard: `git pull`, `npm ci`,
`npm run dev`, and follow the checklist in the task file. Record a session with
`tools/midi-check.html` whenever something feels off, and save it in `fixtures/sessions/`; it
becomes test data.

## Changing the plan

Spec, architecture, decisions and tests are the driver's to change, and Caíque approves any
change to what the game does. Agents propose; they don't edit those files.
