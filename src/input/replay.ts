/**
 * T06 — Record real sessions and replay them, so agents can test with real playing data.
 * Spec: docs/tasks/T06-input-sources.md
 */
import type { InputEvent } from "../core/types";
import type { InputListener, KeyboardInput } from "./keyboard-input";

/** A recorded session as stored in fixtures/sessions/*.json. Times start at 0. */
export interface RecordedSession {
  version: 1;
  /** Input name at recording time, e.g. "Digital Keyboard". */
  device?: string;
  /** ISO date of the recording. */
  recordedAt?: string;
  events: InputEvent[];
}

/**
 * Re-times events so the first event lands at `startTime`, with gaps divided by `speed`
 * (2 = twice as fast). Returns new objects sorted by time; input order breaks ties.
 * Throws RangeError if speed <= 0.
 */
export function retime(events: readonly InputEvent[], startTime: number, speed = 1): InputEvent[] {
  void events;
  void startTime;
  void speed;
  throw new Error("Not implemented yet (task T06)");
}

/** Collects events while the player plays. Times are stored relative to the first event. */
export class SessionRecorder {
  constructor(device?: string) {
    void device;
  }

  add(event: InputEvent): void {
    void event;
    throw new Error("Not implemented yet (task T06)");
  }

  /** The recording so far, ready for JSON.stringify. */
  toSession(recordedAt?: Date): RecordedSession {
    void recordedAt;
    throw new Error("Not implemented yet (task T06)");
  }
}

/** Plays a recorded session back through the KeyboardInput interface, in real time. */
export class ReplayInput implements KeyboardInput {
  readonly name = "Recorded session";

  constructor(session: RecordedSession, speed = 1) {
    void session;
    void speed;
  }

  start(listener: InputListener): Promise<void> {
    void listener;
    return Promise.reject(new Error("Not implemented yet (task T06)"));
  }

  stop(): void {}
}
