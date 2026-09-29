/**
 * T07 — An on-screen keyboard under the score, covering the player's key range.
 * It echoes pressed keys faintly and lights the hint keys clearly.
 * Spec: docs/tasks/T07-score-view.md
 */
import type { KeyboardRange, MidiNote } from "../core/types";

export class KeyStrip {
  constructor(container: HTMLElement, range: KeyboardRange) {
    void container;
    void range;
  }

  press(note: MidiNote): void {
    void note;
    throw new Error("Not implemented yet (task T07)");
  }

  release(note: MidiNote): void {
    void note;
    throw new Error("Not implemented yet (task T07)");
  }

  /** Lights these keys until clearHint(). Replaces any previous hint. */
  showHint(notes: readonly MidiNote[]): void {
    void notes;
    throw new Error("Not implemented yet (task T07)");
  }

  clearHint(): void {
    throw new Error("Not implemented yet (task T07)");
  }

  /** Briefly marks a wrong key (about 400 ms). */
  flashWrong(note: MidiNote): void {
    void note;
    throw new Error("Not implemented yet (task T07)");
  }
}
