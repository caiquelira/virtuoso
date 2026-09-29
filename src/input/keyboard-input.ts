import type { InputEvent } from "../core/types";

export type InputListener = (event: InputEvent) => void;

/**
 * A source of keyboard events: the real MIDI keyboard, the computer keyboard,
 * or a recorded session. The game works the same with any of them.
 */
export interface KeyboardInput {
  /** Shown in the UI, e.g. "Digital Keyboard (MIDI)". */
  readonly name: string;
  /**
   * Starts delivering events to `listener`. Resolves when ready. Rejects with an Error whose
   * message tells the player what to do (e.g. "Allow MIDI access in Chrome's address bar").
   */
  start(listener: InputListener): Promise<void>;
  /** Stops delivering events. Safe to call more than once. */
  stop(): void;
}
