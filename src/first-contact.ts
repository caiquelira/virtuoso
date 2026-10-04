import type { Step } from "./core/types";

/**
 * Tracks first contact with bars in a session.
 * A bar is fresh until the player completes it once in this session.
 * After that, it trains memory, not reading, and repeats no longer change T1.
 */
export class FirstContactTracker {
  private readonly stepsPerMeasure = new Map<number, number>();
  private readonly completedBars = new Set<number>();
  private readonly stepsCompletedThisPass = new Map<number, number>();

  constructor(steps: readonly Step[] = []) {
    this.initSteps(steps);
  }

  /**
   * Initializes or updates the steps count per measure from the score.
   */
  initSteps(steps: readonly Step[]): void {
    this.stepsPerMeasure.clear();
    for (const step of steps) {
      const current = this.stepsPerMeasure.get(step.measureIndex) ?? 0;
      this.stepsPerMeasure.set(step.measureIndex, current + 1);
    }
  }

  /**
   * Whether the given bar has not yet been completed in this session.
   */
  isFirstContact(measureIndex: number): boolean {
    return !this.completedBars.has(measureIndex);
  }

  /**
   * Records that one step of `measureIndex` was completed.
   * Returns true if this step was part of the first time the bar is completed in this session.
   * If all steps of the bar have completed in this pass, marks the bar as completed.
   */
  recordStepCompleted(measureIndex: number): boolean {
    const wasFirstContact = this.isFirstContact(measureIndex);
    const count = (this.stepsCompletedThisPass.get(measureIndex) ?? 0) + 1;
    this.stepsCompletedThisPass.set(measureIndex, count);

    const totalInBar = this.stepsPerMeasure.get(measureIndex) ?? 1;
    if (count >= totalInBar) {
      this.completedBars.add(measureIndex);
    }
    return wasFirstContact;
  }

  /**
   * Resets the per-pass step counters (called at the start of each loop).
   * Completed bars remain completed for the session.
   */
  resetPass(): void {
    this.stepsCompletedThisPass.clear();
  }

  /**
   * Total number of bars completed in this session so far.
   */
  get completedBarCount(): number {
    return this.completedBars.size;
  }

  /**
   * Checks if a bar has been marked completed in this session.
   */
  isBarCompleted(measureIndex: number): boolean {
    return this.completedBars.has(measureIndex);
  }
}
