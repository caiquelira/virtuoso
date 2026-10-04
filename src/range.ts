import type { Step } from "./core/types";

export interface StepRange {
  from: number;
  to: number;
}

export interface BarRange {
  from: number;
  to: number;
}

/**
 * Returns default 1-based bar range [1, min(2, measureCount)].
 */
export function defaultBarRange(measureCount: number): BarRange {
  return {
    from: 1,
    to: Math.max(1, Math.min(2, measureCount)),
  };
}

/**
 * Clamps a 1-based bar range to valid values within 1..measureCount.
 */
export function clampBarRange(from: number, to: number, measureCount: number): BarRange {
  const max = Math.max(1, measureCount);
  const clampedFrom = Math.max(1, Math.min(max, Math.floor(from) || 1));
  const clampedTo = Math.max(clampedFrom, Math.min(max, Math.floor(to) || clampedFrom));
  return { from: clampedFrom, to: clampedTo };
}

/**
 * Finds the first and last step indices (0-based) for the selected 1-based bar range.
 * Returns null if no steps exist in that range.
 */
export function findRangeStepIndices(
  steps: readonly Step[],
  barFrom: number,
  barTo: number,
): StepRange | null {
  const measureFrom = barFrom - 1;
  const measureTo = barTo - 1;

  let firstIndex = -1;
  let lastIndex = -1;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step && step.measureIndex >= measureFrom && step.measureIndex <= measureTo) {
      if (firstIndex === -1) {
        firstIndex = i;
      }
      lastIndex = i;
    }
  }

  if (firstIndex === -1 || lastIndex === -1) {
    return null;
  }

  return { from: firstIndex, to: lastIndex };
}
