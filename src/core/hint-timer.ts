/**
 * T04 — The adaptive hint delay (T1), one per staff. Spec: docs/tasks/T04-hint-timer.md
 *
 * A weighted up-down staircase in log time. After an unaided read the delay is
 * multiplied by e^-downStep; after a hint or wrong note it is multiplied by
 * e^+upStep, with upStep = downStep * target / (1 - target). At equilibrium the
 * player reads `target` of the steps unaided (Kaernbach 1991).
 */
import type { Staff } from "./types";

export interface HintTimerConfig {
  /** Starting delay for both staves, in ms. */
  initialMs: number;
  /** The delay never shrinks below this. */
  minMs: number;
  /** The delay never grows past this. */
  maxMs: number;
  /** Share of steps the player should read without help. Must be in (0.5, 0.99]. */
  target: number;
  /** Downward step in natural-log units: an unaided read multiplies the delay by e^-downStep. */
  downStep: number;
}

export const DEFAULT_HINT_TIMER: Readonly<HintTimerConfig> = {
  initialMs: 2000,
  minMs: 400,
  maxMs: 6000,
  target: 0.85,
  downStep: 0.04,
};

/** Named targets offered in settings. */
export const TARGET_PRESETS = { gentle: 0.9, standard: 0.85, push: 0.75 } as const;

/** Upward step in natural-log units for a given target: downStep * target / (1 - target). */
export function upStep(target: number, downStep: number): number {
  return (downStep * target) / (1 - target);
}

export class HintTimer {
  readonly #config: HintTimerConfig;
  readonly #delays: Record<Staff, number>;

  /**
   * @param config Overrides for DEFAULT_HINT_TIMER. Throws RangeError if the result is invalid.
   * @param saved Delays restored from storage; each is clamped into [minMs, maxMs].
   */
  constructor(config: Partial<HintTimerConfig> = {}, saved: Partial<Record<Staff, number>> = {}) {
    const merged: HintTimerConfig = {
      ...DEFAULT_HINT_TIMER,
      ...config,
    };

    const { target, minMs, maxMs, initialMs, downStep } = merged;
    if (
      !Number.isFinite(target) ||
      !Number.isFinite(minMs) ||
      !Number.isFinite(maxMs) ||
      !Number.isFinite(initialMs) ||
      !Number.isFinite(downStep) ||
      target <= 0.5 ||
      target > 0.99 ||
      minMs <= 0 ||
      minMs > maxMs ||
      initialMs < minMs ||
      initialMs > maxMs ||
      downStep <= 0
    ) {
      throw new RangeError("Invalid hint timer configuration");
    }

    this.#config = merged;

    const clamp = (delay: number): number => Math.min(maxMs, Math.max(minMs, delay));
    this.#delays = {
      1: saved[1] !== undefined ? clamp(saved[1]) : initialMs,
      2: saved[2] !== undefined ? clamp(saved[2]) : initialMs,
    };
  }

  get config(): Readonly<HintTimerConfig> {
    return { ...this.#config };
  }

  /** Current delay for one staff, in ms. */
  delayMs(staff: Staff): number {
    return this.#delays[staff];
  }

  /** Current delays for both staves, for saving or for WaitEngine.setHintDelays. */
  delays(): Record<Staff, number> {
    return { ...this.#delays };
  }

  /** Records one reading attempt on a staff and returns the new delay. */
  record(staff: Staff, unaided: boolean): number {
    const current = this.#delays[staff];
    const step = unaided
      ? -this.#config.downStep
      : upStep(this.#config.target, this.#config.downStep);
    const next = current * Math.exp(step);
    const clamped = Math.min(this.#config.maxMs, Math.max(this.#config.minMs, next));
    this.#delays[staff] = clamped;
    return clamped;
  }
}
