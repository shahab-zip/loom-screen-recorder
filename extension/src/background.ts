import type { ExtensionMessage, RecordingState, SavedRecording } from './shared/types';
import { DEFAULT_STATE } from './shared/types';
import { saveRecording, getRecordings } from './shared/storage';

let state: RecordingState = { ...DEFAULT_STATE };
let timerInterval: ReturnType<typeof setInterval> | null = null;

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => {
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(message.mode, sender.tab?.id);
      sendResponse({ ok: true });
      break;

    case 'STOP_RECORDING':
      handleStopRecording();
      sendResponse({ ok: true });
      break;

    case 'PAUSE_RECORDING':
      state.isPaused = true;
      broadcastState();
      sendResponse({ ok: true });
      break;

    case 'RESUME_RECORDING':
      state.isPaused = false;
      broadcastState();
      sendResponse({ ok: true });
      break;

    case 'CANCEL_RECORDING':
      resetState();
      broadcastState();
      sendResponse({ ok: true });
      break;

    case 'GET_STATE':
      sendResponse(state);
      break;

    case 'GET_RECORDINGS':
      getRecordings().then(recordings => sendResponse(recordings));
      return true; // async response

    case 'RECORDING_STOPPED':
      saveRecording(message.recording).then(() => {
        resetState();
        broadcastState();
        // Broadcast updated list to any open popups
        getRecordings().then(recs => {
          chrome.runtime.sendMessage({ type: 'RECORDINGS_LIST', recordings: recs }).catch(() => {});
        });
        // Auto-import into main app if it's open
        chrome.tabs.query({}, (tabs) => {
          const appTab = tabs.find(t => t.url && (
            t.url.startsWith('http://localhost:3000') ||
            t.url.startsWith('http://localhost:3001') ||
            t.url.startsWith('http://127.0.0.1:3000') ||
            t.url.startsWith('http://127.0.0.1:3001')
          ));
          if (appTab?.id) {
            chrome.tabs.sendMessage(appTab.id, {
              type: 'IMPORT_RECORDING_INTO_APP',
              recording: message.recording,
            }).catch(() => {});
          }
        });
        // Notification
        try {
          chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Recording saved',
            message: message.recording.title,
          });
        } catch { /* notifications optional */ }
        sendResponse({ ok: true });
      });
      return true; // async response
  }
});

function handleStartRecording(mode: 'screen' | 'screen-camera', tabId?: number) {
  state = {
    isRecording: true,
    isPaused: false,
    duration: 0,
    mode,
    tabId: tabId || null,
  };
  startTimer();
  broadcastState();
}

function handleStopRecording() {
  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { type: 'FINALIZE_RECORDING' });
  }
  stopTimer();
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (!state.isPaused) {
      state.duration += 1;
      broadcastState();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetState() {
  stopTimer();
  state = { ...DEFAULT_STATE };
}

function broadcastState() {
  const msg: ExtensionMessage = { type: 'STATE_UPDATE', state: { ...state } };
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      }
    });
  });
}

chrome.action.onClicked.addListener((_tab) => {
  // Popup handles this — no action needed
});
