import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOICING_MARGIN,
  gradeVoicing,
  melodyPitch,
  summarizeVoicing,
  type VoicingResult,
} from "../../src/core/voicing";
import { makeStep } from "../helpers/steps";

const chord = makeStep(0, [
  [64, 1],
  [67, 1],
  [72, 1],
  [48, 2],
]);

describe("melodyPitch", () => {
  it("picks the highest required key on staff 1", () => {
    expect(melodyPitch(chord)).toBe(72);
  });

  it("returns null when there is only one key to press", () => {
    expect(melodyPitch(makeStep(0, [[72, 1]]))).toBeNull();
    expect(
      melodyPitch(
        makeStep(0, [
          [72, 1],
          [72, 2],
        ]),
      ),
    ).toBeNull(); // same key in both staves
  });

  it("returns null when staff 1 has nothing new to press", () => {
    expect(
      melodyPitch(
        makeStep(0, [
          [48, 2],
          [55, 2],
        ]),
      ),
    ).toBeNull();
    expect(
      melodyPitch(
        makeStep(0, [
          [72, 1, { tiedFromPrevious: true }],
          [48, 2],
          [55, 2],
        ]),
      ),
    ).toBeNull();
  });

  it("ignores grace notes and uses folded pitches", () => {
    expect(
      melodyPitch(
        makeStep(0, [
          [74, 1, { isGrace: true }],
          [72, 1],
          [48, 2],
        ]),
      ),
    ).toBe(72);
    expect(
      melodyPitch(
        makeStep(0, [
          [100, 1, { expected: 88 }],
          [48, 2],
        ]),
      ),
    ).toBe(88);
  });

  it("follows the player's choice when it is a key of the step", () => {
    expect(melodyPitch(chord, 48)).toBe(48); // left-hand melody
    expect(melodyPitch(chord, 67)).toBe(67); // inner voice
    expect(melodyPitch(chord, 50)).toBe(72); // not in the step: back to the default
    expect(
      melodyPitch(
        makeStep(0, [
          [48, 2],
          [55, 2],
        ]),
        55,
      ),
    ).toBe(55);
  });
});

describe("gradeVoicing", () => {
  const velocities = { 64: 70, 67: 72, 72: 90, 48: 75 };

  it("measures how far the melody leads the loudest other key", () => {
    expect(gradeVoicing(chord, velocities)).toEqual({
      stepIndex: 0,
      melody: 72,
      melodyVelocity: 90,
      loudestOther: 75,
      meanOther: (70 + 72 + 75) / 3,
      lead: 15,
      stoodOut: true,
    });
  });

  it("uses a margin of 10 velocity units by default", () => {
    expect(DEFAULT_VOICING_MARGIN).toBe(10);
    expect(gradeVoicing(chord, { ...velocities, 72: 85 })?.stoodOut).toBe(true); // lead 10
    expect(gradeVoicing(chord, { ...velocities, 72: 84 })?.stoodOut).toBe(false); // lead 9
  });

  it("accepts a custom margin", () => {
    expect(gradeVoicing(chord, velocities, { marginVelocity: 20 })?.stoodOut).toBe(false);
    expect(gradeVoicing(chord, velocities, { marginVelocity: 15 })?.stoodOut).toBe(true);
  });

  it("reports a negative lead when the melody is softer", () => {
    const result = gradeVoicing(chord, { ...velocities, 72: 60 });
    expect(result?.lead).toBe(-15);
    expect(result?.stoodOut).toBe(false);
  });

  it("grades a chosen inner or left-hand melody against the other keys", () => {
    const result = gradeVoicing(chord, velocities, { melodyOverride: 48 });
    expect(result).toMatchObject({ melody: 48, melodyVelocity: 75, loudestOther: 90, lead: -15 });
  });

  it("only compares keys that belong to the step", () => {
    expect(gradeVoicing(chord, { ...velocities, 99: 127 })?.loudestOther).toBe(75);
  });

  it("returns null when it cannot grade", () => {
    expect(gradeVoicing(makeStep(0, [[72, 1]]), { 72: 90 })).toBeNull();
    expect(gradeVoicing(chord, { 64: 70, 72: 90, 48: 75 })).toBeNull(); // 67 has no velocity
  });
});

describe("summarizeVoicing", () => {
  const result = (lead: number, stoodOut: boolean): VoicingResult => ({
    stepIndex: 0,
    melody: 72,
    melodyVelocity: 80 + lead,
    loudestOther: 80,
    meanOther: 75,
    lead,
    stoodOut,
  });

  it("summarizes nothing as empty", () => {
    expect(summarizeVoicing([])).toEqual({ graded: 0, stoodOut: 0, rate: null, meanLead: null });
  });

  it("counts the chords where the melody stood out", () => {
    expect(
      summarizeVoicing([result(15, true), result(4, false), result(11, true), result(-6, false)]),
    ).toEqual({
      graded: 4,
      stoodOut: 2,
      rate: 0.5,
      meanLead: 6,
    });
  });
});
