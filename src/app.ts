/**
 * T08 — The first playable slice: wires input, engine, hint timer, voicing and the view.
 * Spec: docs/tasks/T08-first-slice.md
 */
import sampleScoreXml from "../samples/bach-bwv269-opening.musicxml?raw";
import { WebMidiInput } from "./adapters/web-midi";
import { HintTimer } from "./core/hint-timer";
import type { InputEvent, MidiNote, Step } from "./core/types";
import { PSR_E363_RANGE } from "./core/types";
import { gradeVoicing, type VoicingResult } from "./core/voicing";
import { type EngineOutput, type StepResult, WaitEngine } from "./core/wait-engine";
import { FirstContactTracker } from "./first-contact";
import { FakeInput } from "./input/fake-input";
import { clampBarRange, defaultBarRange, findRangeStepIndices } from "./range";
import {
  type AppSettings,
  createDefaultSettings,
  getHintTimerConfig,
  type TargetPreset,
  validateSettings,
} from "./settings";
import { buildPracticeSummary, formatLead, formatPercentage, formatT1Seconds } from "./summary";
import { KeyStrip } from "./ui/key-strip";
import { ScoreView } from "./ui/score-view";

export function startApp(root: HTMLElement): void {
  // 1. Initial State
  let settings: AppSettings = createDefaultSettings();
  let pendingSettings: AppSettings = createDefaultSettings();
  let hintTimer = new HintTimer(getHintTimerConfig(settings));

  let parsedSteps: Step[] = [];
  let scoreTitle: string = "";
  let scoreMeasureCount: number = 0;

  let firstContactTracker = new FirstContactTracker();
  let waitEngine: WaitEngine | null = null;
  let isPlaying = false;
  let rafId: number | null = null;

  let stepResults: StepResult[] = [];
  let voicingResults: VoicingResult[] = [];
  const hintedNotesThisStep = new Set<MidiNote>();
  let renderedFirstMeasure = -1;

  let currentBarRange = { from: 1, to: 2 };
  let selectedInputSource: "midi" | "computer" = "midi";

  const webMidiInput = new WebMidiInput();
  const fakeInput = new FakeInput();

  // 2. Render Base App Layout
  root.innerHTML = `
    <div class="virtuoso-app">
      <header class="app-header">
        <div class="brand">
          <span class="logo">♪</span>
          <h1 class="app-title">Virtuoso</h1>
        </div>
        <div class="header-controls">
          <span id="playing-header-info" class="header-info" hidden></span>
          <button type="button" id="stop-btn" class="btn btn-secondary" hidden>Change bars</button>
          <button type="button" id="settings-btn" class="btn btn-ghost" title="Settings">⚙ Settings</button>
        </div>
      </header>

      <main class="app-main">
        <!-- START SCREEN -->
        <section id="start-screen" class="screen start-screen">
          <div class="card intro-card">
            <h2>Practise Classical Piano</h2>
            <p class="lede">Learn pieces bar by bar with adaptive hints and voicing grading.</p>
          </div>

          <div class="panels-grid">
            <!-- 1. Score Source -->
            <div class="card panel">
              <h3>1. Choose Score</h3>
              <div class="button-row">
                <button type="button" id="try-sample-btn" class="btn btn-primary">Try the sample</button>
                <label class="btn btn-secondary file-upload-label">
                  Open file…
                  <input type="file" id="file-input" accept=".musicxml,.xml,.mxl" hidden>
                </label>
              </div>
              <div id="score-status" class="score-status">No score loaded yet.</div>
            </div>

            <!-- 2. Input Source -->
            <div class="card panel">
              <h3>2. Choose Input</h3>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="input-source" value="midi" checked>
                  MIDI keyboard
                </label>
                <label class="radio-label">
                  <input type="radio" name="input-source" value="computer">
                  Computer keyboard
                </label>
              </div>
              <div id="midi-status-wrap" class="status-wrap">
                <span id="midi-status-text" class="status-text">Click Connect MIDI to use your keyboard.</span>
                <button type="button" id="connect-midi-btn" class="btn btn-secondary btn-sm">Connect MIDI</button>
              </div>
              <p id="computer-help" class="help-text" hidden>
                Home row: A=C4, W=C#4, S=D4, E=D#4, D=E4, F=F4, T=F#4, G=G4, Y=G#4, H=A4, U=A#4, J=B4, K=C5.<br>
                Hold <strong>Shift</strong> to play loud. Press <strong>Z/X</strong> to shift octaves.
              </p>
            </div>

            <!-- 3. Bar Range -->
            <div class="card panel">
              <h3>3. Choose Bars</h3>
              <div class="range-inputs">
                <label>
                  From bar
                  <input type="number" id="bar-from" min="1" value="1" disabled>
                </label>
                <label>
                  To bar
                  <input type="number" id="bar-to" min="1" value="2" disabled>
                </label>
              </div>
              <button type="button" id="start-btn" class="btn btn-primary btn-large" disabled>Start playing</button>
            </div>
          </div>
        </section>

        <!-- PLAYING SCREEN -->
        <section id="playing-screen" class="screen playing-screen" hidden>
          <div id="playing-error" class="playing-error-card" hidden></div>
          <div id="score-container" class="score-card"></div>
          <div id="key-strip-container" class="key-strip-card"></div>
        </section>

        <!-- SUMMARY SCREEN -->
        <section id="summary-screen" class="screen summary-screen" hidden>
          <div class="card summary-card">
            <h2>Practice Summary</h2>
            <p id="summary-range-text" class="lede"></p>

            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-label">Steps Played</div>
                <div id="stat-steps-played" class="stat-value">–</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Right Hand Unaided (Staff 1)</div>
                <div id="stat-staff1-unaided" class="stat-value">–</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Left Hand Unaided (Staff 2)</div>
                <div id="stat-staff2-unaided" class="stat-value">–</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Melody Stood Out</div>
                <div id="stat-melody-rate" class="stat-value">–</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Mean Voicing Lead</div>
                <div id="stat-mean-lead" class="stat-value">–</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Reading Speed (T1 Now)</div>
                <div id="stat-t1-delays" class="stat-value">–</div>
              </div>
            </div>

            <div class="summary-actions">
              <button type="button" id="loop-again-btn" class="btn btn-primary btn-large">Loop again</button>
              <button type="button" id="change-bars-btn" class="btn btn-secondary btn-large">Change bars</button>
            </div>
          </div>
        </section>
      </main>

      <!-- SETTINGS MODAL -->
      <dialog id="settings-dialog" class="settings-modal">
        <form method="dialog" class="settings-form">
          <div class="settings-header">
            <h3>Settings</h3>
            <button type="button" id="close-settings-btn" class="btn btn-ghost">✕</button>
          </div>
          <p class="settings-note">Changes apply from the next loop.</p>
          <div id="settings-error" class="settings-error" hidden></div>

          <label class="setting-row">
            <span>Target Preset</span>
            <select id="setting-preset">
              <option value="gentle">Gentle (90% unaided)</option>
              <option value="standard" selected>Standard (85% unaided)</option>
              <option value="push">Push (75% unaided)</option>
            </select>
          </label>

          <label class="setting-row">
            <span>Shortest T1 (s)</span>
            <input type="number" id="setting-min-t1" min="0.1" max="10" step="0.1" value="0.4">
          </label>

          <label class="setting-row">
            <span>Longest T1 (s)</span>
            <input type="number" id="setting-max-t1" min="0.5" max="30" step="0.1" value="6.0">
          </label>

          <label class="setting-row">
            <span>Voicing Margin</span>
            <input type="number" id="setting-voicing-margin" min="1" max="50" step="1" value="10">
          </label>

          <div class="settings-footer">
            <button type="button" id="done-settings-btn" class="btn btn-primary">Done</button>
          </div>
        </form>
      </dialog>
    </div>
  `;

  // 3. UI Element References
  const startScreen = root.querySelector<HTMLElement>("#start-screen");
  const playingScreen = root.querySelector<HTMLElement>("#playing-screen");
  const summaryScreen = root.querySelector<HTMLElement>("#summary-screen");
  const playingHeaderInfo = root.querySelector<HTMLElement>("#playing-header-info");
  const stopBtn = root.querySelector<HTMLButtonElement>("#stop-btn");
  const settingsBtn = root.querySelector<HTMLButtonElement>("#settings-btn");

  const trySampleBtn = root.querySelector<HTMLButtonElement>("#try-sample-btn");
  const fileInput = root.querySelector<HTMLInputElement>("#file-input");
  const scoreStatus = root.querySelector<HTMLElement>("#score-status");

  const inputRadios = root.querySelectorAll<HTMLInputElement>('input[name="input-source"]');
  const midiStatusWrap = root.querySelector<HTMLElement>("#midi-status-wrap");
  const midiStatusText = root.querySelector<HTMLElement>("#midi-status-text");
  const connectMidiBtn = root.querySelector<HTMLButtonElement>("#connect-midi-btn");
  const computerHelp = root.querySelector<HTMLElement>("#computer-help");

  const barFromInput = root.querySelector<HTMLInputElement>("#bar-from");
  const barToInput = root.querySelector<HTMLInputElement>("#bar-to");
  const startBtn = root.querySelector<HTMLButtonElement>("#start-btn");

  const scoreContainer = root.querySelector<HTMLElement>("#score-container");
  const keyStripContainer = root.querySelector<HTMLElement>("#key-strip-container");

  const summaryRangeText = root.querySelector<HTMLElement>("#summary-range-text");
  const statStepsPlayed = root.querySelector<HTMLElement>("#stat-steps-played");
  const statStaff1Unaided = root.querySelector<HTMLElement>("#stat-staff1-unaided");
  const statStaff2Unaided = root.querySelector<HTMLElement>("#stat-staff2-unaided");
  const statMelodyRate = root.querySelector<HTMLElement>("#stat-melody-rate");
  const statMeanLead = root.querySelector<HTMLElement>("#stat-mean-lead");
  const statT1Delays = root.querySelector<HTMLElement>("#stat-t1-delays");
  const loopAgainBtn = root.querySelector<HTMLButtonElement>("#loop-again-btn");
  const changeBarsBtn = root.querySelector<HTMLButtonElement>("#change-bars-btn");

  const settingsDialog = root.querySelector<HTMLDialogElement>("#settings-dialog");
  const closeSettingsBtn = root.querySelector<HTMLButtonElement>("#close-settings-btn");
  const doneSettingsBtn = root.querySelector<HTMLButtonElement>("#done-settings-btn");
  const settingPreset = root.querySelector<HTMLSelectElement>("#setting-preset");
  const settingMinT1 = root.querySelector<HTMLInputElement>("#setting-min-t1");
  const settingMaxT1 = root.querySelector<HTMLInputElement>("#setting-max-t1");
  const settingVoicingMargin = root.querySelector<HTMLInputElement>("#setting-voicing-margin");
  const settingsError = root.querySelector<HTMLElement>("#settings-error");
  const playingError = root.querySelector<HTMLElement>("#playing-error");

  if (!scoreContainer || !keyStripContainer) {
    throw new Error("Missing score or key strip containers");
  }

  // 4. Initialize Views
  const scoreView = new ScoreView(scoreContainer);
  const keyStrip = new KeyStrip(keyStripContainer, PSR_E363_RANGE);

  // 5. Screen Navigation
  function showScreen(screen: "start" | "playing" | "summary"): void {
    if (startScreen) startScreen.hidden = screen !== "start";
    if (playingScreen) playingScreen.hidden = screen !== "playing";
    if (summaryScreen) summaryScreen.hidden = screen !== "summary";

    if (stopBtn) stopBtn.hidden = screen !== "playing";
    if (playingHeaderInfo) playingHeaderInfo.hidden = screen !== "playing";
  }

  // 6. MIDI Input Handling
  let isMidiConnected = false;
  let isMidiConnecting = false;

  async function connectMidi(): Promise<boolean> {
    if (isMidiConnected) {
      return true;
    }
    if (isMidiConnecting) {
      return false;
    }
    isMidiConnecting = true;
    if (midiStatusText) {
      midiStatusText.textContent = "Connecting to MIDI…";
      midiStatusText.className = "status-text";
    }
    try {
      await webMidiInput.start(onInputEvent);
      isMidiConnected = true;
      const names = webMidiInput.connectedInputs();
      if (midiStatusText) {
        if (names.length > 0) {
          midiStatusText.textContent = `Connected: ${names.join(", ")}`;
          midiStatusText.className = "status-text status-ok";
        } else {
          midiStatusText.textContent = "Connected (no MIDI keyboards detected)";
          midiStatusText.className = "status-text status-warn";
        }
      }
      if (connectMidiBtn) connectMidiBtn.hidden = true;
      return true;
    } catch (err) {
      isMidiConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      if (midiStatusText) {
        midiStatusText.textContent = msg;
        midiStatusText.className = "status-text status-bad";
      }
      if (connectMidiBtn) {
        connectMidiBtn.hidden = false;
        connectMidiBtn.textContent = "Retry MIDI";
      }
      return false;
    } finally {
      isMidiConnecting = false;
    }
  }

  connectMidiBtn?.addEventListener("click", () => {
    connectMidi();
  });

  const midiRadio = root.querySelector<HTMLInputElement>(
    'input[name="input-source"][value="midi"]',
  );
  midiRadio?.addEventListener("click", () => {
    if (!isMidiConnected) {
      connectMidi();
    }
  });

  for (const radio of inputRadios) {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        selectedInputSource = radio.value as "midi" | "computer";
        if (selectedInputSource === "midi") {
          if (midiStatusWrap) midiStatusWrap.hidden = false;
          if (computerHelp) computerHelp.hidden = true;
          connectMidi();
        } else {
          if (midiStatusWrap) midiStatusWrap.hidden = true;
          if (computerHelp) computerHelp.hidden = false;
          webMidiInput.stop();
          isMidiConnected = false;
        }
      }
    });
  }

  // NOTE: Do NOT auto-connect MIDI on mount (must follow a user gesture/click)

  // 7. Loading Score File or Sample
  async function loadScore(name: string, content: string): Promise<void> {
    try {
      if (scoreStatus) scoreStatus.textContent = "Loading score…";
      const parsed = await scoreView.load(content, PSR_E363_RANGE);
      parsedSteps = parsed.steps;
      scoreTitle = parsed.title || name;
      scoreMeasureCount = parsed.measureCount;

      firstContactTracker = new FirstContactTracker(parsedSteps);

      if (scoreStatus) {
        scoreStatus.textContent = `Loaded: ${scoreTitle} (${scoreMeasureCount} bars, ${parsedSteps.length} steps)`;
      }

      const defaultRange = defaultBarRange(scoreMeasureCount);
      currentBarRange = defaultRange;

      if (barFromInput && barToInput) {
        barFromInput.disabled = false;
        barToInput.disabled = false;
        barFromInput.min = "1";
        barFromInput.max = String(scoreMeasureCount);
        barToInput.min = "1";
        barToInput.max = String(scoreMeasureCount);

        barFromInput.value = String(defaultRange.from);
        barToInput.value = String(defaultRange.to);
      }

      updateRangeAndPlayButton();
    } catch (err) {
      if (scoreStatus) {
        scoreStatus.textContent = `Failed to load score: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  function updateRangeAndPlayButton(): void {
    if (!barFromInput || !barToInput || !startBtn) return;
    const fromVal = Number.parseInt(barFromInput.value, 10);
    const toVal = Number.parseInt(barToInput.value, 10);

    const clamped = clampBarRange(fromVal, toVal, scoreMeasureCount);
    currentBarRange = clamped;

    const stepRange = findRangeStepIndices(parsedSteps, clamped.from, clamped.to);
    if (stepRange === null) {
      startBtn.disabled = true;
      startBtn.textContent = "No notes in selected bars";
    } else {
      startBtn.disabled = false;
      startBtn.textContent = `Start playing (bars ${clamped.from}–${clamped.to})`;
    }
  }

  barFromInput?.addEventListener("input", updateRangeAndPlayButton);
  barToInput?.addEventListener("input", updateRangeAndPlayButton);

  trySampleBtn?.addEventListener("click", async () => {
    await loadScore("Aus meines Herzens Grunde, BWV 269 (opening)", sampleScoreXml);
  });

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const isMxl = file.name.toLowerCase().endsWith(".mxl");
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        await loadScore(file.name, reader.result);
      }
    };
    reader.onerror = () => {
      if (scoreStatus) scoreStatus.textContent = "Failed to read file.";
    };
    if (isMxl) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  });

  // 8. WaitEngine Driving & Event Processing
  function onInputEvent(event: InputEvent): void {
    if (!isPlaying || !waitEngine) return;

    if (event.type === "noteOn") {
      keyStrip.press(event.note);
    } else if (event.type === "noteOff") {
      keyStrip.release(event.note);
    }

    const outputs = waitEngine.handle(event);
    for (const out of outputs) {
      processEngineOutput(out);
      if (!isPlaying) break;
    }
  }

  function processEngineOutput(output: EngineOutput): void {
    switch (output.type) {
      case "stepStarted": {
        const step = parsedSteps[output.stepIndex];
        if (!step) break;
        hintedNotesThisStep.clear();

        // Rule 4: Show current bar and next one. Re-render so that bar is first when cursor enters new bar.
        try {
          if (step.measureIndex !== renderedFirstMeasure) {
            renderedFirstMeasure = step.measureIndex;
            const nextMeasure = Math.min(scoreMeasureCount - 1, renderedFirstMeasure + 1);
            scoreView.showMeasures(renderedFirstMeasure, nextMeasure);
          }
          scoreView.moveTo(step);
        } catch (err) {
          stopPlaying();
          const msg = err instanceof Error ? err.message : String(err);
          if (playingError) {
            playingError.textContent = `Score display error: ${msg}`;
            playingError.hidden = false;
          }
          return;
        }
        break;
      }

      case "noteCorrect": {
        const step = parsedSteps[output.stepIndex];
        if (!step) break;
        const wasHinted = hintedNotesThisStep.has(output.note);
        scoreView.mark(step, output.note, wasHinted ? "hinted" : "correct");
        break;
      }

      case "noteWrong": {
        keyStrip.flashWrong(output.note);
        break;
      }

      case "hintShown": {
        for (const note of output.notes) {
          hintedNotesThisStep.add(note);
        }
        keyStrip.showHint([...hintedNotesThisStep]);
        break;
      }

      case "stepCompleted": {
        const step = parsedSteps[output.result.stepIndex];
        if (!step) break;
        const result = output.result;
        stepResults.push(result);

        // Rule 6: HintTimer record only on first completion of the step's bar in this session
        const isFirst = firstContactTracker.recordStepCompleted(step.measureIndex);
        if (isFirst) {
          for (const outcome of result.staves) {
            hintTimer.record(outcome.staff, outcome.unaided);
          }
          waitEngine?.setHintDelays(hintTimer.delays());
        }

        // Grade voicing and mark the melody note
        const voicingResult = gradeVoicing(step, result.velocities, {
          marginVelocity: settings.voicingMargin,
        });
        if (voicingResult) {
          voicingResults.push(voicingResult);
          scoreView.mark(
            step,
            voicingResult.melody,
            voicingResult.stoodOut ? "melodyStoodOut" : "melodyWeak",
          );
        }

        // Clear the hint
        keyStrip.clearHint();
        hintedNotesThisStep.clear();
        break;
      }

      case "finished": {
        stopPlaying();
        showSummary();
        break;
      }
    }
  }

  function startTickLoop(): void {
    function tick(now: number): void {
      if (!isPlaying || !waitEngine) return;
      const outputs = waitEngine.tick(now);
      for (const out of outputs) {
        processEngineOutput(out);
        if (!isPlaying) break;
      }
      if (isPlaying) {
        rafId = requestAnimationFrame(tick);
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function stopPlaying(): void {
    isPlaying = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // 9. Start / Loop / Stop Playing
  async function startPlaySession(): Promise<void> {
    const stepRange = findRangeStepIndices(parsedSteps, currentBarRange.from, currentBarRange.to);
    if (!stepRange) return;

    if (playingError) {
      playingError.hidden = true;
      playingError.textContent = "";
    }

    // Apply pending settings
    settings = { ...pendingSettings };
    hintTimer = new HintTimer(getHintTimerConfig(settings), hintTimer.delays());

    // Active input source listener
    if (selectedInputSource === "midi") {
      const ok = await connectMidi();
      if (!ok) {
        return;
      }
    } else {
      await fakeInput.start(onInputEvent);
    }

    stepResults = [];
    voicingResults = [];
    hintedNotesThisStep.clear();
    scoreView.clearMarks();
    keyStrip.clearHint();
    firstContactTracker.resetPass();
    renderedFirstMeasure = -1;

    waitEngine = new WaitEngine(parsedSteps, {
      from: stepRange.from,
      to: stepRange.to,
      hintDelayMs: hintTimer.delays(),
    });

    if (playingHeaderInfo) {
      playingHeaderInfo.textContent = `${scoreTitle} · Bars ${currentBarRange.from}–${currentBarRange.to}`;
    }

    showScreen("playing");
    isPlaying = true;

    const startOutputs = waitEngine.start(performance.now());
    for (const out of startOutputs) {
      processEngineOutput(out);
      if (!isPlaying) break;
    }

    startTickLoop();
  }

  startBtn?.addEventListener("click", () => {
    startPlaySession();
  });

  stopBtn?.addEventListener("click", () => {
    stopPlaying();
    if (playingError) {
      playingError.hidden = true;
      playingError.textContent = "";
    }
    scoreView.clearMarks();
    keyStrip.clearHint();
    showScreen("start");
  });

  // 10. Summary Screen
  function showSummary(): void {
    const summary = buildPracticeSummary(stepResults, voicingResults, hintTimer.delays());

    if (summaryRangeText) {
      summaryRangeText.textContent = `${scoreTitle} · Bars ${currentBarRange.from}–${currentBarRange.to}`;
    }
    if (statStepsPlayed) {
      statStepsPlayed.textContent = String(summary.stepsPlayed);
    }

    const s1 = summary.staves[1];
    if (statStaff1Unaided) {
      statStaff1Unaided.textContent =
        s1.totalSteps > 0
          ? `${formatPercentage(s1.unaidedRate)} (${s1.unaidedSteps}/${s1.totalSteps})`
          : "—";
    }

    const s2 = summary.staves[2];
    if (statStaff2Unaided) {
      statStaff2Unaided.textContent =
        s2.totalSteps > 0
          ? `${formatPercentage(s2.unaidedRate)} (${s2.unaidedSteps}/${s2.totalSteps})`
          : "—";
    }

    const v = summary.voicing;
    if (statMelodyRate) {
      statMelodyRate.textContent =
        v.graded > 0 ? `${formatPercentage(v.rate)} (${v.stoodOut}/${v.graded})` : "—";
    }
    if (statMeanLead) {
      statMeanLead.textContent = v.graded > 0 ? `${formatLead(v.meanLead)} velocity` : "—";
    }

    if (statT1Delays) {
      statT1Delays.textContent = `Staff 1: ${formatT1Seconds(summary.t1DelaysMs[1])} · Staff 2: ${formatT1Seconds(summary.t1DelaysMs[2])}`;
    }

    showScreen("summary");
  }

  loopAgainBtn?.addEventListener("click", () => {
    startPlaySession();
  });

  changeBarsBtn?.addEventListener("click", () => {
    showScreen("start");
  });

  // 11. Settings Dialog
  settingsBtn?.addEventListener("click", () => {
    if (settingPreset) settingPreset.value = pendingSettings.targetPreset;
    if (settingMinT1) settingMinT1.value = (pendingSettings.minT1Ms / 1000).toFixed(1);
    if (settingMaxT1) settingMaxT1.value = (pendingSettings.maxT1Ms / 1000).toFixed(1);
    if (settingVoicingMargin) settingVoicingMargin.value = String(pendingSettings.voicingMargin);
    if (settingsError) {
      settingsError.hidden = true;
      settingsError.textContent = "";
    }
    settingsDialog?.showModal();
  });

  function savePendingSettings(): void {
    const preset = (settingPreset?.value as TargetPreset) || "standard";
    const minS = Number.parseFloat(settingMinT1?.value || "0.4");
    const maxS = Number.parseFloat(settingMaxT1?.value || "6.0");
    const margin = Number.parseInt(settingVoicingMargin?.value || "10", 10);

    const validation = validateSettings({
      preset,
      minT1Seconds: minS,
      maxT1Seconds: maxS,
      voicingMargin: margin,
    });

    if (!validation.valid) {
      if (settingsError) {
        settingsError.textContent = validation.error;
        settingsError.hidden = false;
      }
      return;
    }

    if (settingsError) {
      settingsError.hidden = true;
      settingsError.textContent = "";
    }

    pendingSettings = validation.settings;
    settingsDialog?.close();
  }

  settingMinT1?.addEventListener("input", () => {
    if (settingsError) settingsError.hidden = true;
  });
  settingMaxT1?.addEventListener("input", () => {
    if (settingsError) settingsError.hidden = true;
  });

  doneSettingsBtn?.addEventListener("click", savePendingSettings);
  closeSettingsBtn?.addEventListener("click", () => settingsDialog?.close());
}
