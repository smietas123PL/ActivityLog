# Activity Log — Modular Architecture

## Status: Phase 1 Complete

Modularization is in progress. Phase 1 extracts **state**, **storage**, **db**, **recorder**, and **transcript** into proper ES modules under `src/modules/`. The app runs correctly as a standalone HTML file while the migration continues.

## Project Structure

```
actlog/
├── index.html                  ← Main app (serves standalone OR via Vite)
├── package.json
├── vite.config.js
└── src/
    ├── main.js                 ← Entry point (type="module", future Vite build)
    └── modules/
        ├── constants.js        ✅ Extracted — all shared constants
        ├── state.js            ✅ Extracted — AppState
        ├── helpers.js          ✅ Extracted — pure utility functions
        ├── db.js               ✅ Extracted — IndexedDB wrapper
        ├── storage.js          ✅ Extracted — Storage module (with _invalidators pattern)
        ├── transcript.js       ✅ Extracted — cleanTranscript + filler removal
        └── recorder.js         ✅ Extracted — Recorder with voice/text fallback
```

## Modules Remaining in Monolith (Phase 2+)

| Module | Phase |
|--------|-------|
| UI | 2 |
| Analytics | 2 |
| AI / AISettings / RAGEngine | 2 |
| GraphEngine / Graph / GraphPro / GraphReplay | 3 |
| ExecDash / CoachEngine | 3 |
| StrategicDrift | 2 |
| Reminders | 2 |
| Export | 2 |
| TabNav / TodayTabs | 2 |
| HistoryFilters | 2 |
| FocusSession | 3 |
| SyncEngine | 3 |
| Onboarding | 2 |

## How It Works (Phase 1)

`index.html` contains a single `<script>` block that:
1. Defines inline shims for the extracted modules (so remaining monolith code compiles)
2. Contains all not-yet-extracted modules unchanged
3. Runs the bootstrap IIFE

The `src/modules/*.js` files are the **canonical** sources. During Phase 2, each module will be removed from the shim block in `index.html` and imported properly via `src/main.js`.

## Running

**Standalone (no build):**
```
open index.html  # works in any modern browser with module support
```

**With Vite (after npm install):**
```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # outputs to dist/
```

## Circular Dependency Strategy

`storage.js` needs to call `RAGEngine.invalidate()`, `GraphEngine.invalidate()`, etc. — but those modules aren't extracted yet (they're in the monolith).

Solution: `_invalidators` object in `storage.js` holds nullable refs, populated by `main.js` after all globals are defined:

```js
// storage.js
export const _invalidators = { RAGEngine: null, GraphEngine: null, ... };

// main.js
storageInvalidators.RAGEngine = window.RAGEngine;
```

This avoids circular imports and keeps each module independently testable.
