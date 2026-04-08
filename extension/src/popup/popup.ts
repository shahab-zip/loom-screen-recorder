import type { RecordingState, SavedRecording } from '../shared/types';

const screenBtn = document.getElementById('screenBtn')!;
const cameraBtn = document.getElementById('cameraBtn')!;
const recordSection = document.getElementById('record-section')!;
const recordingSection = document.getElementById('recording-section')!;
const recTimer = document.getElementById('rec-timer')!;
const recLabel = document.getElementById('rec-label')!;
const pauseBtn = document.getElementById('pauseBtn')!;
const stopBtn = document.getElementById('stopBtn')!;
const recCount = document.getElementById('rec-count')!;
const recordingsList = document.getElementById('recordings-list')!;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function updateUI(state: RecordingState) {
  if (state.isRecording) {
    recordSection.classList.add('hidden');
    recordingSection.classList.remove('hidden');
    recTimer.textContent = formatTime(state.duration);
    recLabel.textContent = state.isPaused ? 'Paused' : 'Recording';
    pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
  } else {
    recordSection.classList.remove('hidden');
    recordingSection.classList.add('hidden');
  }
}

function renderRecordings(recordings: SavedRecording[]) {
  recCount.textContent = String(recordings.length);
  if (recordings.length === 0) {
    recordingsList.innerHTML = '<div class="empty">No recordings yet</div>';
    return;
  }
  recordingsList.innerHTML = recordings.slice(0, 10).map(r => `
    <div class="recording-item" data-id="${r.id}">
      <img class="rec-thumb" src="${r.thumbnail || ''}" alt="" />
      <div class="rec-info">
        <div class="rec-title">${r.title}</div>
        <div class="rec-meta">${r.pageTitle} &middot; ${formatTime(r.duration)}</div>
      </div>
    </div>
  `).join('');
}

screenBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: 'screen' });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CAPTURE', mode: 'screen' });
    }
  });
  window.close();
});

cameraBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: 'screen-camera' });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CAPTURE', mode: 'screen-camera' });
    }
  });
  window.close();
});

pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
});

// Initial state load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state: RecordingState) => {
  if (state) updateUI(state);
});

chrome.runtime.sendMessage({ type: 'GET_RECORDINGS' }, (recordings: SavedRecording[]) => {
  if (recordings) renderRecordings(recordings);
});

// Listen for state updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATE_UPDATE') updateUI(msg.state);
});
