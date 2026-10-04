/**
 * T03 — Wait mode: the game waits at each step until every required key is pressed.
 * Spec: docs/tasks/T03-wait-engine.md
 *
 * Pure state machine. Time comes only from events and tick(), so tests are deterministic.
 */
import { requiredPitches, requiredPitchesForStaff, stavesOf } from "./steps";
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
   * Every required pitch of this staff was pressed before startedAt + hint delay, no wrong
   * note was attributed to this staff, and its hint was not shown.
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

interface StepState {
  readonly arrayIndex: number;
  readonly index: number;
  readonly startedAt: number;
  readonly requiredPitches: readonly MidiNote[];
  readonly requiredSet: ReadonlySet<MidiNote>;
  readonly staffPitches: Record<Staff, readonly MidiNote[]>;
  readonly staves: readonly Staff[];
  readonly pressedKeys: Set<MidiNote>;
  readonly velocities: Record<MidiNote, number>;
  readonly pressedAt: Record<MidiNote, number>;
  readonly wrongNotes: WrongNote[];
  readonly wrongNotesCount: Record<Staff, number>;
  readonly hintShown: Record<Staff, boolean>;
}

export class WaitEngine {
  readonly #steps: readonly Step[];
  readonly #from: number;
  readonly #to: number;
  #hintDelayMs: Record<Staff, number>;
  #started = false;
  #finished = false;
  #currentStep: StepState | null = null;

  constructor(steps: readonly Step[], options: WaitEngineOptions) {
    this.#steps = steps;
    this.#from = options.from;
    this.#to = options.to;
    this.#hintDelayMs = { 1: options.hintDelayMs[1], 2: options.hintDelayMs[2] };
  }

  /**
   * Starts at options.from and emits stepStarted. Steps without required notes are skipped.
   * Emits finished right away if there is nothing to play. Throws if called twice.
   */
  start(time: number): EngineOutput[] {
    if (this.#started) {
      throw new Error("WaitEngine has already been started");
    }
    this.#started = true;

    const firstPlayableIndex = this.#findNextPlayableStep(this.#from);
    if (firstPlayableIndex === null) {
      this.#finished = true;
      this.#currentStep = null;
      return [{ type: "finished", time }];
    }

    const stepState = this.#initStep(firstPlayableIndex, time);
    if (!stepState) {
      this.#finished = true;
      this.#currentStep = null;
      return [{ type: "finished", time }];
    }

    return [{ type: "stepStarted", stepIndex: stepState.index, time }];
  }

