/**
 * T06 — The real keyboard, through the Web MIDI API (Chrome, Edge, Firefox; not Safari).
 * Spec: docs/tasks/T06-input-sources.md
 *
 * Listens to every connected MIDI input, including ones plugged in later, parses messages
 * with parseMidiMessage() and filters them with a ChannelLock.
 */
import { createChannelLock, parseMidiMessage } from "../core/midi";
import type { InputListener, KeyboardInput } from "../input/keyboard-input";

interface AttachedInput {
  port: MIDIInput;
  handler: (event: Event) => void;
}

export class WebMidiInput implements KeyboardInput {
  readonly name = "MIDI keyboard";

  private access: MIDIAccess | null = null;
  private channelLock = createChannelLock();
  private listener: InputListener | null = null;
  private attachedInputs = new Map<string, AttachedInput>();
  private stateChangeHandler: ((event: Event) => void) | null = null;

  /**
   * Asks for MIDI access (the browser shows a permission prompt the first time), then
   * delivers events from all inputs. Rejects with a player-readable Error when the browser has
   * no Web MIDI or access is refused. Resolves even if no keyboard is connected yet.
   */
  async start(listener: InputListener): Promise<void> {
    this.stop();
    this.listener = listener;

    if (
      typeof navigator === "undefined" ||
      !("requestMIDIAccess" in navigator) ||
      typeof navigator.requestMIDIAccess !== "function"
    ) {
      throw new Error("Web MIDI is not supported in this browser. Please use Chrome or Edge.");
    }

    let access: MIDIAccess;
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      throw new Error(
        "MIDI access was denied. Please allow MIDI access for this site in your browser settings.",
      );
    }

    this.access = access;
    if (!this.listener) {
      return;
    }

    for (const input of access.inputs.values()) {
      this.attachInput(input);
    }

    this.stateChangeHandler = (event: Event) => {
      this.handleStateChange(event);
    };
    access.addEventListener("statechange", this.stateChangeHandler);
  }

  /** Stops listening to all inputs and forgets the locked channel. Safe to call twice. */
  stop(): void {
    for (const entry of this.attachedInputs.values()) {
      entry.port.removeEventListener("midimessage", entry.handler);
    }
    this.attachedInputs.clear();

    if (this.access && this.stateChangeHandler) {
      this.access.removeEventListener("statechange", this.stateChangeHandler);
    }
    this.stateChangeHandler = null;
    this.access = null;
    this.listener = null;
    this.channelLock.reset();
  }

  /** Names of the inputs currently listened to, e.g. ["Digital Keyboard"]. */
  connectedInputs(): string[] {
    const names: string[] = [];
    for (const { port } of this.attachedInputs.values()) {
      if (port.name) {
        names.push(port.name);
      }
    }
    return names;
  }

  private attachInput(port: MIDIInput): void {
    if (this.attachedInputs.has(port.id)) {
      return;
    }

    const handler = (event: Event): void => {
      if (!("data" in event) || !("timeStamp" in event)) {
        return;
      }
      const data = (event as { data: unknown }).data;
      const timeStamp = (event as { timeStamp: unknown }).timeStamp;

      if (!this.isNumberArrayLike(data) || typeof timeStamp !== "number") {
        return;
      }

      const parsed = parseMidiMessage(data, timeStamp);
      if (parsed && this.channelLock.accept(parsed)) {
        this.listener?.(parsed);
      }
    };

    port.addEventListener("midimessage", handler);
    this.attachedInputs.set(port.id, { port, handler });
  }

  private detachInput(id: string): void {
    const entry = this.attachedInputs.get(id);
    if (entry) {
      entry.port.removeEventListener("midimessage", entry.handler);
      this.attachedInputs.delete(id);
    }
  }

  private handleStateChange(event: Event): void {
    if ("port" in event) {
      const rawPort = (event as { port: unknown }).port;
      if (this.isMidiInputPort(rawPort)) {
        if ("state" in rawPort && (rawPort as { state: unknown }).state === "disconnected") {
          this.detachInput(rawPort.id);
        } else {
          this.attachInput(rawPort);
        }
      }
    }

    if (this.access) {
      for (const input of this.access.inputs.values()) {
        const state = (input as unknown as { state?: unknown }).state;
        if (state === "disconnected") {
          this.detachInput(input.id);
        } else {
          this.attachInput(input);
        }
      }
      for (const id of this.attachedInputs.keys()) {
        if (!this.access.inputs.has(id)) {
          this.detachInput(id);
        }
      }
    }
  }

  private isMidiInputPort(port: unknown): port is MIDIInput {
    if (typeof port !== "object" || port === null) {
      return false;
    }
    const candidate = port as { id?: unknown; type?: unknown };
    return typeof candidate.id === "string" && candidate.type === "input";
  }

  private isNumberArrayLike(value: unknown): value is ArrayLike<number> {
    if (value instanceof Uint8Array || Array.isArray(value)) {
      return true;
    }
    if (typeof value === "object" && value !== null && "length" in value) {
      const length = (value as { length: unknown }).length;
      return typeof length === "number";
    }
    return false;
  }
}
