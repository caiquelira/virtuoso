/**
 * T01 — Parse raw MIDI messages into InputEvents. Spec: docs/tasks/T01-midi-messages.md
 */
import type { InputEvent } from "./types";

/**
 * Parses one complete MIDI message, as Web MIDI delivers it, into an InputEvent.
 * Returns null for messages the game does not use or for malformed data.
 *
 * - 0x9n note on with velocity > 0  -> noteOn
 * - 0x9n note on with velocity 0    -> noteOff (running-status convention)
 * - 0x8n note off                   -> noteOff (release velocity ignored)
 * - 0xBn controller 64 (sustain)    -> pedal, down when value >= 64
 * - anything else                   -> null
 *
 * `n` is the channel nibble: 0x90 is channel 1, 0x9F is channel 16.
 */
export function parseMidiMessage(data: ArrayLike<number>, time: number): InputEvent | null {
  void data;
  void time;
  throw new Error("Not implemented yet (task T01)");
}

/**
 * Keeps only events from one MIDI channel: the channel of the first noteOn seen
 * after creation or reset(). Before that first noteOn, noteOff and pedal events pass.
 * Protects against duplicate notes when the keyboard sends extra layers or
 * accompaniment on other channels.
 */
export interface ChannelLock {
  /** Returns true if the event should reach the game. May set the lock. */
  accept(event: InputEvent): boolean;
  /** The locked channel, or null if no noteOn has been seen yet. */
  readonly channel: number | null;
  reset(): void;
}

export function createChannelLock(): ChannelLock {
  throw new Error("Not implemented yet (task T01)");
}
