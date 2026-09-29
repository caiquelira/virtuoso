# 0002 — Steps come from OSMD's parser, in written order

Status: accepted · 29 September 2026

**Decision.** Build the game's steps from OpenSheetMusicDisplay's own model (its iterator), not
from a separate MusicXML parser. Follow the written order with repeats not unfolded
(`CursorIgnoreRepetitions = true`).

**Why.** The display and the grading must agree on what a step is. Using the same parser for both
removes a whole class of mismatches (grace notes, ties, voices, repeats). Parsing works without
rendering, including in Node tests under jsdom (verified on OSMD 2.1.3).

**Cost.** The adapter depends on OSMD internals (`halfTone`, `NoteTie`, the iterator). They are
confined to `src/adapters/osmd-steps.ts`, the version is pinned, and fixture tests catch changes.

**Would change if** OSMD's model became unstable across versions, or parsing needed features OSMD
lacks. The fallback is our own MusicXML reader behind the same `ParsedScore` contract.
