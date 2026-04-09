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
const cameraToggle  = document.getElementById('cameraToggle')!;
const micToggle     = document.getElementById('micToggle')!;
const countdownToggle = document.getElementById('countdownToggle')!;
const openAppBtn    = document.getElementById('openAppBtn')!;

// ── State ──
let currentMode: 'screen' | 'screen-camera' = 'screen';
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let recState: RecordingState | null = null;

// ── Helpers ──
function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function showView(v: 'idle' | 'countdown' | 'recording') {
  idleView.classList.toggle('view-hidden', v !== 'idle');
  countdownView.classList.toggle('view-hidden', v !== 'countdown');
  recordingView.classList.toggle('view-hidden', v !== 'recording');
}

function isOn(el: HTMLElement): boolean {
  return el.dataset.on === 'true';
}

function toggleEl(el: HTMLElement) {
  const next = !isOn(el);
  el.dataset.on = String(next);
  el.classList.toggle('on', next);
  el.classList.toggle('off', !next);
}

// ── Toggle buttons ──
[cameraToggle, micToggle, countdownToggle, document.getElementById('hdToggle')!].forEach(btn => {
  btn.addEventListener('click', () => toggleEl(btn));
});

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
  } catch (_) { /* ignore */ }
}

// ── Mode cards ──
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    currentMode = (card as HTMLElement).dataset.mode as typeof currentMode;

    // Dim camera row when screen-only
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

// ── Start recording ──
function go() {
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: currentMode });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'START_CAPTURE',
        mode: currentMode,
        useCamera: isOn(cameraToggle) && currentMode === 'screen-camera',
        useMic: isOn(micToggle),
      });
    }
  });
  recModeBadge.textContent = currentMode === 'screen-camera' ? 'Screen + Cam' : 'Screen';
  showView('recording');
  window.close();
}

startBtn.addEventListener('click', () => {
  isOn(countdownToggle) ? countdown(go) : go();
});

// ── Recording controls ──
pauseBtn.addEventListener('click', () => {
  const paused = recState?.isPaused;
  chrome.runtime.sendMessage({ type: paused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
});
stopBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }));
cancelRecBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'CANCEL_RECORDING' }));
openAppBtn.addEventListener('click', () => chrome.tabs.create({ url: 'http://localhost:3001' }));

// ── Render recordings ──
function renderRecs(list: SavedRecording[]) {
  recCount.textContent = String(list.length);
  if (!list.length) {
    recordingsList.innerHTML = '<div class="recents-empty">No recordings yet</div>';
    return;
  }
  recordingsList.innerHTML = list.slice(0, 5).map(r => `
    <div class="rec-item" data-id="${r.id}">
      ${r.thumbnail ? `<img class="rec-thumb" src="${r.thumbnail}" alt="">` : '<div class="rec-thumb"></div>'}
      <div class="rec-info">
        <div class="rec-title">${r.title}</div>
        <div class="rec-meta">${fmt(r.duration)}</div>
      </div>
    </div>
  `).join('');
}

function apply(s: RecordingState) {
  recState = s;
  if (s.isRecording) {
    showView('recording');
    recTimer.textContent = fmt(s.duration);
    const pauseIcon = s.isPaused
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><span>Resume</span>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Pause</span>';
    pauseBtn.innerHTML = pauseIcon;
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
