import type { RecordingState, SavedRecording } from '../shared/types';
import { getPrefs, setPrefs, type Prefs } from '../shared/prefs';
import { deleteRecording } from '../shared/storage';

// ── Elements ──
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const idleView       = $('idle-view');
const countdownView  = $('countdown-view');
const recordingView  = $('recording-view');
const recentsView    = $('recents-view');
const brandRow       = $('brand-row');

const startBtn       = $('startBtn');
const pauseBtn       = $('pauseBtn');
const stopBtn        = $('stopBtn');
const cancelRecBtn   = $('cancelRecBtn');
const cancelCdBtn    = $('cancelCountdownBtn');

const recTimer       = $('rec-timer');
const recModeBadge   = $('rec-mode-label');
const countdownNum   = $('countdown-num');
const recCount       = $('rec-count');
const recordingsList = $('recordings-list');

const captureSelect  = $<HTMLSelectElement>('captureSelect');
const cameraSelect   = $<HTMLSelectElement>('cameraSelect');
const micSelect      = $<HTMLSelectElement>('micSelect');
const cameraToggle   = $('cameraToggle');
const micToggle      = $('micToggle');
const countdownBtn   = $('countdownToggle');
const hdToggle       = $('hdToggle');
const moreBtn        = $('moreBtn');
const audioBar       = $('audioBar');

const homeBtn        = $('homeBtn');
const closeBtn       = $('closeBtn');
const videoBtn       = $('videoBtn');
const camBtn         = $('camBtn');

// ── State ──
let prefs: Prefs;
let captureTarget: 'screen' | 'window' | 'tab' = 'screen';
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let recState: RecordingState | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let micStream: MediaStream | null = null;

