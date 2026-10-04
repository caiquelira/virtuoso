# Runbook: running the coding agents

How the driver (the Claude Code session on Caíque's PC, see `CLAUDE.md`) runs Antigravity
agents. Written from the first run, T01–T05 on 4 October 2026. Keep it current.

## Tools on the PC

| Tool | Version, place | Notes |
|---|---|---|
| Node.js | 24.14.0 | jsdom 30.1.1 and two of its dependencies ask for 24.15 or later, so `npm ci` prints EBADENGINE warnings. Tests pass anyway; updating Node 24 LTS removes them. |
| Antigravity CLI | `agy` 1.2.16, `%LOCALAPPDATA%\agy\bin\agy.exe` | Signed in. It is on the user PATH, but a shell opened before the install needs the full path. |
| Git | 2.53 for Windows | This clone has `core.autocrlf=false`, and `.gitattributes` keeps LF line endings, which Biome requires. |
| GitHub CLI | not installed | Without it you can push branches but can't open or comment on pull requests. Free fix: `winget install --id GitHub.cli`, then Caíque runs `gh auth login` once. |

## Agent permissions

They live in `%USERPROFILE%\.gemini\antigravity-cli\settings.json`, under `permissions.allow`.
The original file is saved beside it as `settings.json.bak-2026-10-04`. To see the rules in force:
`agy -p "/permissions" --output-format json`.

- npm and npx rules match the whole command line exactly. `command(npx vitest)` doesn't allow
  `npx vitest run tests/core/midi.test.ts`, and prefix and wildcard forms don't work either; only
  an exact rule such as `command(npm run check:task -- T01)` does.
- So each task needs its own exact rules: `command(npm run check:task -- <id>)`, plus
  `command(npx vitest run <file>)` for each of its test files (listed under `TASK_TESTS` in
  `scripts/check-task.mjs`). Shared rules: `command(npm run typecheck)`, `command(npm run lint)`
  and `command(npm run format)`. File writes: `write_file(src/)` and `write_file(docs/tasks/)`.
- Nothing else: no git, no `npm ci` or `npm install`, no dev server. Add a task's rules before its
  run; leaving them afterwards is harmless.

## One run

1. `git worktree add ../worktrees/<id> -b task/<id>-<name> main`, then `npm ci` in that folder.
   Expect 6 to 8 minutes per `npm ci`.
2. From the worktree, run the agent without a terminal:
   `agy -p "<prompt>" --output-format stream-json --print-timeout <limit>`.
   Save its standard output to `.coordination\runs\<id>.out.txt` and its standard error to
   `<id>.err.txt`, in the main checkout. stream-json records every tool call, so you can see what
   the agent ran and what was denied.
3. A run without a terminal can't ask for approval: a command that isn't allowed is denied, and
   the denial ends the run. Three of T01's four runs ended that way.
4. Run at most two agents at a time. Each T01–T05 run took 3 to 7 minutes.
5. Don't use `--sandbox`: without a terminal it denies every npm command.

## The prompt that worked

> Implement docs/tasks/<file>. Follow AGENTS.md, except that your branch already exists and you
> don't commit, push or open a pull request: the coordinator does that. Change only the files
> the task lists, plus Status and the implementer sections of your task file. Stop when
> `npm run check:task -- <id>` passes, or after two honest attempts at the same failure, with
> your questions written under Questions in the task file.
>
> This run has no terminal for approvals: a command that isn't on this list is denied and ends
> your run. Run only these, typed exactly: `npm run check:task -- <id>`,
> `npx vitest run <test file>`, `npm run typecheck`, `npm run lint`, `npm run format`. Don't run
> git or any other command; read and edit with your file tools. Write only under `src/` and
> `docs/tasks/`.

## After the run

1. `npm run check:task -- <id>` passes in the worktree.
2. `git status --porcelain` lists only the task's own files and its task file: nothing in
   `tests/`, `fixtures/` or `.agents/`, nothing else in `docs/`, and not `AGENTS.md`, `CLAUDE.md`,
   `package.json` or `package-lock.json`. Read the diff, too.
3. If both pass: commit as `<id>: <task title>`, push the branch, and open a pull request from
   `.github/pull_request_template.md` with the last lines of the check:task output. If either
   fails: don't push. Re-run the agent once in the same worktree with the failure added to its
   prompt, and if it fails again, stop and tell Caíque.

## UI tasks (T07, T08)

`check:task` has no task tests for them, and the agents have no allowed way to see the page.
Before their runs, decide how the work gets checked: for example an exact rule for
`npm run build`, a screenshot you take yourself, and then Caíque's play-test on the keyboard with
the checklist in the task file.
