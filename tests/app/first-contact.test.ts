import { describe, expect, it } from "vitest";
import type { Step } from "../../src/core/types";
import { FirstContactTracker } from "../../src/first-contact";

function makeStep(index: number, measureIndex: number): Step {
  return {
    index,
    measureIndex,
    timestamp: 0,
    notes: [
      {
        written: 60,
        expected: 60,
        staff: 1,
        voice: 1,
        isGrace: false,
        tiedFromPrevious: false,
      },
    ],
  };
}

describe("FirstContactTracker", () => {
  it("marks steps in fresh bars as first contact", () => {
    // Measure 0 has 2 steps, measure 1 has 1 step
    const steps = [makeStep(0, 0), makeStep(1, 0), makeStep(2, 1)];
    const tracker = new FirstContactTracker(steps);

    expect(tracker.isFirstContact(0)).toBe(true);
    expect(tracker.isFirstContact(1)).toBe(true);
    expect(tracker.isFirstContact(2)).toBe(true);
  });

  it("completes a bar once all its steps finish", () => {
    const steps = [makeStep(0, 0), makeStep(1, 0), makeStep(2, 1)];
    const tracker = new FirstContactTracker(steps);

    // Step 0 of measure 0
    const firstContact1 = tracker.recordStepCompleted(0);
    expect(firstContact1).toBe(true);
    expect(tracker.isBarCompleted(0)).toBe(false);

    // Step 1 of measure 0 (last step of measure 0)
    const firstContact2 = tracker.recordStepCompleted(0);
    expect(firstContact2).toBe(true);
    expect(tracker.isBarCompleted(0)).toBe(true);
    expect(tracker.isFirstContact(0)).toBe(false);

    // Step 2 of measure 1 (single-step bar)
    const firstContact3 = tracker.recordStepCompleted(1);
    expect(firstContact3).toBe(true);
    expect(tracker.isBarCompleted(1)).toBe(true);
    expect(tracker.isFirstContact(1)).toBe(false);
  });

  it("does not count repeats as first contact after resetPass", () => {
    const steps = [makeStep(0, 0), makeStep(1, 0)];
    const tracker = new FirstContactTracker(steps);

    // Pass 1: complete both steps of bar 0
    tracker.recordStepCompleted(0);
    tracker.recordStepCompleted(0);
    expect(tracker.isBarCompleted(0)).toBe(true);

    // Start loop 2
    tracker.resetPass();

    // Pass 2: repeats should return false for first contact
    expect(tracker.isFirstContact(0)).toBe(false);
    const pass2Step1 = tracker.recordStepCompleted(0);
    expect(pass2Step1).toBe(false);

    const pass2Step2 = tracker.recordStepCompleted(0);
    expect(pass2Step2).toBe(false);
  });

  it("keeps incomplete bars fresh if reset before completion", () => {
    const steps = [makeStep(0, 0), makeStep(1, 0)];
    const tracker = new FirstContactTracker(steps);

    // Only step 0 finishes, not step 1
    tracker.recordStepCompleted(0);
    expect(tracker.isBarCompleted(0)).toBe(false);

    // User aborts and resets
    tracker.resetPass();

    // Bar 0 was not completed, so it is still fresh
    expect(tracker.isFirstContact(0)).toBe(true);
    expect(tracker.recordStepCompleted(0)).toBe(true);
  });
});
