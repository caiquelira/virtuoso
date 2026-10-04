import "../src/styles.css";
import xml from "../fixtures/musicxml/02-chords-accidentals-voices.musicxml?raw";
import { requiredPitches } from "../src/core/steps";
import { PSR_E363_RANGE, type Step } from "../src/core/types";
import { melodyPitch } from "../src/core/voicing";
import { KeyStrip } from "../src/ui/key-strip";
import { ScoreView } from "../src/ui/score-view";

const scoreContainer = document.getElementById("score-container");
const keyStripContainer = document.getElementById("key-strip-container");
const statusEl = document.getElementById("status");

if (!scoreContainer || !keyStripContainer || !statusEl) {
  throw new Error("Missing required DOM elements in demo/view.html");
}

const scoreView = new ScoreView(scoreContainer);
const keyStrip = new KeyStrip(keyStripContainer, PSR_E363_RANGE);

let steps: Step[] = [];
let currentStepIndex = 0;
let measureCount = 0;
let renderedRange = { first: -1, last: -1 };

function updateStatus(): void {
  const step = steps[currentStepIndex];
  if (!step || !statusEl) return;
  const pitches = requiredPitches(step);
  const mel = melodyPitch(step) ?? requiredPitches(step).at(-1);
  statusEl.innerHTML =
    `Step <strong>${step.index + 1} / ${steps.length}</strong> | ` +
    `Measure <strong>${step.measureIndex + 1}</strong> | ` +
    `Timestamp <strong>${step.timestamp}</strong> | ` +
    `Required pitches: <strong>[${pitches.join(", ")}]</strong> | ` +
    `Melody pitch: <strong>${mel !== undefined ? mel : "none"}</strong>`;
}

function updateStep(): void {
  const step = steps[currentStepIndex];
  if (!step) return;

  const first = step.measureIndex;
  const last = Math.min(first + 1, measureCount - 1);

  if (renderedRange.first !== first || renderedRange.last !== last) {
    renderedRange = { first, last };
    scoreView.showMeasures(first, last);
  }

  scoreView.moveTo(step);
  updateStatus();
}

async function init(): Promise<void> {
  const parsed = await scoreView.load(xml, PSR_E363_RANGE);
  steps = parsed.steps;
  measureCount = parsed.measureCount;

  if (steps.length > 0) {
    currentStepIndex = 0;
    updateStep();
  }
}

document.getElementById("btn-prev")?.addEventListener("click", () => {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    updateStep();
  }
});

document.getElementById("btn-next")?.addEventListener("click", () => {
  if (currentStepIndex < steps.length - 1) {
    currentStepIndex++;
    updateStep();
  }
});

document.getElementById("btn-correct")?.addEventListener("click", () => {
  const step = steps[currentStepIndex];
  if (!step) return;
  for (const pitch of requiredPitches(step)) {
    scoreView.mark(step, pitch, "correct");
  }
});

document.getElementById("btn-hinted")?.addEventListener("click", () => {
  const step = steps[currentStepIndex];
  if (!step) return;
  for (const pitch of requiredPitches(step)) {
    scoreView.mark(step, pitch, "hinted");
  }
});

document.getElementById("btn-melody-stood-out")?.addEventListener("click", () => {
  const step = steps[currentStepIndex];
  if (!step) return;
  const mel = melodyPitch(step) ?? requiredPitches(step).at(-1) ?? step.notes[0]?.expected;
  if (mel !== undefined) {
    scoreView.mark(step, mel, "melodyStoodOut");
  }
});

document.getElementById("btn-melody-weak")?.addEventListener("click", () => {
  const step = steps[currentStepIndex];
  if (!step) return;
  const mel = melodyPitch(step) ?? requiredPitches(step).at(-1) ?? step.notes[0]?.expected;
  if (mel !== undefined) {
    scoreView.mark(step, mel, "melodyWeak");
  }
});

document.getElementById("btn-hint-keys")?.addEventListener("click", () => {
  const step = steps[currentStepIndex];
  if (!step) return;
  keyStrip.showHint(requiredPitches(step));
});

document.getElementById("btn-clear")?.addEventListener("click", () => {
  scoreView.clearMarks();
  keyStrip.clearHint();
});

document.getElementById("btn-theme")?.addEventListener("click", () => {
  const doc = document.documentElement;
  const isDark =
    doc.getAttribute("data-theme") === "dark" ||
    (!doc.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const nextTheme = isDark ? "light" : "dark";
  doc.setAttribute("data-theme", nextTheme);
  if (renderedRange.first >= 0) {
    scoreView.showMeasures(renderedRange.first, renderedRange.last);
    const step = steps[currentStepIndex];
    if (step) scoreView.moveTo(step);
  }
});

keyStripContainer.addEventListener("click", (e) => {
  const target = (e.target as Element | null)?.closest("[data-note]");
  if (!target) return;
  const noteStr = target.getAttribute("data-note");
  if (!noteStr) return;
  const note = Number.parseInt(noteStr, 10);
  if (Number.isNaN(note)) return;

  const step = steps[currentStepIndex];
  const pitches = step ? requiredPitches(step) : [];
  if (pitches.includes(note)) {
    keyStrip.press(note);
    setTimeout(() => keyStrip.release(note), 300);
  } else {
    keyStrip.flashWrong(note);
  }
});

void init();
