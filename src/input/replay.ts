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
  if (speed <= 0 || Number.isNaN(speed)) {
    throw new RangeError("Speed must be greater than zero");
  }
  if (events.length === 0) {
    return [];
  }

  const indexed = events.map((event, index) => ({ event, index }));
  indexed.sort((a, b) => {
    if (a.event.time !== b.event.time) {
      return a.event.time - b.event.time;
    }
    return a.index - b.index;
  });

  const first = indexed[0];
  if (!first) {
    return [];
  }
  const baseTime = first.event.time;

  return indexed.map(({ event }) => ({
    ...event,
    time: startTime + (event.time - baseTime) / speed,
  }));
}

/** Collects events while the player plays. Times are stored relative to the first event. */
export class SessionRecorder {
  private rawEvents: InputEvent[] = [];

  constructor(private device?: string) {}

  add(event: InputEvent): void {
    this.rawEvents.push({ ...event });
  }

  /** The recording so far, ready for JSON.stringify. */
  toSession(recordedAt?: Date): RecordedSession {
    const first = this.rawEvents[0];
    const baseTime = first !== undefined ? first.time : 0;
    const events = this.rawEvents.map((e) => ({
      ...e,
      time: e.time - baseTime,
    }));

    const session: RecordedSession = {
      version: 1,
      events,
    };

    if (this.device !== undefined) {
      session.device = this.device;
    }
    const date = recordedAt ?? new Date();
    session.recordedAt = date.toISOString();

    return session;
  }
}

/** Plays a recorded session back through the KeyboardInput interface, in real time. */
export class ReplayInput implements KeyboardInput {
  readonly name = "Recorded session";
  private listener: InputListener | null = null;
  private timers: Array<ReturnType<typeof setTimeout>> = [];

  constructor(
    private session: RecordedSession,
    private speed = 1,
  ) {
    if (speed <= 0 || Number.isNaN(speed)) {
      throw new RangeError("Speed must be greater than zero");
    }
  }

  start(listener: InputListener): Promise<void> {
    this.stop();
    this.listener = listener;

    const now = performance.now();
    const scheduled = retime(this.session.events, now, this.speed);

    for (const event of scheduled) {
      const delay = Math.max(0, event.time - now);
      const timer = setTimeout(() => {
        this.listener?.(event);
      }, delay);
      this.timers.push(timer);
    }

    return Promise.resolve();
  }

  stop(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
    this.listener = null;
  }
}
