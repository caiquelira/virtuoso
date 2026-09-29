/**
 * T02 — Turn a MusicXML score into the game's Step list, using OpenSheetMusicDisplay's parser.
 * Spec: docs/tasks/T02-score-steps.md
 *
 * This is the only place (with ui/score-view.ts) that touches OSMD's model classes.
 * Everything downstream sees plain Step data from src/core/types.ts.
 */
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { type KeyboardRange, PSR_E363_RANGE, type Step } from "../core/types";

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

/**
 * Builds steps from an OSMD instance that has already loaded a score.
 * Repeats are not unfolded: steps follow the written order, each measure once.
 */
export function stepsFromOsmd(
  osmd: OpenSheetMusicDisplay,
  options: ParseOptions = {},
): ParsedScore {
  void osmd;
  void (options.range ?? PSR_E363_RANGE);
  throw new Error("Not implemented yet (task T02)");
}

/**
 * Parses MusicXML text with a detached OSMD instance (no rendering) and returns its steps.
 * Rejects with an Error if the text is not a readable score.
 */
export async function parseScore(xml: string, options: ParseOptions = {}): Promise<ParsedScore> {
  void xml;
  void options;
  throw new Error("Not implemented yet (task T02)");
}
