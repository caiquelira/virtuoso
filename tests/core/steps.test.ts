import { describe, expect, it } from "vitest";
import {
  foldIntoRange,
  requiredNotes,
  requiredPitches,
  requiredPitchesForStaff,
  stavesOf,
} from "../../src/core/steps";
import { PIANO_88_RANGE, PSR_E363_RANGE } from "../../src/core/types";
import { makeStep } from "../helpers/steps";

describe("foldIntoRange", () => {
  it("leaves notes inside the range alone, including the edges", () => {
    expect(foldIntoRange(60, PSR_E363_RANGE)).toBe(60);
    expect(foldIntoRange(36, PSR_E363_RANGE)).toBe(36);
    expect(foldIntoRange(96, PSR_E363_RANGE)).toBe(96);
  });

  it("moves low notes up by whole octaves", () => {
    expect(foldIntoRange(31, PSR_E363_RANGE)).toBe(43); // G1 -> G2
    expect(foldIntoRange(35, PSR_E363_RANGE)).toBe(47);
    expect(foldIntoRange(21, PSR_E363_RANGE)).toBe(45); // A0 -> A2
  });

  it("moves high notes down by whole octaves", () => {
    expect(foldIntoRange(97, PSR_E363_RANGE)).toBe(85);
    expect(foldIntoRange(100, PSR_E363_RANGE)).toBe(88); // E7 -> E6
    expect(foldIntoRange(108, PSR_E363_RANGE)).toBe(96); // C8 -> C7
  });

  it("keeps every note of an 88-key piano as is on an 88-key range", () => {
    for (let n = 21; n <= 108; n++) expect(foldIntoRange(n, PIANO_88_RANGE)).toBe(n);
  });

  it("rejects ranges smaller than an octave", () => {
    expect(() => foldIntoRange(60, { lowest: 60, highest: 70 })).toThrow(RangeError);
  });
});

describe("required notes", () => {
  const step = makeStep(0, [
    [72, 1],
    [71, 1, { isGrace: true }],
    [64, 1, { tiedFromPrevious: true }],
    [48, 2],
    [72, 2],
  ]);

  it("excludes grace notes and tie continuations", () => {
    expect(requiredNotes(step).map((n) => n.written)).toEqual([72, 48, 72]);
  });

  it("lists distinct keys once, ascending", () => {
    expect(requiredPitches(step)).toEqual([48, 72]);
  });

  it("lists keys per staff", () => {
    expect(requiredPitchesForStaff(step, 1)).toEqual([72]);
    expect(requiredPitchesForStaff(step, 2)).toEqual([48, 72]);
  });

  it("uses the expected (folded) pitch, not the written one", () => {
    const low = makeStep(0, [[31, 2, { expected: 43 }]]);
    expect(requiredPitches(low)).toEqual([43]);
  });

  it("lists the staves that have something to press", () => {
    expect(stavesOf(step)).toEqual([1, 2]);
    expect(stavesOf(makeStep(0, [[48, 2]]))).toEqual([2]);
    expect(
      stavesOf(
        makeStep(0, [
          [60, 1, { tiedFromPrevious: true }],
          [48, 2],
        ]),
      ),
    ).toEqual([2]);
  });
});
