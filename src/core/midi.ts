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
  if (data.length !== 3) {
    return null;
  }

  const status = data[0];
  const d1 = data[1];
  const d2 = data[2];

  if (
    status === undefined ||
    d1 === undefined ||
    d2 === undefined ||
    !Number.isInteger(status) ||
    !Number.isInteger(d1) ||
    !Number.isInteger(d2) ||
    status < 0x80 ||
    status > 0xef ||
    d1 < 0 ||
    d1 > 127 ||
    d2 < 0 ||
    d2 > 127
  ) {
    return null;
  }

  const messageType = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  if (messageType === 0x90) {
    if (d2 > 0) {
      return {
        type: "noteOn",
        note: d1,
        velocity: d2,
        channel,
        time,
      };
    }
    return {
      type: "noteOff",
      note: d1,
      channel,
      time,
    };
  }

  if (messageType === 0x80) {
    return {
      type: "noteOff",
      note: d1,
      channel,
      time,
    };
  }

  if (messageType === 0xb0 && d1 === 64) {
    return {
      type: "pedal",
      down: d2 >= 64,
      value: d2,
      channel,
      time,
    };
  }

  return null;
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
  let lockedChannel: number | null = null;

  return {
    get channel(): number | null {
      return lockedChannel;
    },
    accept(event: InputEvent): boolean {
      if (lockedChannel === null) {
        if (event.type === "noteOn") {
          lockedChannel = event.channel;
        }
        return true;
      }
      return event.channel === lockedChannel;
    },
    reset(): void {
      lockedChannel = null;
    },
  };
}
