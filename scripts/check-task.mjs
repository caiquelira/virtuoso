#!/usr/bin/env node
// Definition-of-done check for one task: typecheck, lint, the always-on tests, the tests of
// every task already marked "done" on the board, and the tests of the given task.
// Usage: npm run check:task -- T03
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TASK_TESTS = {
  T01: ["tests/core/midi.test.ts"],
  T02: ["tests/adapters/osmd-steps.test.ts"],
  T03: ["tests/core/wait-engine.test.ts"],
  T04: ["tests/core/hint-timer.test.ts"],
  T05: ["tests/core/voicing.test.ts"],
  T06: [
    "tests/adapters/web-midi.test.ts",
    "tests/input/fake-input.test.ts",
    "tests/input/replay.test.ts",
  ],
  T07: [],
  T08: [],
  T09: [
    "tests/core/hint-timer.test.ts",
    "tests/adapters/osmd-steps.test.ts",
    "tests/core/wait-engine.test.ts",
    "tests/core/voicing.test.ts",
  ],
};
const ALWAYS = ["tests/architecture.test.ts", "tests/core/steps.test.ts"];

const task = (process.argv[2] ?? "").toUpperCase();
if (!(task in TASK_TESTS)) {
  console.error(
    `Usage: npm run check:task -- <task>, where <task> is one of ${Object.keys(TASK_TESTS).join(", ")}`,
  );
  process.exit(2);
}

const board = readFileSync("docs/tasks/README.md", "utf8");
const done = [...board.matchAll(/^\|\s*\[(T\d\d)\][^|]*\|[^|]*\|\s*done\s*\|/gm)].map((m) => m[1]);
const files = [
  ...new Set([...ALWAYS, ...done.flatMap((t) => TASK_TESTS[t] ?? []), ...TASK_TESTS[task]]),
];

const steps = [
  ["typecheck", "npm run typecheck"],
  ["lint", "npm run lint"],
  ["tests", `npx vitest run ${files.join(" ")}`],
];

console.log(`Checking ${task}. Tasks marked done: ${done.length ? done.join(", ") : "none"}.`);
console.log(`Test files: ${files.join(", ")}\n`);
for (const [name, command] of steps) {
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n✗ ${name} failed for ${task}.`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${name}`);
}
console.log(`\nAll checks passed for ${task}.`);
