import { describe, expect, it } from "vitest";
import { createChannelLock, parseMidiMessage } from "../../src/core/midi";

describe("parseMidiMessage", () => {
  it("parses note on", () => {
    expect(parseMidiMessage([0x90, 60, 100], 12.5)).toEqual({
      type: "noteOn",
      note: 60,
      velocity: 100,
      channel: 1,
      time: 12.5,
    });
  });

  it("reads the channel from the low nibble", () => {
    expect(parseMidiMessage([0x93, 64, 70], 0)).toMatchObject({ type: "noteOn", channel: 4 });
    expect(parseMidiMessage([0x9f, 64, 70], 0)).toMatchObject({ type: "noteOn", channel: 16 });
  });

  it("treats note on with velocity 0 as note off", () => {
    expect(parseMidiMessage([0x90, 60, 0], 5)).toEqual({
      type: "noteOff",
      note: 60,
      channel: 1,
      time: 5,
    });
  });

  it("parses note off and ignores its release velocity", () => {
    expect(parseMidiMessage([0x81, 62, 64], 7)).toEqual({
      type: "noteOff",
      note: 62,
      channel: 2,
      time: 7,
    });
  });

  it("parses the sustain pedal (controller 64)", () => {
    expect(parseMidiMessage([0xb0, 64, 127], 1)).toEqual({
      type: "pedal",
      down: true,
      value: 127,
      channel: 1,
      time: 1,
    });
    expect(parseMidiMessage([0xb0, 64, 0], 2)).toMatchObject({ type: "pedal", down: false });
    expect(parseMidiMessage([0xb0, 64, 63], 3)).toMatchObject({ type: "pedal", down: false });
    expect(parseMidiMessage([0xb0, 64, 64], 4)).toMatchObject({ type: "pedal", down: true });
  });

  it("accepts a Uint8Array, as Web MIDI delivers", () => {
    expect(parseMidiMessage(new Uint8Array([0x90, 72, 90]), 0)).toMatchObject({
      type: "noteOn",
      note: 72,
      velocity: 90,
    });
  });

  it("ignores messages the game does not use", () => {
    expect(parseMidiMessage([0xb0, 7, 100], 0)).toBeNull(); // volume controller
    expect(parseMidiMessage([0xc0, 5], 0)).toBeNull(); // program change
    expect(parseMidiMessage([0xe0, 0, 64], 0)).toBeNull(); // pitch bend
    expect(parseMidiMessage([0xf8], 0)).toBeNull(); // clock
    expect(parseMidiMessage([0xfe], 0)).toBeNull(); // active sensing
    expect(parseMidiMessage([0xf0, 0x43, 0x10, 0xf7], 0)).toBeNull(); // system exclusive
  });

  it("returns null for malformed data", () => {
    expect(parseMidiMessage([], 0)).toBeNull();
    expect(parseMidiMessage([0x90, 60], 0)).toBeNull(); // too short
    expect(parseMidiMessage([0x90, 128, 60], 0)).toBeNull(); // data byte out of range
    expect(parseMidiMessage([0x90, 60, 200], 0)).toBeNull();
    expect(parseMidiMessage([60, 100], 0)).toBeNull(); // no status byte
  });
});

describe("createChannelLock", () => {
  const on = (channel: number, note = 60) =>
    ({ type: "noteOn", note, velocity: 80, channel, time: 0 }) as const;
  const off = (channel: number, note = 60) =>
    ({ type: "noteOff", note, channel, time: 0 }) as const;
  const pedal = (channel: number) =>
    ({ type: "pedal", down: true, value: 127, channel, time: 0 }) as const;

  it("starts unlocked", () => {
    expect(createChannelLock().channel).toBeNull();
  });

  it("locks to the channel of the first note on", () => {
    const lock = createChannelLock();
    expect(lock.accept(on(1))).toBe(true);
    expect(lock.channel).toBe(1);
    expect(lock.accept(on(2, 64))).toBe(false);
    expect(lock.accept(on(1, 64))).toBe(true);
  });

  it("filters note off and pedal events by the locked channel", () => {
    const lock = createChannelLock();
    lock.accept(on(3));
    expect(lock.accept(off(3))).toBe(true);
    expect(lock.accept(off(1))).toBe(false);
    expect(lock.accept(pedal(3))).toBe(true);
    expect(lock.accept(pedal(1))).toBe(false);
  });

  it("lets note off and pedal through before the first note on, without locking", () => {
    const lock = createChannelLock();
    expect(lock.accept(pedal(5))).toBe(true);
    expect(lock.accept(off(5))).toBe(true);
    expect(lock.channel).toBeNull();
    expect(lock.accept(on(2))).toBe(true);
    expect(lock.channel).toBe(2);
  });

  it("unlocks on reset", () => {
    const lock = createChannelLock();
    lock.accept(on(1));
    lock.reset();
    expect(lock.channel).toBeNull();
    expect(lock.accept(on(4))).toBe(true);
    expect(lock.channel).toBe(4);
  });
});
