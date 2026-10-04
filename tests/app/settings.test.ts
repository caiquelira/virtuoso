import { describe, expect, it } from "vitest";
import { HintTimer, TARGET_PRESETS } from "../../src/core/hint-timer";
import {
  clampInitialMs,
  createDefaultSettings,
  getHintTimerConfig,
  updatePreset,
  validateSettings,
} from "../../src/settings";

describe("settings", () => {
  it("creates default settings", () => {
    const s = createDefaultSettings();
    expect(s.targetPreset).toBe("standard");
    expect(s.target).toBe(TARGET_PRESETS.standard);
    expect(s.minT1Ms).toBe(400);
    expect(s.maxT1Ms).toBe(6000);
    expect(s.voicingMargin).toBe(10);
  });

  it("updates target preset correctly", () => {
    const s = createDefaultSettings();
    const gentle = updatePreset(s, "gentle");
    expect(gentle.targetPreset).toBe("gentle");
    expect(gentle.target).toBe(TARGET_PRESETS.gentle);

    const push = updatePreset(s, "push");
    expect(push.targetPreset).toBe("push");
    expect(push.target).toBe(TARGET_PRESETS.push);
  });

  describe("clampInitialMs", () => {
    it("clamps initialMs to minMs when initialMs is below minMs", () => {
      expect(clampInitialMs(2000, 3000, 6000)).toBe(3000);
    });

    it("clamps initialMs to maxMs when initialMs is above maxMs", () => {
      expect(clampInitialMs(2000, 400, 1500)).toBe(1500);
    });

    it("leaves initialMs unchanged when within [minMs, maxMs]", () => {
      expect(clampInitialMs(2000, 400, 6000)).toBe(2000);
    });
  });

  describe("validateSettings", () => {
    it("rejects when shortest T1 is greater than longest T1", () => {
      const res = validateSettings({
        preset: "standard",
        minT1Seconds: 3.5,
        maxT1Seconds: 2.0,
        voicingMargin: 10,
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toMatch(/shortest/i);
      }
    });

    it("accepts valid settings and converts seconds to ms", () => {
      const res = validateSettings({
        preset: "gentle",
        minT1Seconds: 0.5,
        maxT1Seconds: 1.5,
        voicingMargin: 12,
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.minT1Ms).toBe(500);
        expect(res.settings.maxT1Ms).toBe(1500);
        expect(res.settings.targetPreset).toBe("gentle");
        expect(res.settings.target).toBe(TARGET_PRESETS.gentle);
        expect(res.settings.voicingMargin).toBe(12);
      }
    });
  });

  it("HintTimer does not crash with extreme clamped min/max values", () => {
    // Longest T1 below 2.0s
    const configLow = getHintTimerConfig({
      targetPreset: "standard",
      target: TARGET_PRESETS.standard,
      minT1Ms: 400,
      maxT1Ms: 1500,
      voicingMargin: 10,
    });
    expect(() => new HintTimer(configLow)).not.toThrow();

    // Shortest T1 above 2.0s
    const configHigh = getHintTimerConfig({
      targetPreset: "standard",
      target: TARGET_PRESETS.standard,
      minT1Ms: 2500,
      maxT1Ms: 6000,
      voicingMargin: 10,
    });
    expect(() => new HintTimer(configHigh)).not.toThrow();
  });
});
