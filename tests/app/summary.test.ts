import { describe, expect, it } from "vitest";
import type { VoicingResult } from "../../src/core/voicing";
import type { StepResult } from "../../src/core/wait-engine";
import {
  buildPracticeSummary,
  formatLead,
  formatPercentage,
  formatT1Seconds,
} from "../../src/summary";

describe("PracticeSummary", () => {
  it("builds summary from step and voicing results", () => {
    const stepResults: StepResult[] = [
      {
        stepIndex: 0,
        startedAt: 100,
        completedAt: 500,
        staves: [
          { staff: 1, unaided: true, hinted: false, wrongNotes: 0 },
          { staff: 2, unaided: false, hinted: true, wrongNotes: 1 },
        ],
        wrongNotes: [],
        velocities: { 60: 80, 48: 60 },
        pressedAt: { 60: 400, 48: 500 },
      },
      {
        stepIndex: 1,
        startedAt: 600,
        completedAt: 900,
        staves: [{ staff: 1, unaided: true, hinted: false, wrongNotes: 0 }],
        wrongNotes: [],
        velocities: { 64: 85 },
        pressedAt: { 64: 900 },
      },
    ];

    const voicingResults: VoicingResult[] = [
      {
        stepIndex: 0,
        melody: 60,
        melodyVelocity: 80,
        loudestOther: 60,
        meanOther: 60,
        lead: 20,
        stoodOut: true,
      },
    ];

    const t1Delays = { 1: 1900, 2: 2500 };

    const summary = buildPracticeSummary(stepResults, voicingResults, t1Delays);

    expect(summary.stepsPlayed).toBe(2);
    expect(summary.staves[1].totalSteps).toBe(2);
    expect(summary.staves[1].unaidedSteps).toBe(2);
    expect(summary.staves[1].unaidedRate).toBe(1.0);

    expect(summary.staves[2].totalSteps).toBe(1);
    expect(summary.staves[2].unaidedSteps).toBe(0);
    expect(summary.staves[2].unaidedRate).toBe(0.0);

    expect(summary.voicing.graded).toBe(1);
    expect(summary.voicing.stoodOut).toBe(1);
    expect(summary.voicing.rate).toBe(1.0);
    expect(summary.voicing.meanLead).toBe(20);

    expect(summary.t1DelaysMs).toEqual({ 1: 1900, 2: 2500 });
  });

  it("handles empty results cleanly", () => {
    const summary = buildPracticeSummary([], [], { 1: 2000, 2: 2000 });

    expect(summary.stepsPlayed).toBe(0);
    expect(summary.staves[1].totalSteps).toBe(0);
    expect(summary.staves[1].unaidedRate).toBeNull();
    expect(summary.voicing.graded).toBe(0);
    expect(summary.voicing.rate).toBeNull();
    expect(summary.voicing.meanLead).toBeNull();
  });

  it("formats percentages, lead and T1 correctly", () => {
    expect(formatPercentage(0.854)).toBe("85%");
    expect(formatPercentage(null)).toBe("—");
    expect(formatLead(14.2)).toBe("+14");
    expect(formatLead(-3.1)).toBe("-3");
    expect(formatLead(null)).toBe("—");
    expect(formatT1Seconds(2000)).toBe("2.0 s");
    expect(formatT1Seconds(1850)).toBe("1.9 s");
  });
});
