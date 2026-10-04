import { describe, expect, it } from "vitest";
import type { Step } from "../../src/core/types";
import { clampBarRange, defaultBarRange, findRangeStepIndices } from "../../src/range";

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

describe("range utilities", () => {
  it("defaults bar range to first two bars", () => {
    expect(defaultBarRange(8)).toEqual({ from: 1, to: 2 });
    expect(defaultBarRange(1)).toEqual({ from: 1, to: 1 });
  });

  it("clamps bar range to valid values", () => {
    expect(clampBarRange(0, 10, 5)).toEqual({ from: 1, to: 5 });
    expect(clampBarRange(4, 2, 5)).toEqual({ from: 4, to: 4 });
  });

  it("finds step range indices for 1-based bar selection", () => {
    const steps = [
      makeStep(0, 0), // bar 1
      makeStep(1, 0), // bar 1
      makeStep(2, 1), // bar 2
      makeStep(3, 1), // bar 2
      makeStep(4, 2), // bar 3
    ];

    expect(findRangeStepIndices(steps, 1, 2)).toEqual({ from: 0, to: 3 });
    expect(findRangeStepIndices(steps, 2, 3)).toEqual({ from: 2, to: 4 });
    expect(findRangeStepIndices(steps, 3, 3)).toEqual({ from: 4, to: 4 });
    expect(findRangeStepIndices(steps, 4, 5)).toBeNull();
  });
});
