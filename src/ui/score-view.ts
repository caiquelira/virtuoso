/**
 * T07 — The score on screen: current bar plus the next one, a cursor on the current step,
 * and colored notes. Spec: docs/tasks/T07-score-view.md
 */
import type { ParsedScore } from "../adapters/osmd-steps";
import type { KeyboardRange, MidiNote, Step } from "../core/types";

/** How a written note is colored after the player acts on it. */
export type NoteMark = "correct" | "hinted" | "melodyStoodOut" | "melodyWeak";

export class ScoreView {
  constructor(container: HTMLElement) {
    void container;
  }

  /**
   * Loads MusicXML text into OSMD and returns its steps, built with stepsFromOsmd()
   * from the same OSMD instance so the display and the steps always agree.
   */
  load(xml: string, range: KeyboardRange): Promise<ParsedScore> {
    void xml;
    void range;
    return Promise.reject(new Error("Not implemented yet (task T07)"));
  }

  /** Renders measures first..last (0-based, inclusive). */
  showMeasures(first: number, last: number): void {
    void first;
    void last;
    throw new Error("Not implemented yet (task T07)");
  }

  /** Moves the cursor to a step. The step must be inside the rendered measures. */
  moveTo(step: Step): void {
    void step;
    throw new Error("Not implemented yet (task T07)");
  }

  /** Colors the written note(s) of `step` whose expected pitch is `pitch`. */
  mark(step: Step, pitch: MidiNote, mark: NoteMark): void {
    void step;
    void pitch;
    void mark;
    throw new Error("Not implemented yet (task T07)");
  }

  clearMarks(): void {
    throw new Error("Not implemented yet (task T07)");
  }
}
