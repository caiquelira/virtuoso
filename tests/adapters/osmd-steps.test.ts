// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseScore } from "../../src/adapters/osmd-steps";
import { requiredPitches, requiredPitchesForStaff } from "../../src/core/steps";
import { PIANO_88_RANGE, type Step } from "../../src/core/types";

const fixture = (name: string) => readFileSync(`fixtures/musicxml/${name}`, "utf8");

/** Compact view of a step for comparisons: position plus required keys per staff. */
const summary = (step: Step) => ({
  measureIndex: step.measureIndex,
  timestamp: step.timestamp,
  staff1: requiredPitchesForStaff(step, 1),
  staff2: requiredPitchesForStaff(step, 2),
});

describe("parseScore", () => {
  it("reads two staves: title, measures and steps in order", async () => {
    const score = await parseScore(fixture("01-two-staves.musicxml"));
    expect(score.title).toBe("Fixture 01 - two staves");
    expect(score.measureCount).toBe(1);
    expect(score.steps.map(summary)).toEqual([
      { measureIndex: 0, timestamp: 0, staff1: [72], staff2: [48] },
      { measureIndex: 0, timestamp: 0.25, staff1: [74], staff2: [] },
      { measureIndex: 0, timestamp: 0.5, staff1: [76], staff2: [] },
    ]);
  });

  it("numbers steps by position and describes every note fully", async () => {
    const { steps } = await parseScore(fixture("01-two-staves.musicxml"));
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(steps[0]?.notes).toEqual([
      { written: 72, expected: 72, staff: 1, voice: 1, tiedFromPrevious: false, isGrace: false },
      { written: 48, expected: 48, staff: 2, voice: 5, tiedFromPrevious: false, isGrace: false },
    ]);
  });

  it("merges chords and voices, applies accidentals, and skips rests", async () => {
    const score = await parseScore(fixture("02-chords-accidentals-voices.musicxml"));
    expect(score.measureCount).toBe(2);
    expect(score.steps.map(summary)).toEqual([
      { measureIndex: 0, timestamp: 0, staff1: [67, 71, 74], staff2: [43] },
      { measureIndex: 0, timestamp: 0.25, staff1: [78], staff2: [] }, // F#5
      { measureIndex: 0, timestamp: 0.5, staff1: [], staff2: [46] }, // B-flat 2, right hand rests
      { measureIndex: 1, timestamp: 1, staff1: [69, 72, 76], staff2: [48] }, // two voices on staff 1
      { measureIndex: 1, timestamp: 1.5, staff1: [67, 71], staff2: [] },
    ]);
  });

  it("sorts notes by staff, then by written pitch", async () => {
    const { steps } = await parseScore(fixture("02-chords-accidentals-voices.musicxml"));
    const notes = steps[3]?.notes ?? [];
    expect(notes.map((n) => [n.staff, n.written])).toEqual([
      [1, 69],
      [1, 72],
      [1, 76],
      [2, 48],
    ]);
    expect(notes.map((n) => n.voice)).toEqual([2, 1, 1, 5]);
  });

  it("drops positions that only continue ties, and never requires tied or grace notes", async () => {
    const { steps } = await parseScore(fixture("03-ties-grace-range.musicxml"));
    expect(steps.map((s) => [s.measureIndex, s.timestamp])).toEqual([
      [0, 0],
      [0, 0.75],
      [1, 1],
      [1, 1.25],
    ]);
    expect(steps.map(requiredPitches)).toEqual([[43, 72], [74], [72], [88]]);

    const barTwo = steps[2]?.notes ?? [];
    const heldBass = barTwo.find((n) => n.staff === 2);
    expect(heldBass).toMatchObject({ written: 31, expected: 43, tiedFromPrevious: true });
    for (const n of barTwo.filter((n) => n.written === 71)) expect(n.isGrace).toBe(true);
    expect(steps.some((s) => requiredPitches(s).includes(71))).toBe(false);
  });

  it("folds notes outside the keyboard by octaves, keeping the written pitch", async () => {
    const { steps } = await parseScore(fixture("03-ties-grace-range.musicxml"));
    expect(steps[0]?.notes.find((n) => n.staff === 2)).toMatchObject({ written: 31, expected: 43 });
    expect(steps[3]?.notes[0]).toMatchObject({ written: 100, expected: 88 });
  });

  it("uses the keyboard range it is given", async () => {
    const { steps } = await parseScore(fixture("03-ties-grace-range.musicxml"), {
      range: PIANO_88_RANGE,
    });
    expect(steps.map(requiredPitches)).toEqual([[31, 72], [74], [72], [100]]);
  });

  it("follows the written order through repeat signs, once", async () => {
    const { steps } = await parseScore(fixture("04-repeat.musicxml"));
    expect(steps.map((s) => s.timestamp)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]);
    expect(steps.map((s) => s.measureIndex)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
  });

  it("gives every step at least one key to press", async () => {
    for (const name of [
      "01-two-staves.musicxml",
      "02-chords-accidentals-voices.musicxml",
      "03-ties-grace-range.musicxml",
      "04-repeat.musicxml",
    ]) {
      const { steps } = await parseScore(fixture(name));
      for (const step of steps) expect(requiredPitches(step).length).toBeGreaterThan(0);
    }
  });

  it("rejects text that is not a score", async () => {
    await expect(parseScore("this is not MusicXML")).rejects.toThrow();
  });
});

describe("the bundled sample", () => {
  it("parses the Bach chorale opening with the soprano on top", async () => {
    const xml = readFileSync("samples/bach-bwv269-opening.musicxml", "utf8");
    const score = await parseScore(xml);
    expect(score.title).toBe("Aus meines Herzens Grunde, BWV 269 (opening)");
    expect(score.measureCount).toBe(5);
    expect(score.steps).toHaveLength(16);
    expect(summary(score.steps[0] as Step)).toEqual({
      measureIndex: 0,
      timestamp: 0,
      staff1: [62, 67],
      staff2: [43, 59],
    });
  });
});
