import type { RecordingState, SavedRecording } from '../shared/types';

// ── Elements ──
const idleView      = document.getElementById('idle-view')!;
const countdownView = document.getElementById('countdown-view')!;
const recordingView = document.getElementById('recording-view')!;
const recentsView   = document.getElementById('recents-view')!;
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
const countdownBtn  = document.getElementById('countdownToggle')!;
const audioBar      = document.getElementById('audioBar')!;
const homeBtn       = document.getElementById('homeBtn')!;
const closeBtn      = document.getElementById('closeBtn')!;

// ── State ──
let currentMode: 'screen' | 'screen-camera' = 'screen';
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let recState: RecordingState | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let micStream: MediaStream | null = null;

// ── Helpers ──
function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function showView(v: 'idle' | 'countdown' | 'recording' | 'recents') {
  idleView.classList.toggle('view-hidden', v !== 'idle');
  countdownView.classList.toggle('view-hidden', v !== 'countdown');
  recordingView.classList.toggle('view-hidden', v !== 'recording');
  recentsView.classList.toggle('view-hidden', v !== 'recents');

  // Update nav active state
  document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active'));
  if (v === 'recents') homeBtn.classList.add('active');
  else if (v === 'idle') document.getElementById(currentMode === 'screen' ? 'videoBtn' : 'camBtn')!.classList.add('active');
}

// ── Pill badge toggle ──
function togglePill(el: HTMLElement) {
  const isOn = el.classList.contains('on');
  el.classList.toggle('on', !isOn);
  el.classList.toggle('off', isOn);
  el.textContent = isOn ? 'Off' : 'On';
}
cameraToggle.addEventListener('click', () => togglePill(cameraToggle));
micToggle.addEventListener('click', () => {
  togglePill(micToggle);
  if (micToggle.classList.contains('on')) startAudioMeter();
  else stopAudioMeter();
});

// ── Bottom bar toggles ──
[countdownBtn, document.getElementById('hdToggle')!].forEach(btn => {
  btn.addEventListener('click', () => {
    const isOn = btn.dataset.on === 'true';
    btn.dataset.on = String(!isOn);
    const dot = btn.querySelector('.bar-dot');
    if (dot) dot.classList.toggle('on', !isOn);
  });
});

// ── Audio level meter ──
function startAudioMeter() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    micStream = stream;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(analyser);
    animateAudio();
  }).catch(() => {});
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
  audioCtx?.close();
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

    // Start audio meter if mic is on
    if (micToggle.classList.contains('on')) startAudioMeter();
  } catch (_) { /* ignore */ }
}

// ── Nav mode switching ──
const videoBtn = document.getElementById('videoBtn')!;
const camBtn = document.getElementById('camBtn')!;

videoBtn.addEventListener('click', () => {
  currentMode = 'screen';
  showView('idle');
  videoBtn.classList.add('active');
  camBtn.classList.remove('active');
  const row = document.getElementById('cameraRow')!;
  row.style.opacity = '0.4';
  row.style.pointerEvents = 'none';
});

camBtn.addEventListener('click', () => {
  currentMode = 'screen-camera';
  showView('idle');
  camBtn.classList.add('active');
  videoBtn.classList.remove('active');
  const row = document.getElementById('cameraRow')!;
  row.style.opacity = '1';
  row.style.pointerEvents = 'auto';
});

homeBtn.addEventListener('click', () => showView('recents'));
closeBtn.addEventListener('click', () => window.close());

// Init camera row dimmed for screen mode
document.getElementById('cameraRow')!.style.opacity = '0.4';
document.getElementById('cameraRow')!.style.pointerEvents = 'none';

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
  stopAudioMeter();
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: currentMode });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'START_CAPTURE',
        mode: currentMode,
        useCamera: cameraToggle.classList.contains('on') && currentMode === 'screen-camera',
        useMic: micToggle.classList.contains('on'),
      });
    }
  });
  recModeBadge.textContent = currentMode === 'screen-camera' ? 'Screen + Cam' : 'Screen';
  showView('recording');
  window.close();
}

startBtn.addEventListener('click', () => {
  countdownBtn.dataset.on === 'true' ? countdown(go) : go();
});

// ── Recording controls ──
pauseBtn.addEventListener('click', () => {
  const paused = recState?.isPaused;
  chrome.runtime.sendMessage({ type: paused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
});
stopBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }));
cancelRecBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'CANCEL_RECORDING' }));

// Open app buttons
document.getElementById('openAppBtn2')?.addEventListener('click', () => chrome.tabs.create({ url: 'http://localhost:3001' }));
document.getElementById('moreBtn')?.addEventListener('click', () => chrome.tabs.create({ url: 'http://localhost:3001' }));

// ── Render recordings ──
function renderRecs(list: SavedRecording[]) {
  recCount.textContent = String(list.length);
  if (!list.length) {
    recordingsList.innerHTML = '<div class="recents-empty">No recordings yet</div>';
    return;
  }
  recordingsList.innerHTML = list.slice(0, 8).map(r => `
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
    pauseBtn.innerHTML = s.isPaused
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><span>Resume</span>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Pause</span>';
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
