/**
 * T07 — The score on screen: current bar plus the next one, a cursor on the current step,
 * and colored notes. Spec: docs/tasks/T07-score-view.md
 */
import type { GraphicalNote } from "opensheetmusicdisplay";
import { CursorType, OpenSheetMusicDisplay, VexFlowGraphicalNote } from "opensheetmusicdisplay";
import { type ParsedScore, stepsFromOsmd } from "../adapters/osmd-steps";
import type { KeyboardRange, MidiNote, Step } from "../core/types";

/** How a written note is colored after the player acts on it. */
export type NoteMark = "correct" | "hinted" | "melodyStoodOut" | "melodyWeak";

interface MarkRecord {
  step: Step;
  color?: "correct" | "hinted";
  melody?: "melodyStoodOut" | "melodyWeak";
}
export class ScoreView {
  // OSMD's setOptions() resets cursorsOptions to default green if omitted.
  private static readonly CURSORS_OPTIONS = [
    {
      type: CursorType.Standard,
      color: "#64748b",
      alpha: 0.25,
      follow: false,
    },
  ];

  private readonly container: HTMLElement;
  private readonly osmd: OpenSheetMusicDisplay;
  private currentStep: Step | null = null;
  private renderedRange: { first: number; last: number } | null = null;

  // Remembered marks: step.index -> (pitch -> MarkRecord)
  private readonly marks = new Map<number, Map<MidiNote, MarkRecord>>();

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.classList.add("virtuoso-score");
    this.osmd = new OpenSheetMusicDisplay(container, {
      backend: "svg",
      autoResize: false,
      drawTitle: false,
      drawSubtitle: false,
      drawComposer: false,
      drawLyricist: false,
      drawPartNames: false,
      drawMeasureNumbers: true,
      // OSMD's setOptions() resets cursorsOptions to default green if omitted.
      cursorsOptions: ScoreView.CURSORS_OPTIONS,
    });
    this.osmd.EngravingRules.CursorIgnoreRepetitions = true;
  }

  /**
   * Loads MusicXML text into OSMD and returns its steps, built with stepsFromOsmd()
   * from the same OSMD instance so the display and the steps always agree.
   */
  async load(xml: string, range: KeyboardRange): Promise<ParsedScore> {
    this.marks.clear();
    this.currentStep = null;
    this.renderedRange = null;
    await this.osmd.load(xml);
    return stepsFromOsmd(this.osmd, { range });
  }

  /** Renders measures first..last (0-based, inclusive). */
  showMeasures(first: number, last: number): void {
    this.renderedRange = { first, last };
    // OSMD's setOptions() resets cursorsOptions to default green if omitted.
    this.osmd.setOptions({
      drawFromMeasureNumber: first + 1,
      drawUpToMeasureNumber: last + 1,
      cursorsOptions: ScoreView.CURSORS_OPTIONS,
    });
    this.osmd.render();
    this.osmd.cursor.show();
    this.reapplyMarks();
  }

  /** Moves the cursor to a step. The step must be inside the rendered measures. */
  moveTo(step: Step): void {
    const cursor = this.osmd.cursor;
    cursor.reset();

    const matches = (): boolean => {
      const it = cursor.iterator;
      return (
        it.CurrentMeasureIndex === step.measureIndex &&
        Math.abs(it.currentTimeStamp.RealValue - step.timestamp) < 1e-5
      );
    };

    if (matches()) {
      this.currentStep = step;
      return;
    }

    while (!cursor.iterator.EndReached) {
      const prevMeasure = cursor.iterator.CurrentMeasureIndex;
      const prevTime = cursor.iterator.currentTimeStamp.RealValue;

      cursor.next();

      if (matches()) {
        this.currentStep = step;
        return;
      }

      // Check if iterator made no forward progress
      if (
        cursor.iterator.CurrentMeasureIndex === prevMeasure &&
        Math.abs(cursor.iterator.currentTimeStamp.RealValue - prevTime) < 1e-7
      ) {
        break;
      }

      // Stop if we have advanced beyond the step's measure and timestamp
      if (
        cursor.iterator.CurrentMeasureIndex > step.measureIndex ||
        (cursor.iterator.CurrentMeasureIndex === step.measureIndex &&
          cursor.iterator.currentTimeStamp.RealValue > step.timestamp + 1e-5)
      ) {
        break;
      }
    }

    throw new Error(
      `Step ${step.index} (measure ${step.measureIndex}, timestamp ${step.timestamp}) is not drawn`,
    );
  }

  /** Colors the written note(s) of `step` whose expected pitch is `pitch`. */
  mark(step: Step, pitch: MidiNote, mark: NoteMark): void {
    let stepMap = this.marks.get(step.index);
    if (!stepMap) {
      stepMap = new Map();
      this.marks.set(step.index, stepMap);
    }

    let record = stepMap.get(pitch);
    if (!record) {
      record = { step };
      stepMap.set(pitch, record);
    }

    if (mark === "correct" || mark === "hinted") {
      record.color = mark;
    } else {
      record.melody = mark;
    }

    this.applyMarkToStep(step, pitch, mark);
  }

  clearMarks(): void {
    this.marks.clear();
    const circles = this.container.querySelectorAll(".virtuoso-melody-mark");
    for (const circle of circles) {
      circle.remove();
    }
    if (this.renderedRange) {
      this.osmd.render();
      this.osmd.cursor.show();
      if (this.currentStep) {
        try {
          this.moveTo(this.currentStep);
        } catch {
          // Current step may not be in the rendered range
        }
      }
    }
  }

  private applyMarkToStep(step: Step, pitch: MidiNote, mark: NoteMark): void {
    const gNotes = this.findGraphicalNotesForStep(step);
    for (const gNote of gNotes) {
      const written = gNote.sourceNote.halfTone + 12;
      const matching = step.notes.find((n) => n.written === written && n.expected === pitch);
      if (!matching) {
        continue;
      }

      if (mark === "correct" || mark === "hinted") {
        const prop = mark === "correct" ? "--mark-correct" : "--mark-hinted";
        const color = this.getColor(prop);
        gNote.setColor(color, { applyToNoteheads: true, applyToStem: true });
      } else {
        this.drawMelodyCircle(gNote, step, pitch, mark);
      }
    }
  }

  private drawMelodyCircle(
    gNote: GraphicalNote,
    step: Step,
    pitch: MidiNote,
    mark: "melodyStoodOut" | "melodyWeak",
  ): void {
    if (!(gNote instanceof VexFlowGraphicalNote)) {
      return;
    }
    const svgG = gNote.getSVGGElement();
    if (!svgG) {
      return;
    }

    // Remove any previous melody marks on this note element
    const existing = svgG.querySelectorAll(".virtuoso-melody-mark");
    for (const el of existing) {
      el.remove();
    }

    const noteheads = gNote.getNoteheadSVGs();
    let targetIndex = 0;
    if (typeof gNote.vfnoteIndex === "number" && gNote.vfnoteIndex >= 0) {
      targetIndex = gNote.vfnoteIndex;
    } else if (gNote.parentVoiceEntry?.notes && gNote.parentVoiceEntry.notes.length > 0) {
      const sorted = [...gNote.parentVoiceEntry.notes].sort(
        (a, b) => a.sourceNote.halfTone - b.sourceNote.halfTone,
      );
      const idx = sorted.indexOf(gNote);
      if (idx >= 0) {
        targetIndex = idx;
      }
    }

    if (noteheads.length > 0) {
      targetIndex = Math.min(Math.max(0, targetIndex), noteheads.length - 1);
    }

    let bbox = { x: 0, y: 0, width: 10, height: 10 };
    const targetHead = noteheads[targetIndex];
    if (targetHead instanceof SVGGraphicsElement) {
      try {
        const b = targetHead.getBBox();
        bbox = { x: b.x, y: b.y, width: b.width, height: b.height };
      } catch {
        // Fallback if getBBox is not available or rendered
      }
    } else {
      try {
        const b = svgG.getBBox();
        bbox = { x: b.x, y: b.y, width: b.width, height: b.height };
      } catch {
        // Fallback if getBBox is not available or rendered
      }
    }

    // If another notehead of the same chord is directly above it (inner voice),
    // place just to the left of the notehead instead so it never covers another note.
    const hasNoteAbove =
      noteheads.length > 1 &&
      (targetIndex < noteheads.length - 1 ||
        noteheads.some((head, idx) => {
          if (idx === targetIndex || !(head instanceof SVGGraphicsElement)) return false;
          try {
            const hb = head.getBBox();
            return hb.y < bbox.y - 2;
          } catch {
            return false;
          }
        }));

    let cx: number;
    let cy: number;
    if (hasNoteAbove) {
      cx = bbox.x - 5.5;
      cy = bbox.y + bbox.height / 2;
    } else {
      cx = bbox.x + bbox.width / 2;
      cy = bbox.y - 5;
    }

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx.toFixed(1));
    circle.setAttribute("cy", cy.toFixed(1));
    circle.setAttribute("r", "3.5");
    circle.dataset.stepIndex = String(step.index);
    circle.dataset.pitch = String(pitch);

    if (mark === "melodyStoodOut") {
      circle.setAttribute("fill", this.getColor("--mark-melody"));
      circle.setAttribute("stroke", "none");
      circle.setAttribute("class", "virtuoso-melody-mark virtuoso-melody-stood-out");
    } else {
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", this.getColor("--mark-hinted"));
      circle.setAttribute("stroke-width", "1.5");
      circle.setAttribute("class", "virtuoso-melody-mark virtuoso-melody-weak");
    }

    svgG.appendChild(circle);
  }

  private findGraphicalNotesForStep(step: Step): GraphicalNote[] {
    const graphic = this.osmd.GraphicSheet;
    if (!graphic) {
      return [];
    }
    const result: GraphicalNote[] = [];
    const measureList = graphic.MeasureList;
    if (!measureList) {
      return [];
    }

    for (const measureRow of measureList) {
      if (!measureRow) continue;
      for (const measure of measureRow) {
        if (!measure) continue;
        if (measure.parentSourceMeasure?.measureListIndex !== step.measureIndex) {
          continue;
        }
        const staffEntries = measure.staffEntries;
        if (!staffEntries) continue;
        for (const staffEntry of staffEntries) {
          if (!staffEntry) continue;
          const absTimestamp = staffEntry.getAbsoluteTimestamp();
          if (!absTimestamp) continue;
          const ts = absTimestamp.RealValue;
          if (Math.abs(ts - step.timestamp) > 1e-5) {
            continue;
          }
          const gves = staffEntry.graphicalVoiceEntries;
          if (!gves) continue;
          for (const gve of gves) {
            if (!gve?.notes) continue;
            for (const gNote of gve.notes) {
              if (gNote) {
                result.push(gNote);
              }
            }
          }
        }
      }
    }

    if (result.length === 0 && this.currentStep === step) {
      try {
        const underCursor = this.osmd.cursor.GNotesUnderCursor();
        if (underCursor && underCursor.length > 0) {
          return underCursor;
        }
      } catch {
        // Ignore fallback errors
      }
    }

    return result;
  }

  private reapplyMarks(): void {
    for (const stepMap of this.marks.values()) {
      for (const [pitch, record] of stepMap) {
        if (record.color) {
          this.applyMarkToStep(record.step, pitch, record.color);
        }
        if (record.melody) {
          this.applyMarkToStep(record.step, pitch, record.melody);
        }
      }
    }
  }

  private getColor(property: string): string {
    const scoreProp = property.startsWith("--mark-") ? `--score-${property.slice(2)}` : property;
    const scoreVal = getComputedStyle(this.container).getPropertyValue(scoreProp).trim();
    if (scoreVal) {
      return scoreVal;
    }
    const value = getComputedStyle(this.container).getPropertyValue(property).trim();
    if (value) {
      return value;
    }
    switch (property) {
      case "--mark-correct":
        return "#16a34a";
      case "--mark-hinted":
        return "#d97706";
      case "--mark-melody":
        return "#2563eb";
      default:
        return "#000000";
    }
  }
}
