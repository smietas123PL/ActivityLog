// ── helpers.js ────────────────────────────────────────────────────────────────
import { CAT_CLASS_KEY, CAT_COLORS } from './constants.js';

export function todayStr()    { return new Date().toISOString().slice(0,10); }
export function nowTime()     { return new Date().toTimeString().slice(0,5); }
export function sevenDaysAgo(){ const d=new Date(); d.setDate(d.getDate()-6); return d.toISOString().slice(0,10); }
export function monthKey(dateStr) { return dateStr ? dateStr.slice(0,7) : ''; }

export function formatDur(min) {
  min = Number(min) || 0;
  if (!min) return '—';
  if (min < 60) return min + 'm';
  const h = Math.floor(min/60), m = min%60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function pluralWpis(n) { return n + (n===1?' wpis':n<5?' wpisy':' wpisów'); }

export function catTag(cat) {
  const key   = CAT_CLASS_KEY[cat] || 'GlebokaPraca';
  const color = CAT_COLORS[cat]    || '#8c96aa';
  return `<span class="tag tag-${key}"><span class="tag-dot" style="background:${color}"></span>${esc(cat)}</span>`;
}

export function parseTags(note) {
  const matches = note.match(/#[\w\u00C0-\u024F\u0400-\u04FF]+/g) || [];
  return [...new Set(matches.map(t => t.toLowerCase()))];
}

export function renderTagPills(tags) {
  if (!tags || !tags.length) return '';
  return `<div class="tag-pills-row">${tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join('')}</div>`;
}

export function noteWithoutTags(note) {
  return note.replace(/#[\w\u00C0-\u024F\u0400-\u04FF]+/g,'').trim();
}

export function downloadBlob(content, filename, type) {
  const blob = new Blob(['\uFEFF'+content], {type});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
