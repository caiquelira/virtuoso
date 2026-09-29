/**
 * T05 — Voicing: does the melody note stand out from the rest of the chord?
 * Spec: docs/tasks/T05-voicing.md
 *
 * MIDI velocity says how fast each key went down, which sets its loudness.
 * A step is well voiced when the melody note is louder than every other
 * required note by at least a margin.
 */
import type { MidiNote, Step } from "./types";

/** Starting guess for the margin, in MIDI velocity units. Tune it from calibration data. */
export const DEFAULT_VOICING_MARGIN = 10;

export interface VoicingOptions {
  /** Minimum velocity lead of the melody over the loudest other note. */
  marginVelocity: number;
  /** Key the player marked as this step's melody. Used only if it is a required pitch of the step. */
  melodyOverride?: MidiNote;
}

export interface VoicingResult {
  stepIndex: number;
  melody: MidiNote;
  melodyVelocity: number;
  /** Highest velocity among the other required pitches. */
  loudestOther: number;
  /** Mean velocity of the other required pitches. */
  meanOther: number;
  /** melodyVelocity - loudestOther. */
  lead: number;
  /** lead >= marginVelocity. */
  stoodOut: boolean;
}

export interface VoicingSummary {
  graded: number;
  stoodOut: number;
  /** stoodOut / graded, or null when nothing was graded. */
  rate: number | null;
  /** Mean lead over graded steps, or null when nothing was graded. */
  meanLead: number | null;
}

/**
 * The step's melody key.
 * Default: the highest required pitch on staff 1 (the "skyline" rule).
 * If `override` is one of the step's required pitches, it wins (for inner-voice or left-hand melodies).
 * Returns null when the step has fewer than two required pitches, or when there is no
 * override and staff 1 has no required note.
 */
export function melodyPitch(step: Step, override?: MidiNote): MidiNote | null {
  void step;
  void override;
  throw new Error("Not implemented yet (task T05)");
}

/**
 * Grades one completed step. `velocities` maps each required pitch to the velocity of the
 * press that satisfied it (WaitEngine StepResult.velocities).
 * Returns null when melodyPitch() is null or any required pitch has no velocity.
 */
export function gradeVoicing(
  step: Step,
  velocities: Readonly<Record<MidiNote, number>>,
  options: Partial<VoicingOptions> = {},
): VoicingResult | null {
  void step;
  void velocities;
  void options;
  throw new Error("Not implemented yet (task T05)");
}

export function summarizeVoicing(results: readonly VoicingResult[]): VoicingSummary {
  void results;
  throw new Error("Not implemented yet (task T05)");
}
