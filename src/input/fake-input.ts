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

const KEY_TO_NOTE: Record<string, number> = {
  KeyA: 60,
  KeyW: 61,
  KeyS: 62,
  KeyE: 63,
  KeyD: 64,
  KeyF: 65,
  KeyT: 66,
  KeyG: 67,
  KeyY: 68,
  KeyH: 69,
  KeyU: 70,
  KeyJ: 71,
  KeyK: 72,
  KeyO: 73,
  KeyL: 74,
  KeyP: 75,
  Semicolon: 76,
};

/** Maps a KeyboardEvent.code to a MIDI note, or null for keys outside the layout. */
export function codeToNote(code: string, octaveShift: number): MidiNote | null {
  const base = KEY_TO_NOTE[code];
  if (base === undefined) {
    return null;
  }
  return base + octaveShift * 12;
}

/** Velocity for a key press: loud with Shift held, normal otherwise. */
export function velocityFor(shiftKey: boolean): number {
  return shiftKey ? FAKE_VELOCITY.loud : FAKE_VELOCITY.normal;
}

/** Listens to keydown/keyup on a target (default: window). Channel 1; ignores auto-repeat. */
export class FakeInput implements KeyboardInput {
  readonly name = "Computer keyboard";

  private target: EventTarget | undefined;
  private octaveShift = 0;
  private activeNotes = new Map<string, MidiNote>();
  private listener: InputListener | null = null;
  private keyDownHandler: ((event: Event) => void) | null = null;
  private keyUpHandler: ((event: Event) => void) | null = null;

  constructor(target?: EventTarget) {
    this.target = target ?? (typeof window !== "undefined" ? window : undefined);
  }

  start(listener: InputListener): Promise<void> {
    this.stop();
    this.listener = listener;

    this.keyDownHandler = (event: Event) => {
      this.handleKeyDown(event);
    };
    this.keyUpHandler = (event: Event) => {
      this.handleKeyUp(event);
    };

    this.target?.addEventListener("keydown", this.keyDownHandler);
    this.target?.addEventListener("keyup", this.keyUpHandler);

    return Promise.resolve();
  }

  stop(): void {
    if (this.keyDownHandler) {
      this.target?.removeEventListener("keydown", this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.keyUpHandler) {
      this.target?.removeEventListener("keyup", this.keyUpHandler);
      this.keyUpHandler = null;
    }
    this.activeNotes.clear();
    this.octaveShift = 0;
    this.listener = null;
  }

  private handleKeyDown(event: Event): void {
    if (!("code" in event)) {
      return;
    }
    const kbEvent = event as KeyboardEvent;
    if (kbEvent.repeat) {
      return;
    }

    if (kbEvent.code === "KeyZ") {
      this.octaveShift = Math.max(MIN_OCTAVE_SHIFT, this.octaveShift - 1);
      return;
    }
    if (kbEvent.code === "KeyX") {
      this.octaveShift = Math.min(MAX_OCTAVE_SHIFT, this.octaveShift + 1);
      return;
    }

    if (this.activeNotes.has(kbEvent.code)) {
      return;
    }

    const note = codeToNote(kbEvent.code, this.octaveShift);
    if (note === null) {
      return;
    }

    this.activeNotes.set(kbEvent.code, note);
    this.listener?.({
      type: "noteOn",
      note,
      velocity: velocityFor(kbEvent.shiftKey),
      channel: 1,
      time: kbEvent.timeStamp,
    });
  }

  private handleKeyUp(event: Event): void {
    if (!("code" in event)) {
      return;
    }
    const kbEvent = event as KeyboardEvent;
    const activeNote = this.activeNotes.get(kbEvent.code);
    if (activeNote !== undefined) {
      this.activeNotes.delete(kbEvent.code);
      this.listener?.({
        type: "noteOff",
        note: activeNote,
        channel: 1,
        time: kbEvent.timeStamp,
      });
    }
  }
}
