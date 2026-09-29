# 0001 — A TypeScript web app in Chrome or Edge

Status: accepted · 29 September 2026

**Decision.** Build the game as a TypeScript web app served by Vite and run in Chrome or Edge on
the player's Windows PC.

**Why.** The hardest part is showing real notation that can be stepped through and recolored
live, and the best free engraver for that, OpenSheetMusicDisplay, runs in the browser. Web MIDI
reads the keyboard with no drivers. PDF.js can show the original PDF next to the rendered bars.
Strict types give coding agents fast feedback.

**Rejected.** Python desktop (no live, recolorable notation view), Godot or Unity (no notation
engraver), C++ with Qt (PianoBooster's route: notation drawn by hand).

**Would change if** Web MIDI stopped working in Chromium browsers, or OSMD could no longer render
the player's scores.
