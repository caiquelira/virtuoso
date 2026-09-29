/**
 * T06 — Computer-keyboard input, so the game can be developed and tested without a piano.
 * Spec: docs/tasks/T06-input-sources.md
 *
 * Layout by physical key (KeyboardEvent.code), like a piano on the home row:
 *   W E   T Y U   O P
 *  A S D F G H J K L ;
 * A = C, W = C#, S = D, E = D#, D = E, F = F, T = F#, G = G, Y = G#, H = A, U = A#, J = B,
 * K = C an octave up, O = C#, L = D, P = D#, Semicolon = E.
 * With octaveShift 0, A is middle C (60). Z and X shift an octave down and up.
 * Holding Shift plays loud (for testing voicing), otherwise medium.
 */
import type { MidiNote } from "../core/types";
import type { InputListener, KeyboardInput } from "./keyboard-input";

export const FAKE_VELOCITY = { normal: 80, loud: 112 } as const;
export const MIN_OCTAVE_SHIFT = -3;
export const MAX_OCTAVE_SHIFT = 3;

/** Maps a KeyboardEvent.code to a MIDI note, or null for keys outside the layout. */
export function codeToNote(code: string, octaveShift: number): MidiNote | null {
  void code;
  void octaveShift;
  throw new Error("Not implemented yet (task T06)");
}

/** Velocity for a key press: loud with Shift held, normal otherwise. */
export function velocityFor(shiftKey: boolean): number {
  void shiftKey;
  throw new Error("Not implemented yet (task T06)");
}

/** Listens to keydown/keyup on a target (default: window). Channel 1; ignores auto-repeat. */
export class FakeInput implements KeyboardInput {
  readonly name = "Computer keyboard";

  constructor(target?: EventTarget) {
    void target;
  }

  start(listener: InputListener): Promise<void> {
    void listener;
    return Promise.reject(new Error("Not implemented yet (task T06)"));
  }

  stop(): void {}
}
