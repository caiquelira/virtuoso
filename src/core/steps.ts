import type { KeyboardRange, MidiNote, Staff, Step, StepNote } from "./types";

/**
 * Moves a note by whole octaves until it fits the keyboard.
 * The range must span at least one octave, or no octave move could reach every pitch class.
 */
export function foldIntoRange(note: MidiNote, range: KeyboardRange): MidiNote {
  if (range.highest - range.lowest < 11) {
    throw new RangeError(
      `Keyboard range ${range.lowest}–${range.highest} is smaller than one octave.`,
    );
  }
  let folded = note;
  while (folded < range.lowest) folded += 12;
  while (folded > range.highest) folded -= 12;
  return folded;
}

/** Notes the player must press: everything except tie continuations and grace notes. */
export function requiredNotes(step: Step): StepNote[] {
  return step.notes.filter((n) => !n.tiedFromPrevious && !n.isGrace);
}

/** Distinct keys to press for a step, ascending. A pitch written in both staves counts once. */
export function requiredPitches(step: Step): MidiNote[] {
  return uniqueSorted(requiredNotes(step).map((n) => n.expected));
}

/** Distinct keys to press on one staff, ascending. */
export function requiredPitchesForStaff(step: Step, staff: Staff): MidiNote[] {
  return uniqueSorted(
    requiredNotes(step)
      .filter((n) => n.staff === staff)
      .map((n) => n.expected),
  );
}

/** Staves that have at least one required note in this step, ascending. */
export function stavesOf(step: Step): Staff[] {
  const staves = new Set<Staff>();
  for (const n of requiredNotes(step)) staves.add(n.staff);
  return [...staves].sort((a, b) => a - b);
}

function uniqueSorted(values: MidiNote[]): MidiNote[] {
  return [...new Set(values)].sort((a, b) => a - b);
}
