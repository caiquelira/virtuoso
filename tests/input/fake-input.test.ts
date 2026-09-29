// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { InputEvent } from "../../src/core/types";
import { codeToNote, FAKE_VELOCITY, FakeInput, velocityFor } from "../../src/input/fake-input";

describe("codeToNote", () => {
  it("maps the home row like a piano, with A on middle C", () => {
    const codes = [
      "KeyA",
      "KeyW",
      "KeyS",
      "KeyE",
      "KeyD",
      "KeyF",
      "KeyT",
      "KeyG",
      "KeyY",
      "KeyH",
      "KeyU",
      "KeyJ",
      "KeyK",
      "KeyO",
      "KeyL",
      "KeyP",
      "Semicolon",
    ];
    expect(codes.map((c) => codeToNote(c, 0))).toEqual([
      60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
    ]);
  });

  it("shifts by octaves", () => {
    expect(codeToNote("KeyA", -1)).toBe(48);
    expect(codeToNote("KeyA", 2)).toBe(84);
    expect(codeToNote("Semicolon", -2)).toBe(52);
  });

  it("ignores keys outside the layout, including the octave keys", () => {
    for (const code of ["KeyQ", "Digit1", "KeyZ", "KeyX", "Space", "ShiftLeft"]) {
      expect(codeToNote(code, 0)).toBeNull();
    }
  });
});

describe("velocityFor", () => {
  it("plays loud with Shift and medium without", () => {
    expect(FAKE_VELOCITY).toEqual({ normal: 80, loud: 112 });
    expect(velocityFor(false)).toBe(80);
    expect(velocityFor(true)).toBe(112);
  });
});

describe("FakeInput", () => {
  const key = (type: "keydown" | "keyup", code: string, init: KeyboardEventInit = {}) =>
    new KeyboardEvent(type, { code, ...init });

  async function started() {
    const target = new EventTarget();
    const events: InputEvent[] = [];
    const input = new FakeInput(target);
    await input.start((e) => events.push(e));
    return { target, events, input };
  }

  it("turns key presses into note events on channel 1", async () => {
    const { target, events } = await started();
    target.dispatchEvent(key("keydown", "KeyA"));
    target.dispatchEvent(key("keyup", "KeyA"));
    expect(events).toMatchObject([
      { type: "noteOn", note: 60, velocity: 80, channel: 1 },
      { type: "noteOff", note: 60, channel: 1 },
    ]);
    for (const e of events) expect(typeof e.time).toBe("number");
  });

  it("plays loud with Shift", async () => {
    const { target, events } = await started();
    target.dispatchEvent(key("keydown", "KeyG", { shiftKey: true }));
    expect(events[0]).toMatchObject({ type: "noteOn", note: 67, velocity: 112 });
  });

  it("ignores auto-repeat while a key is held", async () => {
    const { target, events } = await started();
    target.dispatchEvent(key("keydown", "KeyA"));
    target.dispatchEvent(key("keydown", "KeyA", { repeat: true }));
    expect(events).toHaveLength(1);
  });

  it("shifts octaves with Z and X, within three octaves each way", async () => {
    const { target, events } = await started();
    target.dispatchEvent(key("keydown", "KeyX"));
    target.dispatchEvent(key("keydown", "KeyA"));
    expect(events.at(-1)).toMatchObject({ type: "noteOn", note: 72 });
    for (let i = 0; i < 6; i++) target.dispatchEvent(key("keydown", "KeyX"));
    target.dispatchEvent(key("keydown", "KeyS"));
    expect(events.at(-1)).toMatchObject({ type: "noteOn", note: 98 }); // D at +3 octaves
    for (let i = 0; i < 10; i++) target.dispatchEvent(key("keydown", "KeyZ"));
    target.dispatchEvent(key("keydown", "KeyD"));
    expect(events.at(-1)).toMatchObject({ type: "noteOn", note: 28 }); // E at -3 octaves
  });

  it("releases the note that was pressed, even after an octave change", async () => {
    const { target, events } = await started();
    target.dispatchEvent(key("keydown", "KeyA"));
    target.dispatchEvent(key("keydown", "KeyX"));
    target.dispatchEvent(key("keyup", "KeyA"));
    expect(events.at(-1)).toMatchObject({ type: "noteOff", note: 60 });
  });

  it("stops listening after stop()", async () => {
    const { target, events, input } = await started();
    input.stop();
    input.stop();
    target.dispatchEvent(key("keydown", "KeyA"));
    expect(events).toEqual([]);
  });
});
