// ── recorder.js ───────────────────────────────────────────────────────────────
import { AppState } from './state.js';
import { nowTime } from './helpers.js';
import { FILLER_WORDS, FILLER_RE, CATEGORY_HINTS } from './transcript.js';

// Forward refs injected by bootstrap
export const _refs = { AI: null, cleanTranscript: null };

export const Recorder = (() => {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition    = null;
  let _mode          = 'voice';
  let _micBlocked    = false;
  let _timeoutTid    = null;

  const recordBtn       = document.getElementById('recordBtn');
  const recordWrap      = document.getElementById('recordWrap');
  const recStatus       = document.getElementById('recStatus');
  const recTimer        = document.getElementById('recTimer');
  const liveTranscript  = document.getElementById('liveTranscript');
  const waveBars        = Array.from(document.querySelectorAll('.wave-bar'));
  const voiceModeEl     = document.getElementById('voiceMode');
  const textModeEl      = document.getElementById('textMode');
  const textInput       = document.getElementById('textFallbackInput');
  const vmtVoice        = document.getElementById('vmtVoice');
  const vmtText         = document.getElementById('vmtText');
  const micBanner       = document.getElementById('micStatusBanner');
  const micBannerIcon   = document.getElementById('micStatusIcon');
  const micBannerText   = document.getElementById('micStatusText');
  const micBannerAction = document.getElementById('micStatusAction');

  function _showBanner(icon, msg, showRetry = false, isErr = false) {
    micBannerIcon.textContent = icon;
    micBannerText.textContent = msg;
    micBannerAction.style.display = showRetry ? 'block' : 'none';
    micBanner.className = 'mic-status-banner show' + (isErr ? ' err' : ' warn');
  }
  function _hideBanner() { micBanner.className = 'mic-status-banner'; }

  function setMode(m) {
    if (AppState.isRecording) stop(false);
    _mode = m;
    if (m === 'text') {
      voiceModeEl.style.display = 'none';
      textModeEl.classList.add('show');
      vmtVoice.classList.remove('active');
      vmtText.classList.add('active');
      textInput.focus();
    } else {
      textModeEl.classList.remove('show');
      voiceModeEl.style.display = '';
      vmtText.classList.remove('active');
      vmtVoice.classList.add('active');
      if (_micBlocked) _showBanner('🔒', 'Mikrofon zablokowany. Zezwól na dostęp w ustawieniach przeglądarki.', true, true);
    }
  }

  function submitText() {
    const raw = (textInput.value || '').trim();
    if (!raw) { textInput.focus(); return; }
    const cleaned = _refs.cleanTranscript(raw);
    const note    = cleaned.cleanText || raw;
    const startT  = nowTime();
    const endTime = nowTime();
    textInput.value = '';
    _refs.AI.openReviewOverlay({ note, start_time: startT, end_time: endTime, duration: 30, suggestedCategory: cleaned.suggestedCategory });
  }

  function buildRec() {
    const r = new SpeechRec();
    r.lang = 'pl-PL'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
    return r;
  }

  function attachHandlers(r) {
    r.onstart = () => { clearTimeout(_timeoutTid); _hideBanner(); };

    r.onresult = e => {
      clearTimeout(_timeoutTid);
      let final = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      AppState.pendingTranscript = final || interim;
      liveTranscript.textContent = AppState.pendingTranscript;
    };

    r.onerror = e => {
      clearTimeout(_timeoutTid);
      const err = e.error;
      if (err === 'no-speech') return;
      if (err === 'not-allowed' || err === 'permission-denied') {
        _micBlocked = true; stop(false);
        _showBanner('🔒', 'Dostęp do mikrofonu zablokowany. Zezwól w ustawieniach przeglądarki i odśwież stronę.', false, true);
        setTimeout(() => setMode('text'), 900); return;
      }
      if (err === 'audio-capture' || err === 'device-not-found') {
        _micBlocked = true; stop(false);
        _showBanner('🎤', 'Mikrofon niedostępny. Sprawdź podłączenie urządzenia.', true, true);
        setTimeout(() => setMode('text'), 900); return;
      }
      if (err === 'network') {
        _showBanner('📶', 'Problem z siecią — rozpoznawanie mowy może działać wolniej.', false, false);
        if (AppState.isRecording) _safeRestart(); return;
      }
      if (err === 'aborted') return;
      console.warn('[Recorder] SpeechRecognition error:', err);
      if (AppState.isRecording) _safeRestart();
    };

    r.onend = () => {
      clearTimeout(_timeoutTid);
      if (AppState.isRecording && !_micBlocked) _safeRestart();
    };
  }

  function _safeRestart() {
    if (!SpeechRec || _micBlocked) return;
    try {
      recognition = buildRec(); attachHandlers(recognition); recognition.start();
      _timeoutTid = setTimeout(() => {
        if (AppState.isRecording)
          _showBanner('⏱', 'Mikrofon nie odpowiada. Sprawdź uprawnienia lub przełącz na wpis tekstowy.', true, false);
      }, 4000);
    } catch(e) { console.warn('[Recorder] restart error:', e); }
  }

  function animateWave() {
    waveBars.forEach(b => {
      b.style.height  = (4 + Math.random()*22)+'px';
      b.style.opacity = 0.5 + Math.random()*.5;
    });
  }

  function updateTimer() {
    const s = Math.floor((Date.now()-AppState.recStartTime)/1000);
    recTimer.textContent = String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  }

  function start() {
    if (_micBlocked) {
      _showBanner('🔒', 'Mikrofon zablokowany — użyj wpisu tekstowego.', false, true);
      setTimeout(() => setMode('text'), 600); return;
    }
    AppState.isRecording = true; AppState.pendingTranscript = ''; AppState.recStartTime = Date.now();
    localStorage.setItem('actlog_rec_start',     String(AppState.recStartTime));
    localStorage.setItem('activeRecording',      'true');
    localStorage.setItem('activeRecordingStart', String(AppState.recStartTime));
    liveTranscript.textContent = '';
    recordBtn.classList.replace('idle','recording');
    recordWrap.classList.add('recording');
    recStatus.textContent = '● NAGRYWANIE'; recStatus.className = 'rec-status listening';
    recTimer.classList.add('running');
    AppState.recInterval  = setInterval(updateTimer, 1000);
    AppState.waveInterval = setInterval(animateWave, 140);
    if (SpeechRec) {
      _timeoutTid = setTimeout(() => {
        if (AppState.isRecording && !AppState.pendingTranscript) {
          _showBanner('⏱', 'Mikrofon nie uruchomił się. Przełączono na wpis tekstowy.', true, true);
          stop(false); setMode('text');
        }
      }, 5000);
      try { recognition.start(); } catch(e) { _safeRestart(); }
    }
  }

  function stop(autoSave = true) {
    if (!AppState.isRecording) return;
    clearTimeout(_timeoutTid);
    AppState.isRecording = false;
    localStorage.removeItem('actlog_rec_start');
    localStorage.removeItem('activeRecording');
    localStorage.removeItem('activeRecordingStart');
    const endTime = nowTime();
    const durSec  = Math.floor((Date.now()-AppState.recStartTime)/1000);
    const durMin  = Math.max(1, Math.round(durSec/60));
    const startT  = new Date(AppState.recStartTime).toTimeString().slice(0,5);
    clearInterval(AppState.recInterval); clearInterval(AppState.waveInterval);
    AppState.recInterval = AppState.waveInterval = null;
    waveBars.forEach(b => { b.style.height='4px'; b.style.background='var(--red)'; });
    recordBtn.classList.replace('recording','idle');
    recordWrap.classList.remove('recording');
    recTimer.textContent = '00:00'; recTimer.classList.remove('running');
    if (SpeechRec) { try { recognition.stop(); } catch(e){} }
    if (!autoSave) {
      recStatus.textContent = 'DOTKNIJ ABY NAGRAĆ'; recStatus.className = 'rec-status';
      liveTranscript.textContent = ''; return;
    }
    const rawNote = AppState.pendingTranscript.trim();
    const cleaned = _refs.cleanTranscript(rawNote);
    const note    = cleaned.cleanText || rawNote || '(brak notatki)';
    liveTranscript.textContent = '';
    recStatus.textContent = 'DOTKNIJ ABY NAGRAĆ'; recStatus.className = 'rec-status';
    _refs.AI.openReviewOverlay({ note, start_time: startT, end_time: endTime, duration: durMin, suggestedCategory: cleaned.suggestedCategory });
  }

  function reset() {
    AppState.isRecording = false; AppState.pendingTranscript = '';
    recStatus.textContent = 'DOTKNIJ ABY NAGRAĆ'; recStatus.className = 'rec-status';
    liveTranscript.textContent = ''; recTimer.textContent = '00:00';
    recTimer.classList.remove('running');
    recordBtn.classList.replace('recording','idle');
    recordWrap.classList.remove('recording');
    waveBars.forEach(b => { b.style.height='4px'; });
  }

  function retryVoice() {
    _micBlocked = false; _hideBanner(); setMode('voice');
    if (SpeechRec) { recognition = buildRec(); attachHandlers(recognition); }
  }

  function restorePersistentTimer() {
    const saved = localStorage.getItem('activeRecordingStart') || localStorage.getItem('actlog_rec_start');
    if (!saved) { _clearPersist(); return; }
    const savedStart = Number(saved);
    if (!savedStart || isNaN(savedStart) || savedStart <= 0) { _clearPersist(); return; }
    const elapsed = Date.now() - savedStart;
    if (elapsed < 0 || elapsed > 24 * 60 * 60 * 1000) { _clearPersist(); return; }

    AppState.recStartTime = savedStart; AppState.isRecording = true; AppState.pendingTranscript = '';
    localStorage.setItem('activeRecording', 'true');
    localStorage.setItem('activeRecordingStart', String(savedStart));
    localStorage.setItem('actlog_rec_start', String(savedStart));
    recordBtn.classList.replace('idle','recording');
    recordWrap.classList.add('recording');
    recStatus.textContent = '● NAGRYWANIE (odtworzono)'; recStatus.className = 'rec-status listening';
    recTimer.classList.add('running');
    updateTimer();
    AppState.recInterval  = setInterval(updateTimer, 1000);
    AppState.waveInterval = setInterval(animateWave, 140);
    if (SpeechRec && !_micBlocked) { try { recognition.start(); } catch(e) { _safeRestart(); } }
  }

  function _clearPersist() {
    localStorage.removeItem('activeRecording');
    localStorage.removeItem('activeRecordingStart');
    localStorage.removeItem('actlog_rec_start');
  }

  function init() {
    if (!SpeechRec) {
      _micBlocked = true;
      _showBanner('🌐', 'Przeglądarka nie obsługuje rozpoznawania mowy. Użyj wpisu tekstowego.', false, true);
      setMode('text');
    } else {
      recognition = buildRec(); attachHandlers(recognition);
    }
    recordBtn.addEventListener('click', () => {
      if (AppState.isRecording) stop(true); else start();
    });
    textInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); }
    });
    restorePersistentTimer();
  }

  return { init, start, stop, reset, updateTimer, animateWave, setMode, submitText, retryVoice };
})();
