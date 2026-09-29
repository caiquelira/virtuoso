import { describe, expect, it } from "vitest";
import type { InputEvent } from "../../src/core/types";
import { type EngineOutput, WaitEngine, type WaitEngineOptions } from "../../src/core/wait-engine";
import { makeSteps, type NoteSpec } from "../helpers/steps";

const on = (note: number, time: number, velocity = 80): InputEvent => ({
  type: "noteOn",
  note,
  velocity,
  channel: 1,
  time,
});
const off = (note: number, time: number): InputEvent => ({
  type: "noteOff",
  note,
  channel: 1,
  time,
});
const delays = (s1: number, s2 = s1) => ({ 1: s1, 2: s2 });
const types = (outputs: EngineOutput[]) => outputs.map((o) => o.type);

function engine(noteLists: NoteSpec[][], options: Partial<WaitEngineOptions> = {}) {
  const steps = makeSteps(...noteLists);
  return new WaitEngine(steps, {
    from: 0,
    to: steps.length - 1,
    hintDelayMs: delays(2000),
    ...options,
  });
}

function completion(outputs: EngineOutput[]) {
  const done = outputs.find((o) => o.type === "stepCompleted");
  if (done?.type !== "stepCompleted") throw new Error("expected stepCompleted");
  return done.result;
}

describe("WaitEngine: moving through steps", () => {
  it("starts at the first step", () => {
    const e = engine([[[60, 1]], [[62, 1]]]);
    expect(e.currentStepIndex).toBeNull();
    expect(e.start(0)).toEqual([{ type: "stepStarted", stepIndex: 0, time: 0 }]);
    expect(e.currentStepIndex).toBe(0);
    expect(e.isFinished).toBe(false);
  });

  it("completes a single-note step and starts the next one", () => {
    const e = engine([[[60, 1]], [[62, 1]]]);
    e.start(0);
    expect(e.handle(on(60, 500, 90))).toEqual([
      { type: "noteCorrect", stepIndex: 0, note: 60, velocity: 90, time: 500 },
      {
        type: "stepCompleted",
        time: 500,
        result: {
          stepIndex: 0,
          startedAt: 0,
          completedAt: 500,
          staves: [{ staff: 1, unaided: true, hinted: false, wrongNotes: 0 }],
          wrongNotes: [],
          velocities: { 60: 90 },
          pressedAt: { 60: 500 },
        },
      },
      { type: "stepStarted", stepIndex: 1, time: 500 },
    ]);
    expect(e.currentStepIndex).toBe(1);
  });

  it("waits for every note of a chord, in any order", () => {
    const e = engine([
      [
        [60, 1],
        [64, 1],
        [67, 1],
      ],
    ]);
    e.start(0);
    expect(types(e.handle(on(67, 100)))).toEqual(["noteCorrect"]);
    expect(types(e.handle(on(60, 150)))).toEqual(["noteCorrect"]);
    expect(types(e.handle(on(64, 200)))).toEqual(["noteCorrect", "stepCompleted", "finished"]);
  });

  it("finishes after the last step and then ignores everything", () => {
    const e = engine([[[60, 1]]]);
    e.start(0);
    expect(e.handle(on(60, 100))).toContainEqual({ type: "finished", time: 100 });
    expect(e.isFinished).toBe(true);
    expect(e.currentStepIndex).toBeNull();
    expect(e.handle(on(60, 200))).toEqual([]);
    expect(e.tick(10_000)).toEqual([]);
  });

  it("ignores events before start", () => {
    const e = engine([[[60, 1]]]);
    expect(e.handle(on(60, 0))).toEqual([]);
    expect(e.tick(5000)).toEqual([]);
  });

  it("throws if started twice", () => {
    const e = engine([[[60, 1]]]);
    e.start(0);
    expect(() => e.start(1)).toThrow();
  });

  it("plays only the requested range of steps", () => {
    const e = engine([[[60, 1]], [[62, 1]], [[64, 1]], [[65, 1]]], { from: 1, to: 2 });
    expect(e.start(0)).toEqual([{ type: "stepStarted", stepIndex: 1, time: 0 }]);
    expect(types(e.handle(on(62, 100)))).toEqual(["noteCorrect", "stepCompleted", "stepStarted"]);
    expect(types(e.handle(on(64, 200)))).toEqual(["noteCorrect", "stepCompleted", "finished"]);
  });

  it("skips steps with nothing to press", () => {
    const e = engine([
      [[60, 1, { tiedFromPrevious: true }]],
      [[62, 1]],
      [[71, 1, { isGrace: true }]],
      [[64, 1]],
    ]);
    expect(e.start(0)).toEqual([{ type: "stepStarted", stepIndex: 1, time: 0 }]);
    const out = e.handle(on(62, 100));
    expect(out.at(-1)).toEqual({ type: "stepStarted", stepIndex: 3, time: 100 });
  });

  it("finishes at once when the range has nothing to play", () => {
    const e = engine([[[60, 1, { isGrace: true }]]]);
    expect(e.start(0)).toEqual([{ type: "finished", time: 0 }]);
    expect(e.isFinished).toBe(true);
  });
});

