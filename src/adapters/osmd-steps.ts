/**
 * T02 — Turn a MusicXML score into the game's Step list, using OpenSheetMusicDisplay's parser.
 * Spec: docs/tasks/T02-score-steps.md
 *
 * This is the only place (with ui/score-view.ts) that touches OSMD's model classes.
 * Everything downstream sees plain Step data from src/core/types.ts.
 */
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { foldIntoRange } from "../core/steps";
import {
  type KeyboardRange,
  PSR_E363_RANGE,
  type Staff,
  type Step,
  type StepNote,
} from "../core/types";

export interface ParsedScore {
  /** Work title from the file, or null. */
  title: string | null;
  measureCount: number;
  steps: Step[];
}

export interface ParseOptions {
  /** Keys available on the player's keyboard. Defaults to the PSR-E363 (36–96). */
  range?: KeyboardRange;
}

interface TimestampGroup {
  measureIndex: number;
  timestamp: number;
  notes: StepNote[];
}

/**
 * Builds steps from an OSMD instance that has already loaded a score.
 * Repeats are not unfolded: steps follow the written order, each measure once.
 */
export function stepsFromOsmd(
  osmd: OpenSheetMusicDisplay,
  options: ParseOptions = {},
): ParsedScore {
  const range = options.range ?? PSR_E363_RANGE;
  const sheet = osmd.Sheet;
  if (!sheet) {
    throw new Error("OSMD sheet is not loaded");
  }

  const rawTitle = sheet.TitleString?.trim();
  const title = rawTitle ? rawTitle : null;
  const measureCount = sheet.SourceMeasures?.length ?? 0;

  const instruments = sheet.Instruments ?? [];
  const targetInstrument = instruments.find((i) => i.Staves.length === 2) ?? instruments[0];

  if (!targetInstrument) {
    return { title, measureCount, steps: [] };
  }

  osmd.EngravingRules.CursorIgnoreRepetitions = true;

  const iterator = sheet.MusicPartManager.getIterator();
  const groupsByTimestamp = new Map<number, TimestampGroup>();

  while (!iterator.EndReached) {
    const measureIndex = iterator.CurrentMeasureIndex;
    const timestamp = iterator.currentTimeStamp.RealValue;

    let group = groupsByTimestamp.get(timestamp);
    if (!group) {
      group = {
        measureIndex,
        timestamp,
        notes: [],
      };
      groupsByTimestamp.set(timestamp, group);
    }

    const voiceEntries = iterator.CurrentVoiceEntries ?? [];
    for (const voiceEntry of voiceEntries) {
      const parentStaff = voiceEntry.ParentSourceStaffEntry?.ParentStaff;
      if (!parentStaff) {
        continue;
      }
      const staffIndex = targetInstrument.Staves.indexOf(parentStaff);
      if (staffIndex !== 0 && staffIndex !== 1) {
        continue;
      }
      const staff = (staffIndex + 1) as Staff;

      const notes = voiceEntry.Notes ?? [];
      for (const note of notes) {
        if (note.isRest() || !note.Pitch) {
          continue;
        }

        const written = note.halfTone + 12;
        const expected = foldIntoRange(written, range);
        const voice = voiceEntry.ParentVoice?.VoiceId;
        const isGrace = Boolean(voiceEntry.IsGrace);
        const tiedFromPrevious = Boolean(note.NoteTie && note.NoteTie.StartNote !== note);

        const stepNote: StepNote = {
          written,
          expected,
          staff,
          ...(voice !== undefined ? { voice } : {}),
          tiedFromPrevious,
          isGrace,
        };

        group.notes.push(stepNote);
      }
    }

    iterator.moveToNext();
  }

  // Filter groups: keep only timestamps with at least one required note (not tied, not grace)
  const validGroups: TimestampGroup[] = [];
  for (const group of groupsByTimestamp.values()) {
    const hasRequiredNote = group.notes.some((n) => !n.tiedFromPrevious && !n.isGrace);
    if (hasRequiredNote) {
      validGroups.push(group);
    }
  }

  // Sort steps by timestamp
  validGroups.sort((a, b) => a.timestamp - b.timestamp);

  const steps: Step[] = validGroups.map((group, index) => {
    // Sort each step's notes by staff, then written pitch
    group.notes.sort((a, b) => {
      if (a.staff !== b.staff) {
        return a.staff - b.staff;
      }
      return a.written - b.written;
    });

    return {
      index,
      measureIndex: group.measureIndex,
      timestamp: group.timestamp,
      notes: group.notes,
    };
  });

  return {
    title,
    measureCount,
    steps,
  };
}

/**
 * Parses MusicXML text with a detached OSMD instance (no rendering) and returns its steps.
 * Rejects with an Error if the text is not a readable score.
 */
export async function parseScore(xml: string, options: ParseOptions = {}): Promise<ParsedScore> {
  const container = document.createElement("div");
  const osmd = new OpenSheetMusicDisplay(container, {
    autoResize: false,
  });

  try {
    await osmd.load(xml);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }

  if (!osmd.Sheet) {
    throw new Error("Failed to parse score: sheet is not available");
  }

  return stepsFromOsmd(osmd, options);
}
