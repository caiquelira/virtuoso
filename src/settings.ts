import { DEFAULT_HINT_TIMER, TARGET_PRESETS } from "./core/hint-timer";
import { DEFAULT_VOICING_MARGIN } from "./core/voicing";

export type TargetPreset = keyof typeof TARGET_PRESETS;

export interface AppSettings {
  targetPreset: TargetPreset;
  target: number;
  minT1Ms: number;
  maxT1Ms: number;
  voicingMargin: number;
}

export function createDefaultSettings(): AppSettings {
  return {
    targetPreset: "standard",
    target: TARGET_PRESETS.standard,
    minT1Ms: DEFAULT_HINT_TIMER.minMs,
    maxT1Ms: DEFAULT_HINT_TIMER.maxMs,
    voicingMargin: DEFAULT_VOICING_MARGIN,
  };
}

export function updatePreset(settings: AppSettings, preset: TargetPreset): AppSettings {
  return {
    ...settings,
    targetPreset: preset,
    target: TARGET_PRESETS[preset],
  };
}

/** Clamps initialMs into [minMs, maxMs] so HintTimer constructor never throws RangeError. */
export function clampInitialMs(initialMs: number, minMs: number, maxMs: number): number {
  return Math.min(Math.max(initialMs, minMs), maxMs);
}

export function getHintTimerConfig(
  settings: AppSettings,
  initialMs: number = DEFAULT_HINT_TIMER.initialMs,
): {
  target: number;
  minMs: number;
  maxMs: number;
  initialMs: number;
} {
  return {
    target: settings.target,
    minMs: settings.minT1Ms,
    maxMs: settings.maxT1Ms,
    initialMs: clampInitialMs(initialMs, settings.minT1Ms, settings.maxT1Ms),
  };
}

export type SettingsValidationResult =
  | { valid: true; settings: AppSettings }
  | { valid: false; error: string };

export function validateSettings(params: {
  preset: TargetPreset;
  minT1Seconds: number;
  maxT1Seconds: number;
  voicingMargin: number;
}): SettingsValidationResult {
  const { preset, minT1Seconds, maxT1Seconds, voicingMargin } = params;

  if (Number.isNaN(minT1Seconds) || Number.isNaN(maxT1Seconds)) {
    return {
      valid: false,
      error: "Please enter valid numbers for shortest and longest T1.",
    };
  }

  if (minT1Seconds > maxT1Seconds) {
    return {
      valid: false,
      error: "Shortest T1 cannot be greater than longest T1.",
    };
  }

  if (minT1Seconds <= 0 || maxT1Seconds <= 0) {
    return {
      valid: false,
      error: "T1 delays must be greater than 0.",
    };
  }

  const minMs = Math.max(100, Math.round(minT1Seconds * 1000));
  const maxMs = Math.max(minMs, Math.round(maxT1Seconds * 1000));

  return {
    valid: true,
    settings: {
      targetPreset: preset,
      target: TARGET_PRESETS[preset],
      minT1Ms: minMs,
      maxT1Ms: maxMs,
      voicingMargin: Math.max(1, voicingMargin),
    },
  };
}