describe("WaitEngine: judging key presses", () => {
  it("ignores note off and pedal events", () => {
    const e = engine([[[60, 1]]]);
    e.start(0);
    expect(e.handle(off(60, 10))).toEqual([]);
    expect(e.handle({ type: "pedal", down: true, value: 127, channel: 1, time: 20 })).toEqual([]);
  });

  it("ignores a second press of a key already counted", () => {
    const e = engine([
      [
        [60, 1],
        [64, 1],
      ],
    ]);
    e.start(0);
    e.handle(on(60, 100, 70));
    expect(e.handle(on(60, 150, 120))).toEqual([]);
    const result = completion(e.handle(on(64, 200, 90)));
    expect(result.velocities).toEqual({ 60: 70, 64: 90 });
    expect(result.pressedAt).toEqual({ 60: 100, 64: 200 });
  });

  it("reports a wrong note and keeps waiting", () => {
    const e = engine([[[60, 1]]]);
    e.start(0);
    expect(e.handle(on(62, 100))).toEqual([
      { type: "noteWrong", stepIndex: 0, note: 62, staff: 1, time: 100 },
    ]);
    const result = completion(e.handle(on(60, 300)));
    expect(result.staves).toEqual([{ staff: 1, unaided: false, hinted: false, wrongNotes: 1 }]);
    expect(result.wrongNotes).toEqual([{ note: 62, staff: 1, time: 100 }]);
  });

  it("attributes a wrong note to the staff of the nearest missing key", () => {
    const e = engine([
      [
        [72, 1],
        [48, 2],
      ],
    ]);
    e.start(0);
    const staffOf = (outputs: EngineOutput[]) => {
      const wrong = outputs[0];
      if (wrong?.type !== "noteWrong") throw new Error("expected noteWrong");
      return wrong.staff;
    };
    expect(staffOf(e.handle(on(50, 10)))).toBe(2);
    expect(staffOf(e.handle(on(70, 20)))).toBe(1);
    expect(staffOf(e.handle(on(60, 30)))).toBe(1); // 12 semitones from both: staff 1 wins the tie
    e.handle(on(72, 40)); // right hand done, only the left hand is missing
    expect(staffOf(e.handle(on(74, 50)))).toBe(2);
    const result = completion(e.handle(on(48, 60)));
    expect(result.staves).toEqual([
      { staff: 1, unaided: false, hinted: false, wrongNotes: 2 },
      { staff: 2, unaided: false, hinted: false, wrongNotes: 2 },
    ]);
  });

  it("needs a fresh press for a key still held from the previous step", () => {
    const e = engine([
      [[60, 1]],
      [
        [60, 1],
        [64, 1],
      ],
    ]);
    e.start(0);
    e.handle(on(60, 100)); // completes step 0; the key stays down
    expect(types(e.handle(on(64, 200)))).toEqual(["noteCorrect"]);
    expect(e.handle(off(60, 250))).toEqual([]);
    expect(types(e.handle(on(60, 300)))).toEqual(["noteCorrect", "stepCompleted", "finished"]);
  });

  it("lets one key count for a pitch written in both staves", () => {
    const e = engine([
      [
        [60, 1],
        [60, 2],
        [48, 2],
      ],
    ]);
    e.start(0);
    expect(types(e.handle(on(60, 100, 90)))).toEqual(["noteCorrect"]);
    const result = completion(e.handle(on(48, 200, 60)));
    expect(result.staves).toEqual([
      { staff: 1, unaided: true, hinted: false, wrongNotes: 0 },
      { staff: 2, unaided: true, hinted: false, wrongNotes: 0 },
    ]);
    expect(result.velocities).toEqual({ 48: 60, 60: 90 });
  });

  it("expects the folded key, not the written one", () => {
    const e = engine([[[31, 2, { expected: 43 }]]]);
    e.start(0);
    expect(types(e.handle(on(31, 100)))).toEqual(["noteWrong"]);
    expect(types(e.handle(on(43, 200)))).toEqual(["noteCorrect", "stepCompleted", "finished"]);
  });
});

