import type { Staff } from "./core/types";
import { summarizeVoicing, type VoicingResult, type VoicingSummary } from "./core/voicing";
import type { StepResult } from "./core/wait-engine";

export interface StaffSummary {
  staff: Staff;
  totalSteps: number;
  unaidedSteps: number;
  /** Share of steps read unaided, or null if staff had no steps. */
  unaidedRate: number | null;
}

export interface PracticeSummary {
  stepsPlayed: number;
  staves: Record<Staff, StaffSummary>;
  voicing: VoicingSummary;
  t1DelaysMs: Record<Staff, number>;
}

export function buildPracticeSummary(
  stepResults: readonly StepResult[],
  voicingResults: readonly VoicingResult[],
  t1DelaysMs: Record<Staff, number>,
): PracticeSummary {
  let staff1Total = 0;
  let staff1Unaided = 0;
  let staff2Total = 0;
  let staff2Unaided = 0;

  for (const result of stepResults) {
    for (const outcome of result.staves) {
      if (outcome.staff === 1) {
        staff1Total++;
        if (outcome.unaided) {
          staff1Unaided++;
        }
      } else if (outcome.staff === 2) {
        staff2Total++;
        if (outcome.unaided) {
          staff2Unaided++;
        }
      }
    }
  }

  const voicing = summarizeVoicing(voicingResults);

  return {
    stepsPlayed: stepResults.length,
    staves: {
      1: {
        staff: 1,
        totalSteps: staff1Total,
        unaidedSteps: staff1Unaided,
        unaidedRate: staff1Total > 0 ? staff1Unaided / staff1Total : null,
      },
      2: {
        staff: 2,
        totalSteps: staff2Total,
        unaidedSteps: staff2Unaided,
        unaidedRate: staff2Total > 0 ? staff2Unaided / staff2Total : null,
      },
    },
    voicing,
    t1DelaysMs: { ...t1DelaysMs },
  };
}

export function formatPercentage(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function formatLead(lead: number | null): string {
  if (lead === null) return "—";
  const rounded = Math.round(lead);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

export function formatT1Seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}
