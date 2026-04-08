import type { RecordingState, SavedRecording } from '../shared/types';

// ── Elements ──
const idleView      = document.getElementById('idle-view')!;
const countdownView = document.getElementById('countdown-view')!;
const recordingView = document.getElementById('recording-view')!;
const startBtn      = document.getElementById('startBtn')!;
const pauseBtn      = document.getElementById('pauseBtn')!;
const stopBtn       = document.getElementById('stopBtn')!;
const cancelRecBtn  = document.getElementById('cancelRecBtn')!;
const cancelCdBtn   = document.getElementById('cancelCountdownBtn')!;
const recTimer      = document.getElementById('rec-timer')!;
const recModeBadge  = document.getElementById('rec-mode-label')!;
const countdownNum  = document.getElementById('countdown-num')!;
const recCount      = document.getElementById('rec-count')!;
const recordingsList = document.getElementById('recordings-list')!;
const cameraSelect  = document.getElementById('cameraSelect') as HTMLSelectElement;
const micSelect     = document.getElementById('micSelect') as HTMLSelectElement;
const cameraToggle  = document.getElementById('cameraToggle') as HTMLInputElement;
const micToggle     = document.getElementById('micToggle') as HTMLInputElement;
const countdownToggle = document.getElementById('countdownToggle') as HTMLInputElement;
const openAppBtn    = document.getElementById('openAppBtn')!;

// ── State ──
let currentMode: 'screen' | 'screen-camera' | 'screenshot' = 'screen';
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let recState: RecordingState | null = null;

// ── Helpers ──
function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function showView(v: 'idle' | 'countdown' | 'recording') {
  idleView.classList.toggle('hidden', v !== 'idle');
  countdownView.classList.toggle('hidden', v !== 'countdown');
  recordingView.classList.toggle('hidden', v !== 'recording');
}

// ── Devices ──
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
  } catch (_) { /* ignore */ }
}

// ── Mode tabs ──
document.querySelectorAll('.mode').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = (btn as HTMLElement).dataset.mode as typeof currentMode;
    const row = document.getElementById('cameraRow')!;
    row.style.opacity = currentMode === 'screen' ? '0.4' : '1';
    row.style.pointerEvents = currentMode === 'screen' ? 'none' : 'auto';
  });
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
});

// ── Start ──
function go() {
  const mode = currentMode === 'screenshot' ? 'screen' : currentMode;
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'START_CAPTURE',
        mode,
        useCamera: cameraToggle.checked && currentMode === 'screen-camera',
        useMic: micToggle.checked,
      });
    }
  });
  recModeBadge.textContent = currentMode === 'screen-camera' ? 'Cam' : 'Screen';
  showView('recording');
  window.close();
}

startBtn.addEventListener('click', () => {
  if (currentMode === 'screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'TAKE_SCREENSHOT' });
    });
    window.close();
    return;
  }
  countdownToggle.checked ? countdown(go) : go();
});

// ── Recording controls ──
pauseBtn.addEventListener('click', () => {
  const paused = recState?.isPaused;
  chrome.runtime.sendMessage({ type: paused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
});
stopBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }));
cancelRecBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'CANCEL_RECORDING' }));
openAppBtn.addEventListener('click', () => chrome.tabs.create({ url: 'http://localhost:3001' }));

// ── Render ──
function renderRecs(list: SavedRecording[]) {
  recCount.textContent = String(list.length);
  if (!list.length) {
    recordingsList.innerHTML = '<p class="empty">No recordings yet</p>';
    return;
  }
  recordingsList.innerHTML = list.slice(0, 6).map(r => `
    <div class="rec-item" data-id="${r.id}">
      ${r.thumbnail ? `<img class="rec-item-thumb" src="${r.thumbnail}" alt="">` : '<div class="rec-item-thumb"></div>'}
      <div class="rec-item-info">
        <div class="rec-item-title">${r.title}</div>
        <div class="rec-item-meta">${fmt(r.duration)}</div>
      </div>
    </div>
  `).join('');
}

function apply(s: RecordingState) {
  recState = s;
  if (s.isRecording) {
    showView('recording');
    recTimer.textContent = fmt(s.duration);
    pauseBtn.innerHTML = s.isPaused
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Resume'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause';
  } else if (!countdownInterval) {
    showView('idle');
  }
}

// ── Init ──
loadDevices();
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (s: RecordingState) => { if (s) apply(s); });
chrome.runtime.sendMessage({ type: 'GET_RECORDINGS' }, (r: SavedRecording[]) => { if (r) renderRecs(r); });
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'STATE_UPDATE') apply(msg.state);
  if (msg.type === 'RECORDINGS_LIST') renderRecs(msg.recordings);
});
