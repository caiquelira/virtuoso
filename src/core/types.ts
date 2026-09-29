/**
 * Shared domain types. Plain data only: no DOM, no library types.
 *
 * Times are milliseconds on the performance.now() clock, the same clock Web MIDI
 * uses for MIDIMessageEvent.timeStamp.
 */

/** MIDI note number, 0–127. Middle C (C4) is 60. */
export type MidiNote = number;

/** Staff inside the piano part: 1 = upper staff (usually right hand), 2 = lower staff. */
export type Staff = 1 | 2;

export const STAVES: readonly Staff[] = [1, 2];

/** Lowest and highest keys on the player's keyboard, inclusive. */
export interface KeyboardRange {
  lowest: MidiNote;
  highest: MidiNote;
}

/** Yamaha PSR-E363: 61 keys, labelled C1–C6 by Yamaha, MIDI notes 36–96. */
export const PSR_E363_RANGE: KeyboardRange = { lowest: 36, highest: 96 };

/** Full 88-key piano, MIDI notes 21–108. */
export const PIANO_88_RANGE: KeyboardRange = { lowest: 21, highest: 108 };

/** One written note that starts (or continues a tie) at a step's position. */
export interface StepNote {
  /** Pitch as written in the score. */
  written: MidiNote;
  /** Key the player presses: `written` moved by whole octaves into the keyboard range. */
  expected: MidiNote;
  staff: Staff;
  /** MusicXML voice number, when the file has one. */
  voice?: number;
  /** Continues a tie from an earlier note: it keeps sounding and is not pressed again. */
  tiedFromPrevious: boolean;
  /** Grace note: shown in the score but not required in this version. */
  isGrace: boolean;
}

/** A position in the score where at least one note must be pressed. */
export interface Step {
  /** 0-based position in the piece's step list. */
  index: number;
  /** 0-based index of the measure (bar) that contains this step. */
  measureIndex: number;
  /** Position from the start of the piece in whole notes (0.25 = one quarter note). */
  timestamp: number;
  /**
   * Every note that starts here, including tie continuations and grace notes (flagged).
   * Sorted by staff, then by written pitch, ascending.
   */
  notes: StepNote[];
}

/** A keyboard event, already parsed from raw MIDI. Channels are numbered 1–16. */
export type InputEvent =
  | { type: "noteOn"; note: MidiNote; velocity: number; channel: number; time: number }
  | { type: "noteOff"; note: MidiNote; channel: number; time: number }
  | { type: "pedal"; down: boolean; value: number; channel: number; time: number };
