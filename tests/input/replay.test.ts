import { describe, expect, it } from "vitest";
import type { InputEvent } from "../../src/core/types";
import { retime, SessionRecorder } from "../../src/input/replay";

const on = (note: number, time: number): InputEvent => ({
  type: "noteOn",
  note,
  velocity: 80,
  channel: 1,
  time,
});
const off = (note: number, time: number): InputEvent => ({
  type: "noteOff",
  note,
  channel: 1,
  time,
});

describe("retime", () => {
  it("moves the first event to the start time and keeps the gaps", () => {
    expect(retime([on(60, 100), off(60, 350), on(62, 400)], 1000)).toEqual([
      on(60, 1000),
      off(60, 1250),
      on(62, 1300),
    ]);
  });

  it("divides the gaps by the speed", () => {
    expect(retime([on(60, 0), on(62, 400)], 0, 2).map((e) => e.time)).toEqual([0, 200]);
    expect(retime([on(60, 0), on(62, 400)], 0, 0.5).map((e) => e.time)).toEqual([0, 800]);
  });

  it("sorts by time and keeps the input order for equal times", () => {
    const out = retime([on(64, 50), on(60, 0), on(67, 0)], 0);
    expect(out.map((e) => (e.type === "noteOn" ? e.note : null))).toEqual([60, 67, 64]);
  });

  it("does not change the events it was given", () => {
    const events = [on(60, 100)];
    retime(events, 0);
    expect(events).toEqual([on(60, 100)]);
  });

  it("handles an empty list and rejects a speed of zero or less", () => {
    expect(retime([], 0)).toEqual([]);
    expect(() => retime([on(60, 0)], 0, 0)).toThrow(RangeError);
    expect(() => retime([on(60, 0)], 0, -1)).toThrow(RangeError);
  });
});

describe("SessionRecorder", () => {
  it("stores events with times relative to the first one", () => {
    const recorder = new SessionRecorder("Digital Keyboard");
    recorder.add(on(60, 5000));
    recorder.add(off(60, 5300));
    recorder.add({ type: "pedal", down: true, value: 127, channel: 1, time: 5400 });
    expect(recorder.toSession(new Date("2026-09-29T12:00:00Z"))).toEqual({
      version: 1,
      device: "Digital Keyboard",
      recordedAt: "2026-09-29T12:00:00.000Z",
      events: [
        on(60, 0),
        off(60, 300),
        { type: "pedal", down: true, value: 127, channel: 1, time: 400 },
      ],
    });
  });

  it("round-trips through JSON", () => {
    const recorder = new SessionRecorder();
    recorder.add(on(60, 10));
    const session = recorder.toSession(new Date("2026-09-29T12:00:00Z"));
    expect(JSON.parse(JSON.stringify(session))).toEqual(session);
    expect(session.device).toBeUndefined();
  });
});
