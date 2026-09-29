# 0003 — One adaptive hint delay per staff, keys only

Status: accepted · 29 September 2026

**Decision.** When a staff's keys are still missing after its delay T1, light those keys; never
show note names. T1 adapts per staff with a weighted up-down staircase in log time that targets
85% unaided reads by default. Only first contact with a bar and fresh-reading bars update it.

**Why.** Hints after a real attempt act as feedback rather than constant guidance. A learned delay
serves both very slow and fast readers without manual tuning, and the staircase has a known
equilibrium (Kaernbach 1991). The player chose keys only (29 September 2026).

**Would change if** play-tests show 85% feels wrong: the target is a setting, and presets exist.