// ── Toast ──
const toast = (msg: string, tone: 'info' | 'ok' | 'err' = 'info') => {
  const t = document.createElement('div');
  t.className = `toast toast-${tone}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 250);
  }, 1800);
};

// ── Helpers ──
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const timeAgo = (iso: string): string => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

function showView(v: 'idle' | 'countdown' | 'recording' | 'recents') {
  idleView.classList.toggle('view-hidden', v !== 'idle');
  countdownView.classList.toggle('view-hidden', v !== 'countdown');
  recordingView.classList.toggle('view-hidden', v !== 'recording');
  recentsView.classList.toggle('view-hidden', v !== 'recents');
  brandRow.classList.toggle('view-hidden', v !== 'idle');

  document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active'));
  if (v === 'recents') homeBtn.classList.add('active');
  else if (v === 'idle') {
    (prefs?.mode === 'screen' ? videoBtn : camBtn).classList.add('active');
  }
}

// ── Pill badge toggle ──
function setPill(el: HTMLElement, on: boolean) {
  el.classList.toggle('on', on);
  el.classList.toggle('off', !on);
  el.textContent = on ? 'On' : 'Off';
}

// ── Audio meter ──
async function startAudioMeter() {
  try {
    const constraints: MediaStreamConstraints = {
      audio: prefs.micId ? { deviceId: { exact: prefs.micId } } : true,
    };
    micStream = await navigator.mediaDevices.getUserMedia(constraints);
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    audioCtx.createMediaStreamSource(micStream).connect(analyser);
    animateAudio();
  } catch {
    /* mic blocked */
  }
}

function animateAudio() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const pct = Math.min(100, (avg / 128) * 100);
  audioBar.style.width = `${Math.max(4, pct)}%`;
  requestAnimationFrame(animateAudio);
}

function stopAudioMeter() {
  micStream?.getTracks().forEach(t => t.stop());
  micStream = null;
  audioCtx?.close().catch(() => {});
  audioCtx = null;
  analyser = null;
  audioBar.style.width = '0%';
}

// ── Device enumeration ──
async function loadDevices() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
    const devs = await navigator.mediaDevices.enumerateDevices();

    cameraSelect.innerHTML = '<option value="">No Camera</option>';
    devs.filter(d => d.kind === 'videoinput').forEach((c, i) => {
      const o = document.createElement('option');
      o.value = c.deviceId;
      o.textContent = c.label || `Camera ${i + 1}`;
      cameraSelect.appendChild(o);
    });

    micSelect.innerHTML = '<option value="">No Microphone</option>';
    devs.filter(d => d.kind === 'audioinput').forEach((m, i) => {
      const o = document.createElement('option');
      o.value = m.deviceId;
      o.textContent = m.label || `Mic ${i + 1}`;
      micSelect.appendChild(o);
    });

    // Restore selections from prefs
    if (prefs.cameraId && [...cameraSelect.options].some(o => o.value === prefs.cameraId)) {
      cameraSelect.value = prefs.cameraId;
    }
    if (prefs.micId && [...micSelect.options].some(o => o.value === prefs.micId)) {
      micSelect.value = prefs.micId;
    }
  } catch { /* ignore */ }
}

// ── Capture target (Window / Screen / Tab) ──
captureSelect.addEventListener('change', () => {
  captureTarget = captureSelect.value as 'screen' | 'window' | 'tab';
});

// ── Nav mode switching ──
function setMode(mode: 'screen' | 'screen-camera') {
  prefs.mode = mode;
  setPrefs({ mode });
  videoBtn.classList.toggle('active', mode === 'screen');
  camBtn.classList.toggle('active', mode === 'screen-camera');
  const row = $('cameraRow');
  const dim = mode === 'screen';
  row.style.opacity = dim ? '0.4' : '1';
  row.style.pointerEvents = dim ? 'none' : 'auto';
}

videoBtn.addEventListener('click', () => { setMode('screen'); showView('idle'); });
camBtn.addEventListener('click', () => { setMode('screen-camera'); showView('idle'); });
homeBtn.addEventListener('click', () => showView('recents'));
closeBtn.addEventListener('click', () => window.close());

// ── Pills ──
cameraToggle.addEventListener('click', () => {
  prefs.cameraOn = !prefs.cameraOn;
  setPill(cameraToggle, prefs.cameraOn);
  setPrefs({ cameraOn: prefs.cameraOn });
  toast(`Camera ${prefs.cameraOn ? 'on' : 'off'}`, 'info');
});
micToggle.addEventListener('click', () => {
  prefs.micOn = !prefs.micOn;
  setPill(micToggle, prefs.micOn);
  setPrefs({ micOn: prefs.micOn });
  if (prefs.micOn) startAudioMeter(); else stopAudioMeter();
  toast(`Microphone ${prefs.micOn ? 'on' : 'off'}`, 'info');
});

// ── Device select changes ──
cameraSelect.addEventListener('change', () => {
  prefs.cameraId = cameraSelect.value;
  setPrefs({ cameraId: prefs.cameraId });
});
micSelect.addEventListener('change', () => {
  prefs.micId = micSelect.value;
  setPrefs({ micId: prefs.micId });
  if (prefs.micOn) {
    stopAudioMeter();
    startAudioMeter();
  }
});

// ── Bottom bar ──
countdownBtn.addEventListener('click', () => {
  prefs.countdownOn = !prefs.countdownOn;
  countdownBtn.dataset.on = String(prefs.countdownOn);
  countdownBtn.querySelector('.bar-dot')?.classList.toggle('on', prefs.countdownOn);
  setPrefs({ countdownOn: prefs.countdownOn });
  toast(`Countdown ${prefs.countdownOn ? 'enabled' : 'disabled'}`, 'info');
});

const qualityCycle: Array<Prefs['quality']> = ['SD', 'HD', '4K'];
hdToggle.addEventListener('click', () => {
  const i = qualityCycle.indexOf(prefs.quality);
  prefs.quality = qualityCycle[(i + 1) % qualityCycle.length];
  setPrefs({ quality: prefs.quality });
  const label = hdToggle.querySelector('span');
  if (label) label.textContent = prefs.quality;
  toast(`Quality: ${prefs.quality}`, 'info');
});

moreBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: prefs.appUrl });
});

// ── Countdown ──
function countdown(done: () => void) {
  let n = 3;
  countdownNum.textContent = '3';
  showView('countdown');
  countdownInterval = setInterval(() => {
    n--;
    if (n <= 0) {
      clearInterval(countdownInterval!);
      countdownInterval = null;
      done();
    } else {
      countdownNum.textContent = String(n);
    }
  }, 1000);
}
cancelCdBtn.addEventListener('click', () => {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  showView('idle');
  toast('Countdown cancelled', 'info');
});

// ── Start recording ──
function go() {
  stopAudioMeter();
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: prefs.mode });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'START_CAPTURE',
        mode: prefs.mode,
        useCamera: prefs.cameraOn && prefs.mode === 'screen-camera',
        useMic: prefs.micOn,
        cameraId: prefs.cameraId,
        micId: prefs.micId,
        quality: prefs.quality,
      });
    }
  });
  recModeBadge.textContent = prefs.mode === 'screen-camera' ? 'Screen + Cam' : 'Screen';
  showView('recording');
  setTimeout(() => window.close(), 200);
}

startBtn.addEventListener('click', () => {
  prefs.countdownOn ? countdown(go) : go();
});

// ── Recording controls ──
pauseBtn.addEventListener('click', () => {
  const paused = recState?.isPaused;
  chrome.runtime.sendMessage({ type: paused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
});
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  toast('Saving recording…', 'ok');
});
cancelRecBtn.addEventListener('click', () => {
  if (confirm('Discard this recording?')) {
    chrome.runtime.sendMessage({ type: 'CANCEL_RECORDING' });
    toast('Recording discarded', 'err');
  }
});

// ── Render recordings ──
let cachedRecs: SavedRecording[] = [];

function renderRecs(list: SavedRecording[]) {
  cachedRecs = list;
  recCount.textContent = String(list.length);
  if (!list.length) {
    recordingsList.innerHTML = '<div class="recents-empty">No recordings yet<br><span style="font-size:11px;opacity:0.7">Start your first recording →</span></div>';
    return;
  }
  recordingsList.innerHTML = list.slice(0, 8).map(r => `
    <div class="rec-item" data-id="${r.id}">
      ${r.thumbnail ? `<img class="rec-thumb" src="${r.thumbnail}" alt="">` : '<div class="rec-thumb"></div>'}
      <div class="rec-info">
        <div class="rec-title">${escapeHtml(r.title)}</div>
        <div class="rec-meta">${fmt(r.duration)} · ${timeAgo(r.createdAt)}</div>
      </div>
      <button class="rec-del" data-del="${r.id}" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>
  `).join('');

  recordingsList.querySelectorAll<HTMLElement>('.rec-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.rec-del')) return;
      const id = el.dataset.id!;
      openRecordingInApp(id);
    });
  });
  recordingsList.querySelectorAll<HTMLButtonElement>('.rec-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.del!;
      await deleteRecording(id);
      cachedRecs = cachedRecs.filter(r => r.id !== id);
      renderRecs(cachedRecs);
      toast('Recording deleted', 'err');
    });
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function openRecordingInApp(id: string) {
  const rec = cachedRecs.find(r => r.id === id);
  if (!rec) return;
  // Find or open the main app tab
  const tabs = await chrome.tabs.query({});
  const appTab = tabs.find(t => t.url && (t.url.startsWith('http://localhost:3000') || t.url.startsWith('http://localhost:3001')));
  if (appTab?.id) {
    await chrome.tabs.update(appTab.id, { active: true });
    chrome.tabs.sendMessage(appTab.id, { type: 'IMPORT_RECORDING_INTO_APP', recording: rec });
  } else {
    // Stash for pickup by content script when app loads
    await chrome.storage.local.set({ pending_import: rec });
    chrome.tabs.create({ url: prefs.appUrl });
  }
  toast('Opening in app…', 'ok');
}

function apply(s: RecordingState) {
  recState = s;
  if (s.isRecording) {
    showView('recording');
    recTimer.textContent = fmt(s.duration);
    pauseBtn.innerHTML = s.isPaused
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><span>Resume</span>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Pause</span>';
  } else if (!countdownInterval) {
    showView('idle');
  }
}

// ── Init ──
(async () => {
  prefs = await getPrefs();

  // Apply prefs to UI
  setPill(cameraToggle, prefs.cameraOn);
  setPill(micToggle, prefs.micOn);
  countdownBtn.dataset.on = String(prefs.countdownOn);
  countdownBtn.querySelector('.bar-dot')?.classList.toggle('on', prefs.countdownOn);
  const hdLabel = hdToggle.querySelector('span');
  if (hdLabel) hdLabel.textContent = prefs.quality;
  setMode(prefs.mode);

  await loadDevices();
  if (prefs.micOn) startAudioMeter();

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (s: RecordingState) => { if (s) apply(s); });
  chrome.runtime.sendMessage({ type: 'GET_RECORDINGS' }, (r: SavedRecording[]) => { if (r) renderRecs(r); });
})();

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'STATE_UPDATE') apply(msg.state);
  if (msg.type === 'RECORDINGS_LIST') renderRecs(msg.recordings);
});
