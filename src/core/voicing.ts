/**
 * T05 — Voicing: does the melody note stand out from the rest of the chord?
 * Spec: docs/tasks/T05-voicing.md
 *
 * MIDI velocity says how fast each key went down, which sets its loudness.
 * A step is well voiced when the melody note is louder than every other
 * required note by at least a margin.
 */
import { requiredPitches, requiredPitchesForStaff } from "./steps";
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
  const req = requiredPitches(step);
  if (req.length < 2) {
    return null;
  }
  if (override !== undefined && req.includes(override)) {
    return override;
  }
  const staff1 = requiredPitchesForStaff(step, 1);
  const highestStaff1 = staff1[staff1.length - 1];
  if (highestStaff1 === undefined) {
    return null;
  }
  return highestStaff1;
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
  const melody = melodyPitch(step, options.melodyOverride);
  if (melody === null) {
    return null;
  }

  const req = requiredPitches(step);
  for (const pitch of req) {
    if (velocities[pitch] === undefined) {
      return null;
    }
  }

  const melodyVelocity = velocities[melody];
  if (melodyVelocity === undefined) {
    return null;
  }

  const otherPitches = req.filter((pitch) => pitch !== melody);
  if (otherPitches.length === 0) {
    return null;
  }

  const otherVelocities: number[] = [];
  for (const pitch of otherPitches) {
    const v = velocities[pitch];
    if (v === undefined) {
      return null;
    }
    otherVelocities.push(v);
  }

  const loudestOther = Math.max(...otherVelocities);
  const sumOther = otherVelocities.reduce((sum, v) => sum + v, 0);
  const meanOther = sumOther / otherVelocities.length;
  const lead = melodyVelocity - loudestOther;
  const margin = options.marginVelocity ?? DEFAULT_VOICING_MARGIN;
  const stoodOut = lead >= margin;

  return {
    stepIndex: step.index,
    melody,
    melodyVelocity,
    loudestOther,
    meanOther,
    lead,
    stoodOut,
  };
}

export function summarizeVoicing(results: readonly VoicingResult[]): VoicingSummary {
  if (results.length === 0) {
    return {
      graded: 0,
      stoodOut: 0,
      rate: null,
      meanLead: null,
    };
  }

  const graded = results.length;
  let stoodOut = 0;
  let totalLead = 0;
  for (const r of results) {
    if (r.stoodOut) {
      stoodOut += 1;
    }
    totalLead += r.lead;
  }

  return {
    graded,
    stoodOut,
    rate: stoodOut / graded,
    meanLead: totalLead / graded,
  };
}