  /** Feeds one keyboard event. Returns [] before start(), after finish, and for noteOff/pedal. */
  handle(event: InputEvent): EngineOutput[] {
    if (!this.#started || this.#finished || this.#currentStep === null) {
      return [];
    }
    if (event.type !== "noteOn") {
      return [];
    }

    const currentStep = this.#currentStep;
    const { note, velocity, time } = event;

    if (!currentStep.requiredSet.has(note)) {
      const missingPitches = currentStep.requiredPitches.filter(
        (p) => !currentStep.pressedKeys.has(p),
      );
      if (missingPitches.length === 0) {
        return [];
      }

      let minDist = Number.POSITIVE_INFINITY;
      for (const p of missingPitches) {
        const dist = Math.abs(p - note);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      let attributedStaff: Staff = 2;
      for (const p of missingPitches) {
        if (Math.abs(p - note) === minDist) {
          if (currentStep.staffPitches[1].includes(p)) {
            attributedStaff = 1;
            break;
          }
        }
      }

      const wrongNote: WrongNote = {
        note,
        staff: attributedStaff,
        time,
      };
      currentStep.wrongNotes.push(wrongNote);
      currentStep.wrongNotesCount[attributedStaff] += 1;

      return [
        {
          type: "noteWrong",
          stepIndex: currentStep.index,
          note,
          staff: attributedStaff,
          time,
        },
      ];
    }

    if (currentStep.pressedKeys.has(note)) {
      return [];
    }

    currentStep.pressedKeys.add(note);
    currentStep.velocities[note] = velocity;
    currentStep.pressedAt[note] = time;

    const outputs: EngineOutput[] = [
      {
        type: "noteCorrect",
        stepIndex: currentStep.index,
        note,
        velocity,
        time,
      },
    ];

    if (currentStep.pressedKeys.size === currentStep.requiredPitches.length) {
      const result = this.#buildStepResult(currentStep, time);
      outputs.push({
        type: "stepCompleted",
        result,
        time,
      });

      const nextPlayableIndex = this.#findNextPlayableStep(currentStep.arrayIndex + 1);
      if (nextPlayableIndex !== null) {
        const nextStepState = this.#initStep(nextPlayableIndex, time);
        if (nextStepState) {
          outputs.push({
            type: "stepStarted",
            stepIndex: nextStepState.index,
            time,
          });
        } else {
          this.#finished = true;
          this.#currentStep = null;
          outputs.push({
            type: "finished",
            time,
          });
        }
      } else {
        this.#finished = true;
        this.#currentStep = null;
        outputs.push({
          type: "finished",
          time,
        });
      }
    }

    return outputs;
  }

  /** Call regularly (every animation frame). Emits hintShown when a staff's delay has passed. */
  tick(time: number): EngineOutput[] {
    if (!this.#started || this.#finished || this.#currentStep === null) {
      return [];
    }

    const currentStep = this.#currentStep;
    const outputs: EngineOutput[] = [];

    for (const staff of [1, 2] as const) {
      if (currentStep.hintShown[staff]) {
        continue;
      }
      const staffKeys = currentStep.staffPitches[staff];
      if (staffKeys.length === 0) {
        continue;
      }
      const missingKeys = staffKeys.filter((k) => !currentStep.pressedKeys.has(k));
      if (missingKeys.length === 0) {
        continue;
      }
      const delay = this.#hintDelayMs[staff];
      if (time >= currentStep.startedAt + delay) {
        currentStep.hintShown[staff] = true;
        outputs.push({
          type: "hintShown",
          stepIndex: currentStep.index,
          staff,
          notes: [...missingKeys].sort((a, b) => a - b),
          time,
        });
      }
    }

    return outputs;
  }

  setHintDelays(delays: Record<Staff, number>): void {
    this.#hintDelayMs = { 1: delays[1], 2: delays[2] };
  }

  /** Index of the step being played, or null before start() and after finish. */
  get currentStepIndex(): number | null {
    if (!this.#started || this.#finished || this.#currentStep === null) {
      return null;
    }
    return this.#currentStep.index;
  }

  get isFinished(): boolean {
    return this.#finished;
  }

  #findNextPlayableStep(startIndex: number): number | null {
    const maxIndex = Math.min(this.#to, this.#steps.length - 1);
    for (let i = Math.max(this.#from, startIndex); i <= maxIndex; i++) {
      const step = this.#steps[i];
      if (step && requiredPitches(step).length > 0) {
        return i;
      }
    }
    return null;
  }

  #initStep(arrayIndex: number, time: number): StepState | null {
    const step = this.#steps[arrayIndex];
    if (!step) {
      return null;
    }
    const reqPitches = requiredPitches(step);
    const stepState: StepState = {
      arrayIndex,
      index: step.index,
      startedAt: time,
      requiredPitches: reqPitches,
      requiredSet: new Set(reqPitches),
      staffPitches: {
        1: requiredPitchesForStaff(step, 1),
        2: requiredPitchesForStaff(step, 2),
      },
      staves: stavesOf(step),
      pressedKeys: new Set<MidiNote>(),
      velocities: {},
      pressedAt: {},
      wrongNotes: [],
      wrongNotesCount: { 1: 0, 2: 0 },
      hintShown: { 1: false, 2: false },
    };
    this.#currentStep = stepState;
    return stepState;
  }

  #buildStepResult(step: StepState, completedAt: number): StepResult {
    const staves: StaffOutcome[] = step.staves.map((staff) => {
      const staffKeys = step.staffPitches[staff];
      const delay = this.#hintDelayMs[staff];
      const deadline = step.startedAt + delay;
      const allBeforeDeadline = staffKeys.every(
        (k) => (step.pressedAt[k] ?? Number.POSITIVE_INFINITY) < deadline,
      );
      const noWrongNotes = step.wrongNotesCount[staff] === 0;
      const notHinted = !step.hintShown[staff];
      const unaided = notHinted && noWrongNotes && allBeforeDeadline;

      return {
        staff,
        unaided,
        hinted: step.hintShown[staff],
        wrongNotes: step.wrongNotesCount[staff],
      };
    });

    return {
      stepIndex: step.index,
      startedAt: step.startedAt,
      completedAt,
      staves,
      wrongNotes: [...step.wrongNotes],
      velocities: { ...step.velocities },
      pressedAt: { ...step.pressedAt },
    };
  }
}
