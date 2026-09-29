# Working together: Caíque, Claude and the agents

| Who | Does |
|---|---|
| Caíque | Product decisions, play-tests on the real keyboard, merges pull requests |
| Claude (Piano project on claude.ai) | Spec, architecture, contracts and tests, task files, pull-request reviews |
| Antigravity agents | One task at a time, on a branch, ending in a pull request |

The repository is the only channel between them. Anything not written here doesn't exist for the
next agent.

## One-time setup

1. **Repository.** Create an empty private GitHub repo named `piano-game`, then push this
   starter pack:
   ```
   git remote add origin https://github.com/<you>/piano-game.git
   git push -u origin main
   ```
   Tell Claude the repo name so it can read pull requests for review.
2. **Agent machine.** Run Antigravity in a VM (Hyper-V or VirtualBox) or at least a separate
   Windows user that holds only this repo: no SSH keys, cloud credentials, password manager or
   work files. Install Node.js 22 LTS and Git, clone, and run `npm ci`, `npm run typecheck` and
   `npm run lint` (both pass; most tests fail until their tasks are done).
3. **Agent credentials.** A fine-grained GitHub token for this repository only, with Contents and
   Pull requests set to read and write.
4. **Antigravity settings.** Terminal auto-execution **off**; allow-list only what the project
   needs (`npm run`, `npm test`, `npx vitest`, `npx biome`, `git`). Browser access limited to
   `localhost`. Commit before every agent run so any change can be rolled back.

Why the box: Antigravity's own known-issues page lists data exfiltration and code execution
through prompt injection, and researchers have shown injections that bypass its strictest
settings. Isolation limits what a fooled agent can reach.

## Per task

1. Pick a `todo` task from `docs/tasks/README.md` whose dependencies are done. T01–T05 can run
   in parallel, one agent each.
2. Start an agent with:
   > Implement `docs/tasks/T0X-….md`. Follow `AGENTS.md`. Change only the files the task
   > lists. When `npm run check:task -- T0X` passes, open a pull request using the template.
3. When the pull request is up, ask Claude in the Piano project: "Review PR #N against the
   spec." Claude reads the diff, checks it against the spec and tests, and lists changes.
4. Send requested changes back to the same agent. If the agent fails the same thing twice, bring
   its questions to Claude, who may split the task or fix the contract.
5. Merge, then set the task to `done` on the board (`docs/tasks/README.md`) in the same or a
   follow-up commit.

## Play-tests

UI tasks and T08 end with a play-test on the PC connected to the keyboard (not the agent VM):
`git pull`, `npm ci`, `npm run dev`, and follow the checklist in the task file. Record a session
with `tools/midi-check.html` whenever something feels off, and save it in `fixtures/sessions/`;
it becomes test data.

## Changing the plan

Spec, architecture, decisions and tests are Claude's to change, at your request. Agents propose;
they don't edit those files.
