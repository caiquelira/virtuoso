/**
 * T07 — An on-screen keyboard under the score, covering the player's key range.
 * It echoes pressed keys faintly and lights the hint keys clearly.
 * Spec: docs/tasks/T07-score-view.md
 */
import type { KeyboardRange, MidiNote } from "../core/types";

const WHITE_KEY_WIDTH = 24;
const KEYBOARD_HEIGHT = 90;
const BLACK_KEY_WIDTH = 14;
const BLACK_KEY_HEIGHT = 54;

function isBlackKey(note: MidiNote): boolean {
  const pc = ((note % 12) + 12) % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}

export class KeyStrip {
  private readonly keyElements = new Map<MidiNote, SVGElement>();
  private readonly hintedNotes = new Set<MidiNote>();
  private readonly wrongTimers = new Map<MidiNote, ReturnType<typeof setTimeout>>();

  constructor(container: HTMLElement, range: KeyboardRange) {
    const whiteKeyIndices = new Map<MidiNote, number>();
    let whiteKeyCount = 0;

    for (let note = range.lowest; note <= range.highest; note++) {
      if (!isBlackKey(note)) {
        whiteKeyIndices.set(note, whiteKeyCount);
        whiteKeyCount++;
      }
    }

    const totalWidth = Math.max(1, whiteKeyCount * WHITE_KEY_WIDTH);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${KEYBOARD_HEIGHT}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "key-strip");

    // Render white keys first so black keys sit on top
    for (let note = range.lowest; note <= range.highest; note++) {
      if (isBlackKey(note)) {
        continue;
      }
      const idx = whiteKeyIndices.get(note);
      const whiteIndex = idx !== undefined ? idx : 0;
      const x = whiteIndex * WHITE_KEY_WIDTH;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", "0");
      rect.setAttribute("width", String(WHITE_KEY_WIDTH));
      rect.setAttribute("height", String(KEYBOARD_HEIGHT));
      rect.setAttribute("rx", "3");
      rect.setAttribute("ry", "3");
      rect.setAttribute("class", "key white");
      rect.setAttribute("data-note", String(note));
      svg.appendChild(rect);
      this.keyElements.set(note, rect);

      // Label each C in scientific pitch (C2 … C7)
      if (note % 12 === 0) {
        const octave = Math.floor(note / 12) - 1;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String(x + WHITE_KEY_WIDTH / 2));
        text.setAttribute("y", String(KEYBOARD_HEIGHT - 6));
        text.setAttribute("class", "key-label");
        text.textContent = `C${octave}`;
        svg.appendChild(text);
      }
    }

    // Render black keys
    for (let note = range.lowest; note <= range.highest; note++) {
      if (!isBlackKey(note)) {
        continue;
      }
      const prevWhiteIndex = whiteKeyIndices.get(note - 1);
      const baseIndex = prevWhiteIndex !== undefined ? prevWhiteIndex + 1 : 0;
      const x = baseIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", "0");
      rect.setAttribute("width", String(BLACK_KEY_WIDTH));
      rect.setAttribute("height", String(BLACK_KEY_HEIGHT));
      rect.setAttribute("rx", "2");
      rect.setAttribute("ry", "2");
      rect.setAttribute("class", "key black");
      rect.setAttribute("data-note", String(note));
      svg.appendChild(rect);
      this.keyElements.set(note, rect);
    }

    container.replaceChildren(svg);
  }

  press(note: MidiNote): void {
    const el = this.keyElements.get(note);
    el?.classList.add("pressed");
  }

  release(note: MidiNote): void {
    const el = this.keyElements.get(note);
    el?.classList.remove("pressed");
  }

  /** Lights these keys until clearHint(). Replaces any previous hint. */
  showHint(notes: readonly MidiNote[]): void {
    this.clearHint();
    for (const note of notes) {
      const el = this.keyElements.get(note);
      if (el) {
        el.classList.add("hint");
        this.hintedNotes.add(note);
      }
    }
  }

  clearHint(): void {
    for (const note of this.hintedNotes) {
      const el = this.keyElements.get(note);
      el?.classList.remove("hint");
    }
    this.hintedNotes.clear();
  }

  /** Briefly marks a wrong key (about 400 ms). */
  flashWrong(note: MidiNote): void {
    const el = this.keyElements.get(note);
    if (!el) {
      return;
    }
    const prevTimer = this.wrongTimers.get(note);
    if (prevTimer !== undefined) {
      clearTimeout(prevTimer);
    }
    el.classList.add("wrong");
    const timer = setTimeout(() => {
      el.classList.remove("wrong");
      this.wrongTimers.delete(note);
    }, 400);
    this.wrongTimers.set(note, timer);
  }
}
