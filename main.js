// ── main.js — app bootstrap ───────────────────────────────────────────────────
// This is the single entry point. It imports all modules, wires up forward
// references (to avoid circular deps), and runs the init sequence that was
// previously the inline IIFE at the bottom of the monolith.

import { AppState }          from './modules/state.js';
import { Storage, _invalidators as storageInvalidators } from './modules/storage.js';
import { Recorder, _refs as recorderRefs } from './modules/recorder.js';
import { cleanTranscript }   from './modules/transcript.js';

// ── Expose globals that inline HTML event handlers still reference ─────────────
// The HTML was written expecting globals. We keep them during transition;
// they'll be removed module-by-module as the HTML gets migrated to listeners.
window.AppState    = AppState;
window.Storage     = Storage;
window.Recorder    = Recorder;

// ── Wire forward references ───────────────────────────────────────────────────
// Storage needs these to call .invalidate() / .onEntryAdded() after mutations.
// They live on window because they're still defined as globals in the monolith
// script block — they'll be migrated in subsequent passes.
function _wire() {
  storageInvalidators.RAGEngine      = window.RAGEngine      ?? null;
  storageInvalidators.GraphEngine    = window.GraphEngine    ?? null;
  storageInvalidators.StrategicDrift = window.StrategicDrift ?? null;
  storageInvalidators.SyncEngine     = window.SyncEngine     ?? null;
  storageInvalidators.UI             = window.UI             ?? null;

  // Recorder needs AI + cleanTranscript (AI is still in monolith script)
  recorderRefs.AI              = window.AI;
  recorderRefs.cleanTranscript = cleanTranscript;
}

// ── Init sequence ─────────────────────────────────────────────────────────────
(async () => {
  // Wait for the monolith <script> to finish defining globals
  await new Promise(r => setTimeout(r, 0));
  _wire();

  await Storage.loadData();
  window.RAGEngine?.init();
  window.UI?.updateCatChip();
  window.Reminders?.init();
  window.SyncEngine?.init();
  Recorder.init();
  window.HistoryFilters?.init();
  window.TabNav?.go('main');
  window.Onboarding?.init();
})();
