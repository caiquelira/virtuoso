/**
 * T06 — The real keyboard, through the Web MIDI API (Chrome, Edge, Firefox; not Safari).
 * Spec: docs/tasks/T06-input-sources.md
 *
 * Listens to every connected MIDI input, including ones plugged in later, parses messages
 * with parseMidiMessage() and filters them with a ChannelLock.
 */
import type { InputListener, KeyboardInput } from "../input/keyboard-input";

export class WebMidiInput implements KeyboardInput {
  readonly name = "MIDI keyboard";

  /**
   * Asks for MIDI access (the browser shows a permission prompt the first time), then
   * delivers events from all inputs. Rejects with a player-readable Error when the browser has
   * no Web MIDI or access is refused. Resolves even if no keyboard is connected yet.
   */
  start(listener: InputListener): Promise<void> {
    void listener;
    return Promise.reject(new Error("Not implemented yet (task T06)"));
  }

  /** Stops listening to all inputs and forgets the locked channel. Safe to call twice. */
  stop(): void {}

  /** Names of the inputs currently listened to, e.g. ["Digital Keyboard"]. */
  connectedInputs(): string[] {
    return [];
  }
}
