// ── constants.js ─────────────────────────────────────────────────────────────
export const STORAGE_KEY = 'actlog_v3';
export const AI_STORAGE_KEY = 'actlog_ai_settings';
export const THEME_KEY = 'actlog_theme';
export const ONBOARDING_KEY = 'onboardingCompleted';

export const CATS = ['Spotkanie','Strategia','Głęboka Praca','Zarządzanie','Administracja'];

export const CAT_COLORS = {
  'Spotkanie':     '#4d9eff',
  'Strategia':     '#a78bfa',
  'Głęboka Praca': '#00e0a0',
  'Zarządzanie':   '#f5c842',
  'Administracja': '#8c96aa',
};

export const CAT_CLASS_KEY = {
  'Spotkanie':     'Spotkanie',
  'Strategia':     'Strategia',
  'Głęboka Praca': 'GlebokaPraca',
  'Zarządzanie':   'Zarzadzanie',
  'Administracja': 'Administracja',
};

export const WORK_TYPE = {
  'Spotkanie':     'Operacyjny',
  'Strategia':     'Strategiczny',
  'Głęboka Praca': 'Strategiczny',
  'Zarządzanie':   'Operacyjny',
  'Administracja': 'Administracyjny',
};

export const EXEC_COLORS = {
  'Strategiczny':    '#a78bfa',
  'Operacyjny':      '#4d9eff',
  'Administracyjny': '#8c96aa',
};

export const STRATEGIC_TARGETS_DEFAULT = {
  'Spotkanie':     20,
  'Strategia':     30,
  'Głęboka Praca': 30,
  'Zarządzanie':   10,
  'Administracja': 10,
};

export const FILLER_WORDS = [
  'yyy','eee','hmm','no','czyli','właśnie','znaczy','wiesz','kurde','okej','dobra','tak','tego',
];

export const CATEGORY_HINTS = [
  { keywords: ['spotkanie','meeting','call','rozmowa','sync','standup'], cat: 'Spotkanie' },
  { keywords: ['strategia','plan','roadmap','wizja','cel','okr'], cat: 'Strategia' },
  { keywords: ['kod','programowanie','dev','feature','bug','review','praca głęboka','focus'], cat: 'Głęboka Praca' },
  { keywords: ['zarządzanie','team','zespół','feedback','1on1','rekrutacja'], cat: 'Zarządzanie' },
  { keywords: ['admin','email','maile','faktura','papierologia','raport'], cat: 'Administracja' },
];
