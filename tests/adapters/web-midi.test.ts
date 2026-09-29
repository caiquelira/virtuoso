// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebMidiInput } from "../../src/adapters/web-midi";
import type { InputEvent } from "../../src/core/types";

/** A stand-in for a MIDIInput. Supports both addEventListener and onmidimessage. */
class FakePort extends EventTarget {
  readonly type = "input";
  onmidimessage: ((event: Event) => void) | null = null;
  constructor(
    readonly id: string,
    readonly name: string,
  ) {
    super();
  }
  send(bytes: number[], time: number): void {
    const event = new Event("midimessage");
    Object.defineProperty(event, "data", { value: new Uint8Array(bytes) });
    Object.defineProperty(event, "timeStamp", { value: time });
    this.dispatchEvent(event);
    this.onmidimessage?.(event);
  }
}

/** A stand-in for MIDIAccess. Supports both addEventListener and onstatechange. */
class FakeAccess extends EventTarget {
  readonly inputs = new Map<string, FakePort>();
  readonly outputs = new Map<string, never>();
  onstatechange: ((event: Event) => void) | null = null;
  constructor(ports: FakePort[]) {
    super();
    for (const p of ports) this.inputs.set(p.id, p);
  }
  plug(port: FakePort): void {
    this.inputs.set(port.id, port);
    const event = new Event("statechange");
    Object.defineProperty(event, "port", { value: port });
    this.dispatchEvent(event);
    this.onstatechange?.(event);
  }
}

function installMidi(request: ((options?: MIDIOptions) => Promise<unknown>) | undefined) {
  if (request === undefined) {
    Reflect.deleteProperty(navigator, "requestMIDIAccess");
    return;
  }
  Object.defineProperty(navigator, "requestMIDIAccess", {
    value: request,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  installMidi(undefined);
});

async function startWith(ports: FakePort[]) {
  const access = new FakeAccess(ports);
  const request = vi.fn(async (_options?: MIDIOptions) => access);
  installMidi(request);
  const events: InputEvent[] = [];
  const input = new WebMidiInput();
  await input.start((e) => events.push(e));
  return { access, request, events, input };
}

describe("WebMidiInput", () => {
  it("asks for MIDI access without system exclusive", async () => {
    const { request } = await startWith([new FakePort("1", "Digital Keyboard")]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]?.sysex ?? false).toBe(false);
  });

  it("delivers parsed events with the message's timestamp", async () => {
    const port = new FakePort("1", "Digital Keyboard");
    const { events, input } = await startWith([port]);
    port.send([0x90, 60, 100], 1234.5);
    port.send([0x80, 60, 0], 1300);
    port.send([0xb0, 64, 127], 1400);
    expect(events).toEqual([
      { type: "noteOn", note: 60, velocity: 100, channel: 1, time: 1234.5 },
      { type: "noteOff", note: 60, channel: 1, time: 1300 },
      { type: "pedal", down: true, value: 127, channel: 1, time: 1400 },
    ]);
    expect(input.connectedInputs()).toEqual(["Digital Keyboard"]);
  });

  it("drops messages the game does not use", async () => {
    const port = new FakePort("1", "Digital Keyboard");
    const { events } = await startWith([port]);
    port.send([0xf8], 10); // clock
    port.send([0xb0, 7, 100], 20); // volume
    expect(events).toEqual([]);
  });

  it("keeps only the channel of the first note", async () => {
    const port = new FakePort("1", "Digital Keyboard");
    const { events } = await startWith([port]);
    port.send([0x90, 60, 80], 10);
    port.send([0x91, 60, 80], 11); // same key echoed on channel 2
    port.send([0x80, 60, 0], 20);
    expect(events.map((e) => [e.type, e.channel])).toEqual([
      ["noteOn", 1],
      ["noteOff", 1],
    ]);
  });

  it("listens to a keyboard plugged in after start", async () => {
    const { access, events, input } = await startWith([]);
    const late = new FakePort("2", "Digital Keyboard");
    access.plug(late);
    late.send([0x90, 62, 70], 50);
    expect(events).toMatchObject([{ type: "noteOn", note: 62 }]);
    expect(input.connectedInputs()).toEqual(["Digital Keyboard"]);
  });

  it("does not deliver the same message twice after a state change", async () => {
    const port = new FakePort("1", "Digital Keyboard");
    const { access, events } = await startWith([port]);
    access.plug(new FakePort("3", "Other"));
    port.send([0x90, 60, 80], 10);
    expect(events).toHaveLength(1);
  });

  it("stops listening after stop()", async () => {
    const port = new FakePort("1", "Digital Keyboard");
    const { access, events, input } = await startWith([port]);
    input.stop();
    input.stop();
    port.send([0x90, 60, 80], 10);
    const late = new FakePort("2", "Later");
    access.plug(late);
    late.send([0x90, 62, 80], 20);
    expect(events).toEqual([]);
  });

  it("explains when the browser has no Web MIDI", async () => {
    installMidi(undefined);
    await expect(new WebMidiInput().start(() => {})).rejects.toThrow(/Chrome|Edge/);
  });

  it("explains when access is refused", async () => {
    installMidi(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    await expect(new WebMidiInput().start(() => {})).rejects.toThrow(/allow/i);
  });
});
