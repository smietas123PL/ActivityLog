// ── transcript.js — filler removal + category hinting ────────────────────────
export const FILLER_WORDS = [
  'yyy+', 'eee+', 'yyy', 'eee', 'uhm', 'umm', 'um', 'hmm', 'hm',
  'no\\s+więc', 'w\\s+sensie', 'jakby', 'właśnie\\s+że',
  'no\\s+to', 'tak\\s+więc', 'znaczy\\s+się', 'znaczy',
  'prawda', 'wiesz', 'rozumiesz', 'słuchaj',
];

export const FILLER_RE = new RegExp(
  '(?:^|\\s)(?:' + FILLER_WORDS.join('|') + ')(?=\\s|$)',
  'gi'
);

export const CATEGORY_HINTS = [
  { re: /\b(spotkanie|meeting|call|rozmowa|konferencja|zebranie|sync)\b/i,  cat: 'Spotkanie'     },
  { re: /\b(plan|strategia|cel|roadmap|wizja|kierunek|priorytet)\b/i,        cat: 'Strategia'      },
  { re: /\b(kod|kodowanie|programowanie|implementacja|refaktor|debug|review|feature|analiz)\b/i, cat: 'Głęboka Praca' },
  { re: /\b(zarządzanie|feedback|ocena|rekrutacja|1on1|onboarding|delegow)\b/i, cat: 'Zarządzanie' },
  { re: /\b(email|mail|faktura|raport|dokumentacja|formularz|administr|papier)\b/i, cat: 'Administracja' },
];

export function cleanTranscript(text) {
  if (!text || typeof text !== 'string') return { cleanText: text || '', suggestedCategory: null };

  const words = text.trim().split(/\s+/);
  if (words.length < 3) return { cleanText: text.trim(), suggestedCategory: null };

  let t = text.trim();
  t = t.replace(FILLER_RE, ' ');

  const dupRe = /\b([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]{2,})\s+\1\b/gi;
  t = t.replace(dupRe, '$1');
  t = t.replace(dupRe, '$1');
  t = t.replace(/\s{2,}/g, ' ').trim();

  if (t.split(/\s+/).length < 3) return { cleanText: text.trim(), suggestedCategory: null };

  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?…]$/.test(t)) t += '.';

  let suggestedCategory = null;
  for (const hint of CATEGORY_HINTS) {
    if (hint.re.test(text)) { suggestedCategory = hint.cat; break; }
  }

  return { cleanText: t, suggestedCategory };
}
