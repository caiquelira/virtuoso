/**
 * T03 — Wait mode: the game waits at each step until every required key is pressed.
 * Spec: docs/tasks/T03-wait-engine.md
 *
 * Pure state machine. Time comes only from events and tick(), so tests are deterministic.
 */
import type { InputEvent, MidiNote, Staff, Step } from "./types";

export interface WaitEngineOptions {
  /** First step to play (index into the steps array). */
  from: number;
  /** Last step to play, inclusive. */
  to: number;
  /**
   * Hint delay per staff, in ms after the step starts. Read whenever hints are checked
   * and when a step completes, so setHintDelays() also affects the running step.
   */
  hintDelayMs: Record<Staff, number>;
}

export interface WrongNote {
  note: MidiNote;
  /** Staff of the nearest still-missing required pitch; ties go to staff 1. */
  staff: Staff;
  time: number;
}

export interface StaffOutcome {
  staff: Staff;
  /**
   * Every required pitch of this staff was pressed before startedAt + hint delay,
   * and no wrong note was attributed to this staff.
   */
  unaided: boolean;
  /** The hint for this staff was shown during the step. */
  hinted: boolean;
  /** Wrong notes attributed to this staff during the step. */
  wrongNotes: number;
}

export interface StepResult {
  stepIndex: number;
  startedAt: number;
  completedAt: number;
  /** One entry per staff that has required notes, staff 1 first. */
  staves: StaffOutcome[];
  wrongNotes: WrongNote[];
  /** Velocity of the press that satisfied each required pitch. */
  velocities: Record<MidiNote, number>;
  /** Time of the press that satisfied each required pitch. */
  pressedAt: Record<MidiNote, number>;
}

export type EngineOutput =
  | { type: "stepStarted"; stepIndex: number; time: number }
  | { type: "noteCorrect"; stepIndex: number; note: MidiNote; velocity: number; time: number }
  | { type: "noteWrong"; stepIndex: number; note: MidiNote; staff: Staff; time: number }
  | { type: "hintShown"; stepIndex: number; staff: Staff; notes: MidiNote[]; time: number }
  | { type: "stepCompleted"; result: StepResult; time: number }
  | { type: "finished"; time: number };

export class WaitEngine {
  constructor(steps: readonly Step[], options: WaitEngineOptions) {
    void steps;
    void options;
    throw new Error("Not implemented yet (task T03)");
  }

  /**
   * Starts at options.from and emits stepStarted. Steps without required notes are skipped.
   * Emits finished right away if there is nothing to play. Throws if called twice.
   */
  start(time: number): EngineOutput[] {
    void time;
    throw new Error("Not implemented yet (task T03)");
  }

  /** Feeds one keyboard event. Returns [] before start(), after finish, and for noteOff/pedal. */
  handle(event: InputEvent): EngineOutput[] {
    void event;
    throw new Error("Not implemented yet (task T03)");
  }

  /** Call regularly (every animation frame). Emits hintShown when a staff's delay has passed. */
  tick(time: number): EngineOutput[] {
    void time;
    throw new Error("Not implemented yet (task T03)");
  }

  setHintDelays(delays: Record<Staff, number>): void {
    void delays;
    throw new Error("Not implemented yet (task T03)");
  }

  /** Index of the step being played, or null before start() and after finish. */
  get currentStepIndex(): number | null {
    throw new Error("Not implemented yet (task T03)");
  }

  get isFinished(): boolean {
    throw new Error("Not implemented yet (task T03)");
  }
}
