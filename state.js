// ── state.js ──────────────────────────────────────────────────────────────────
// Single mutable app state object. Modules import this and mutate it directly.
// No reactivity framework — plain object, same pattern as the original monolith.

export const AppState = {
  entries: [],
  selectedCategory: localStorage.getItem('lastCat') || 'Głęboka Praca',
  currentScreen: 'main',
  isRecording: false,
  recStartTime: null,
  pendingTranscript: '',
  historyQuery: '',
  aiSelectedType: null,
  aiCurrentPeriod: 30,
  aiCurrentPrompt: '',
  aiCurrentResponse: '',
  aiIsRunning: false,
  aiCurrentContext: '',
  catOverlayCallback: null,
  settingsTempProvider: null,
  reminderTimer: null,
  toastTimer: null,
  recInterval: null,
  waveInterval: null,
  graphFilterPopupType: '',
};
