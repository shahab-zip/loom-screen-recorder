// src/shared/types.ts
var DEFAULT_STATE = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  mode: null,
  tabId: null
};

// src/shared/storage.ts
var RECORDINGS_KEY = "loom_recordings";
var MAX_RECORDINGS = 50;
async function getRecordings() {
  const result = await chrome.storage.local.get(RECORDINGS_KEY);
  return result[RECORDINGS_KEY] || [];
}
async function saveRecording(recording) {
  const existing = await getRecordings();
  const updated = [recording, ...existing].slice(0, MAX_RECORDINGS);
  await chrome.storage.local.set({ [RECORDINGS_KEY]: updated });
}

// src/background.ts
var state = { ...DEFAULT_STATE };
var timerInterval = null;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "START_RECORDING":
      handleStartRecording(message.mode, sender.tab?.id);
      sendResponse({ ok: true });
      break;
    case "STOP_RECORDING":
      handleStopRecording();
      sendResponse({ ok: true });
      break;
    case "PAUSE_RECORDING":
      state.isPaused = true;
      broadcastState();
      sendResponse({ ok: true });
      break;
    case "RESUME_RECORDING":
      state.isPaused = false;
      broadcastState();
      sendResponse({ ok: true });
      break;
    case "CANCEL_RECORDING":
      resetState();
      broadcastState();
      sendResponse({ ok: true });
      break;
    case "GET_STATE":
      sendResponse(state);
      break;
    case "GET_RECORDINGS":
      getRecordings().then((recordings) => sendResponse(recordings));
      return true;
    case "RECORDING_STOPPED":
      saveRecording(message.recording).then(() => {
        resetState();
        broadcastState();
        sendResponse({ ok: true });
      });
      return true;
  }
});
function handleStartRecording(mode, tabId) {
  state = {
    isRecording: true,
    isPaused: false,
    duration: 0,
    mode,
    tabId: tabId || null
  };
  startTimer();
  broadcastState();
}
function handleStopRecording() {
  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { type: "FINALIZE_RECORDING" });
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
  }, 1e3);
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
  const msg = { type: "STATE_UPDATE", state: { ...state } };
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {
        });
      }
    });
  });
}
chrome.action.onClicked.addListener((_tab) => {
});
