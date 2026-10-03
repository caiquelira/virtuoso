/**
 * T08 — The first playable slice: wires input, engine, hint timer, voicing and the view.
 * Spec: docs/tasks/T08-first-slice.md
 */
export function startApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="placeholder">
      <h1>Virtuoso</h1>
      <p>The game isn't built yet. The tasks are in <code>docs/tasks/</code>.</p>
      <p>To check your keyboard now, open <a href="/tools/midi-check.html">the MIDI check page</a>.</p>
    </main>`;
}
