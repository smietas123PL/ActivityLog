// ── storage.js ────────────────────────────────────────────────────────────────
import { DB, DB_SCHEMA_VERSION } from './db.js';
import { AppState } from './state.js';
import {
  STORAGE_KEY, AI_STORAGE_KEY,
  WORK_TYPE,
} from './constants.js';
import { todayStr, nowTime, parseTags, downloadBlob } from './helpers.js';

// Forward refs — assigned by bootstrap after all modules load
// Avoids circular imports: storage.addEntry() needs to invalidate
// RAGEngine / GraphEngine / StrategicDrift / SyncEngine.
export const _invalidators = {
  RAGEngine:      null,
  GraphEngine:    null,
  StrategicDrift: null,
  SyncEngine:     null,
  UI:             null,
};

export const Storage = {
  _normalise(e) {
    return {
      id:         e.id         || String(Date.now() + Math.random()),
      date:       e.date       || todayStr(),
      start_time: e.start_time || e.time || '00:00',
      end_time:   e.end_time   || e.time || '00:00',
      duration:   Number(e.duration) || 0,
      category:   e.category   || 'Głęboka Praca',
      work_type:  e.work_type  || WORK_TYPE[e.category] || 'Operacyjny',
      note:       e.note       || '',
      tags:       e.tags       || parseTags(e.note || ''),
    };
  },

  async persist() {
    try {
      await DB.putMany('entries', AppState.entries);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.entries)); } catch(e) {}
    } catch(err) {
      console.error('DB persist error:', err);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.entries)); } catch(e) {}
    }
  },

  async persistEntry(entry) {
    try {
      await DB.put('entries', entry);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.entries)); } catch(e) {}
    } catch(err) {
      console.error('DB persistEntry error:', err);
    }
  },

  async deleteEntryDB(id) {
    try { await DB.del('entries', id); } catch(err) { console.error('DB del error:', err); }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.entries)); } catch(e) {}
  },

  async loadData() {
    await DB.open();
    const migrated = await this._migrateFromLocalStorage();
    const rows = await DB.getAll('entries');
    const seen = new Set();
    const unique = [];
    for (const r of rows) {
      if (!seen.has(r.id)) { seen.add(r.id); unique.push(r); }
    }
    AppState.entries = unique.map(e => this._normalise(e));
    AppState.entries.sort((a, b) =>
      (b.date + b.start_time).localeCompare(a.date + a.start_time)
    );
    if (migrated) await DB.putMany('entries', AppState.entries);
  },

  async _migrateFromLocalStorage() {
    const flag = await DB.get('meta', 'ls_migration_done');
    if (flag) return false;

    let migrated = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          await DB.putMany('entries', parsed.map(e => this._normalise(e)));
          migrated = true;
        }
      }
    } catch(e) { console.warn('LS migration error:', e); }

    try {
      const aiRaw = localStorage.getItem(AI_STORAGE_KEY);
      if (aiRaw) await DB.put('settings', { key: 'ai_settings', value: aiRaw });
    } catch(e) {}

    try {
      const stRaw = localStorage.getItem('strategicTargets');
      if (stRaw) await DB.put('settings', { key: 'strategicTargets', value: stRaw });
    } catch(e) {}

    try {
      const lc = localStorage.getItem('lastCat');
      if (lc) await DB.put('settings', { key: 'lastCat', value: lc });
    } catch(e) {}

    try {
      const th = localStorage.getItem('actlog_theme');
      if (th) await DB.put('settings', { key: 'actlog_theme', value: th });
    } catch(e) {}

    await DB.put('meta', { key: 'ls_migration_done', value: true, schema: DB_SCHEMA_VERSION, ts: Date.now() });
    return migrated;
  },

  addEntry({ note, start_time, end_time, duration, category }) {
    const tags = parseTags(note || '');
    const entry = {
      id:         String(Date.now() + Math.random()),
      date:       todayStr(),
      start_time: start_time || nowTime(),
      end_time:   end_time   || nowTime(),
      duration:   duration   || 0,
      category:   category   || AppState.selectedCategory,
      work_type:  WORK_TYPE[category || AppState.selectedCategory] || 'Operacyjny',
      note:       note || '(brak notatki)',
      tags,
    };
    AppState.entries.unshift(entry);
    this.persistEntry(entry);
    _invalidators.RAGEngine?.invalidate();
    _invalidators.GraphEngine?.invalidate();
    _invalidators.StrategicDrift?.invalidate();
    _invalidators.SyncEngine?.onEntryAdded(entry);
  },

  deleteEntry(id) {
    AppState.entries = AppState.entries.filter(e => e.id !== id);
    this.deleteEntryDB(id);
    _invalidators.RAGEngine?.invalidate();
    _invalidators.GraphEngine?.invalidate();
    _invalidators.StrategicDrift?.invalidate();
    _invalidators.SyncEngine?.onEntryDeleted(id);
  },

  getEntries() { return AppState.entries; },

  searchEntries(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return AppState.entries.slice();
    return AppState.entries.filter(e =>
      e.note.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.tags && e.tags.some(t => t.includes(q)))
    );
  },

  extractTags() {
    return [...new Set(AppState.entries.flatMap(e => e.tags || []))];
  },

  async exportBackup() {
    const aiRow      = await DB.get('settings', 'ai_settings').catch(() => null);
    const targetsRow = await DB.get('settings', 'strategicTargets').catch(() => null);
    const lastCatRow = await DB.get('settings', 'lastCat').catch(() => null);
    const themeRow   = await DB.get('settings', 'actlog_theme').catch(() => null);
    const metaRows   = await DB.getAll('meta').catch(() => []);

    const backup = {
      _backup_version: 1,
      _schema_version: DB_SCHEMA_VERSION,
      _exported_at:    new Date().toISOString(),
      entries:         AppState.entries,
      settings: {
        ai_settings:      aiRow      ? aiRow.value      : null,
        strategicTargets: targetsRow ? targetsRow.value : null,
        lastCat:          lastCatRow ? lastCatRow.value : null,
        actlog_theme:     themeRow   ? themeRow.value   : null,
      },
      meta: metaRows,
    };

    downloadBlob(JSON.stringify(backup, null, 2), `actlog_backup_${todayStr()}.json`, 'application/json');
    _invalidators.UI?.showToast('Backup pobrany ✓');
  },

  async importBackup(jsonText) {
    let data;
    try { data = JSON.parse(jsonText); } catch(e) { throw new Error('Nieprawidłowy JSON'); }
    if (!data || typeof data !== 'object')           throw new Error('Plik nie jest obiektem JSON');
    if (!Array.isArray(data.entries))                throw new Error('Brak tablicy entries w backupie');
    if (data._backup_version === undefined)          throw new Error('Brak _backup_version');

    const invalid = data.entries.filter(e => !e.id || !e.date || !e.category);
    if (invalid.length > data.entries.length * 0.5) throw new Error(`Zbyt wiele nieprawidłowych wpisów (${invalid.length})`);

    const normalised = data.entries.map(e => this._normalise(e));
    const existingMap = new Map(AppState.entries.map(e => [e.id, e]));
    for (const e of normalised) existingMap.set(e.id, e);
    const merged = [...existingMap.values()];
    merged.sort((a, b) => (b.date + b.start_time).localeCompare(a.date + a.start_time));

    await DB.putMany('entries', merged);
    AppState.entries = merged;

    if (data.settings) {
      const s = data.settings;
      if (s.ai_settings)      await DB.put('settings', { key: 'ai_settings',      value: s.ai_settings });
      if (s.strategicTargets) await DB.put('settings', { key: 'strategicTargets', value: s.strategicTargets });
      if (s.lastCat)          await DB.put('settings', { key: 'lastCat',          value: s.lastCat });
      if (s.actlog_theme)     await DB.put('settings', { key: 'actlog_theme',     value: s.actlog_theme });
      if (s.ai_settings)      { try { localStorage.setItem(AI_STORAGE_KEY,     s.ai_settings);      } catch(e){} }
      if (s.strategicTargets) { try { localStorage.setItem('strategicTargets', s.strategicTargets); } catch(e){} }
      if (s.lastCat)          { try { localStorage.setItem('lastCat',          s.lastCat);          } catch(e){} }
      if (s.actlog_theme)     { try { localStorage.setItem('actlog_theme',     s.actlog_theme);     } catch(e){} }
    }

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.entries)); } catch(e) {}

    _invalidators.RAGEngine?.invalidate();
    _invalidators.GraphEngine?.invalidate();
    _invalidators.StrategicDrift?.invalidate();

    return merged.length;
  },
};
