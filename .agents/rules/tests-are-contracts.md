---
trigger: glob
globs: tests/**, fixtures/**
---

Files under `tests/` and `fixtures/` are contracts written by the architect.

- Do not edit, skip, delete or weaken them unless your task file explicitly lists the file as
  yours to change.
- If a test looks wrong, stop. Write the question under **Questions** in your task file; the
  coordinator carries it into the pull request. Do not change the test to make it pass.