describe("WaitEngine: hints", () => {
  it("shows a hint once the staff's delay has passed, and only once", () => {
    const e = engine([[[60, 1]]], { hintDelayMs: delays(1000) });
    e.start(0);
    expect(e.tick(999)).toEqual([]);
    expect(e.tick(1000)).toEqual([
      { type: "hintShown", stepIndex: 0, staff: 1, notes: [60], time: 1000 },
    ]);
    expect(e.tick(1500)).toEqual([]);
    const result = completion(e.handle(on(60, 1600)));
    expect(result.staves).toEqual([{ staff: 1, unaided: false, hinted: true, wrongNotes: 0 }]);
  });

  it("hints only the keys still missing", () => {
    const e = engine([
      [
        [60, 1],
        [64, 1],
        [67, 1],
      ],
    ]);
    e.start(0);
    e.handle(on(60, 100));
    expect(e.tick(2000)).toEqual([
      { type: "hintShown", stepIndex: 0, staff: 1, notes: [64, 67], time: 2000 },
    ]);
  });

  it("times each staff separately", () => {
    const e = engine(
      [
        [
          [72, 1],
          [48, 2],
        ],
      ],
      { hintDelayMs: delays(1000, 3000) },
    );
    e.start(0);
    e.handle(on(72, 500));
    expect(e.tick(1000)).toEqual([]);
    expect(e.tick(2999)).toEqual([]);
    expect(e.tick(3000)).toEqual([
      { type: "hintShown", stepIndex: 0, staff: 2, notes: [48], time: 3000 },
    ]);
    const result = completion(e.handle(on(48, 3500)));
    expect(result.staves).toEqual([
      { staff: 1, unaided: true, hinted: false, wrongNotes: 0 },
      { staff: 2, unaided: false, hinted: true, wrongNotes: 0 },
    ]);
  });

  it("shows staff 1's hint before staff 2's when both are due", () => {
    const e = engine([
      [
        [72, 1],
        [48, 2],
      ],
    ]);
    e.start(0);
    expect(e.tick(2000).map((o) => (o.type === "hintShown" ? o.staff : null))).toEqual([1, 2]);
  });

  it("counts a press at or after the delay as helped, even if no tick ran", () => {
    const late = engine([[[60, 1]]], { hintDelayMs: delays(1000) });
    late.start(0);
    expect(completion(late.handle(on(60, 1200))).staves[0]).toEqual({
      staff: 1,
      unaided: false,
      hinted: false,
      wrongNotes: 0,
    });

    const exact = engine([[[60, 1]]], { hintDelayMs: delays(1000) });
    exact.start(0);
    expect(completion(exact.handle(on(60, 1000))).staves[0]?.unaided).toBe(false);

    const early = engine([[[60, 1]]], { hintDelayMs: delays(1000) });
    early.start(0);
    expect(completion(early.handle(on(60, 999))).staves[0]?.unaided).toBe(true);
  });

  it("uses the hint delays in effect when hints are checked", () => {
    const e = engine([[[60, 1]], [[62, 1]]], { hintDelayMs: delays(2000) });
    e.start(0);
    e.handle(on(60, 100)); // step 1 starts at 100
    e.setHintDelays(delays(500));
    expect(e.tick(599)).toEqual([]);
    expect(e.tick(600)).toEqual([
      { type: "hintShown", stepIndex: 1, staff: 1, notes: [62], time: 600 },
    ]);
  });
});
