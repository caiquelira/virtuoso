# 0005 — Tests are contracts; implementers don't edit them

Status: accepted · 29 September 2026

**Decision.** The architect writes the interfaces and tests for each task before implementation.
Implementing agents make them pass without editing tests or fixtures, and raise questions when a
test looks wrong.

**Why.** It gives cheaper implementing models a precise, checkable target, and stops the common
failure where an agent edits a test to make it pass. Every test in the starter pack was checked
against a private reference implementation before hand-off, so a failing test means the code is
wrong, not the test.

**Would change if** a task is exploratory (UI polish, new features): those get acceptance
criteria and screenshots instead of unit tests.
