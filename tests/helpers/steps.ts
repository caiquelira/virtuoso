import type { Staff, Step, StepNote } from "../../src/core/types";

type NoteFlags = Partial<Pick<StepNote, "expected" | "tiedFromPrevious" | "isGrace" | "voice">>;

/** [written pitch, staff, optional flags]. `expected` defaults to `written`. */
export type NoteSpec = [written: number, staff: Staff, flags?: NoteFlags];

export function note(written: number, staff: Staff, flags: NoteFlags = {}): StepNote {
  return {
    written,
    expected: flags.expected ?? written,
    staff,
    ...(flags.voice === undefined ? {} : { voice: flags.voice }),
    tiedFromPrevious: flags.tiedFromPrevious ?? false,
    isGrace: flags.isGrace ?? false,
  };
}

export function makeStep(
  index: number,
  notes: NoteSpec[],
  at: { measureIndex?: number; timestamp?: number } = {},
): Step {
  return {
    index,
    measureIndex: at.measureIndex ?? Math.floor(index / 4),
    timestamp: at.timestamp ?? index * 0.25,
    notes: notes
      .map(([written, staff, flags]) => note(written, staff, flags))
      .sort((a, b) => a.staff - b.staff || a.written - b.written),
  };
}

/** One step per argument, in 4/4 quarter notes: index i, measure floor(i / 4), timestamp i / 4. */
export function makeSteps(...noteLists: NoteSpec[][]): Step[] {
  return noteLists.map((notes, i) => makeStep(i, notes));
}
