import { describe, expect, it } from "vitest";
import { DEFAULT_HINT_TIMER, HintTimer, TARGET_PRESETS, upStep } from "../../src/core/hint-timer";

/** Small seeded random generator so the simulation is repeatable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("upStep", () => {
  it("balances the down step so the target share of reads is unaided", () => {
    expect(upStep(0.85, 0.04)).toBeCloseTo(0.2266667, 6);
    expect(upStep(0.9, 0.04)).toBeCloseTo(0.36, 9);
    expect(upStep(0.75, 0.04)).toBeCloseTo(0.12, 9);
  });
});

describe("HintTimer", () => {
  it("uses the documented defaults", () => {
    expect(DEFAULT_HINT_TIMER).toEqual({
      initialMs: 2000,
      minMs: 400,
      maxMs: 6000,
      target: 0.85,
      downStep: 0.04,
    });
    expect(TARGET_PRESETS).toEqual({ gentle: 0.9, standard: 0.85, push: 0.75 });
    const t = new HintTimer();
    expect(t.delayMs(1)).toBe(2000);
    expect(t.delayMs(2)).toBe(2000);
    expect(t.config).toEqual(DEFAULT_HINT_TIMER);
  });

  it("shrinks the delay about 4% after an unaided read", () => {
    const t = new HintTimer();
    expect(t.record(1, true)).toBeCloseTo(1921.58, 2);
    expect(t.delayMs(1)).toBeCloseTo(1921.58, 2);
  });

  it("grows the delay about 25% after a helped read at the 85% target", () => {
    const t = new HintTimer();
    expect(t.record(1, false)).toBeCloseTo(2508.82, 2);
  });

  it("grows by about 43% at the gentle target and 13% at the push target", () => {
    expect(new HintTimer({ target: TARGET_PRESETS.gentle }).record(1, false)).toBeCloseTo(
      2866.66,
      1,
    );
    expect(new HintTimer({ target: TARGET_PRESETS.push }).record(1, false)).toBeCloseTo(2254.99, 1);
  });

  it("keeps the staves independent", () => {
    const t = new HintTimer();
    t.record(2, false);
    expect(t.delayMs(1)).toBe(2000);
    expect(t.delayMs(2)).toBeCloseTo(2508.82, 2);
  });

  it("never goes past the limits", () => {
    const t = new HintTimer();
    for (let i = 0; i < 50; i++) t.record(1, false);
    expect(t.delayMs(1)).toBe(6000);
    for (let i = 0; i < 500; i++) t.record(1, true);
    expect(t.delayMs(1)).toBe(400);
  });

  it("restores saved delays, clamped into the limits", () => {
    const t = new HintTimer({}, { 1: 1500, 2: 9000 });
    expect(t.delayMs(1)).toBe(1500);
    expect(t.delayMs(2)).toBe(6000);
    expect(new HintTimer({}, { 1: 100 }).delayMs(1)).toBe(400);
    expect(new HintTimer({}, { 1: 100 }).delayMs(2)).toBe(2000);
  });

  it("returns a copy of the delays", () => {
    const t = new HintTimer();
    const snapshot = t.delays();
    expect(snapshot).toEqual({ 1: 2000, 2: 2000 });
    snapshot[1] = 1;
    expect(t.delayMs(1)).toBe(2000);
  });

  it("rejects settings that cannot work", () => {
    expect(() => new HintTimer({ target: 1 })).toThrow(RangeError);
    expect(() => new HintTimer({ target: 0.5 })).toThrow(RangeError);
    expect(() => new HintTimer({ minMs: 0 })).toThrow(RangeError);
    expect(() => new HintTimer({ minMs: 3000, maxMs: 2000 })).toThrow(RangeError);
    expect(() => new HintTimer({ initialMs: 7000 })).toThrow(RangeError);
    expect(() => new HintTimer({ downStep: 0 })).toThrow(RangeError);
  });

  it("names the setting that cannot work", () => {
    expect(() => new HintTimer({ target: 1 })).toThrow(/target/);
    expect(() => new HintTimer({ minMs: 0 })).toThrow(/minMs/);
    expect(() => new HintTimer({ minMs: 3000, maxMs: 2000 })).toThrow(/maxMs/);
    expect(() => new HintTimer({ initialMs: 7000 })).toThrow(/initialMs/);
    expect(() => new HintTimer({ downStep: 0 })).toThrow(/downStep/);
  });

  it("treats a saved delay that is not a finite number as missing", () => {
    const t = new HintTimer({}, { 1: Number.NaN, 2: Number.POSITIVE_INFINITY });
    expect(t.delayMs(1)).toBe(2000);
    expect(t.delayMs(2)).toBe(2000);
  });

  it.each([0.85, 0.75, 0.9])(
    "settles where a simulated reader succeeds %s of the time",
    (target) => {
      // The simulated reader is more likely to read in time when given more time:
      // p(d) = 1 / (1 + exp(-(ln d - ln 1500) / 0.3)).
      const readsInTime = (delay: number) =>
        1 / (1 + Math.exp(-(Math.log(delay) - Math.log(1500)) / 0.3));
      const random = mulberry32(20260929);
      const t = new HintTimer({ target });
      let counted = 0;
      let unaided = 0;
      for (let i = 0; i < 40_000; i++) {
        const ok = random() < readsInTime(t.delayMs(1));
        t.record(1, ok);
        if (i >= 2000) {
          counted++;
          if (ok) unaided++;
        }
      }
      expect(unaided / counted).toBeGreaterThan(target - 0.015);
      expect(unaided / counted).toBeLessThan(target + 0.015);
    },
  );
});
