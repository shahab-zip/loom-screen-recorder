"use strict";
(() => {
  // src/popup/popup.ts
  var screenBtn = document.getElementById("screenBtn");
  var cameraBtn = document.getElementById("cameraBtn");
  var recordSection = document.getElementById("record-section");
  var recordingSection = document.getElementById("recording-section");
  var recTimer = document.getElementById("rec-timer");
  var recLabel = document.getElementById("rec-label");
  var pauseBtn = document.getElementById("pauseBtn");
  var stopBtn = document.getElementById("stopBtn");
  var recCount = document.getElementById("rec-count");
  var recordingsList = document.getElementById("recordings-list");
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }
  function updateUI(state) {
    if (state.isRecording) {
      recordSection.classList.add("hidden");
      recordingSection.classList.remove("hidden");
      recTimer.textContent = formatTime(state.duration);
      recLabel.textContent = state.isPaused ? "Paused" : "Recording";
      pauseBtn.textContent = state.isPaused ? "Resume" : "Pause";
    } else {
      recordSection.classList.remove("hidden");
      recordingSection.classList.add("hidden");
    }
  }
  function renderRecordings(recordings) {
    recCount.textContent = String(recordings.length);
    if (recordings.length === 0) {
      recordingsList.innerHTML = '<div class="empty">No recordings yet</div>';
      return;
    }
    recordingsList.innerHTML = recordings.slice(0, 10).map((r) => `
    <div class="recording-item" data-id="${r.id}">
      <img class="rec-thumb" src="${r.thumbnail || ""}" alt="" />
      <div class="rec-info">
        <div class="rec-title">${r.title}</div>
        <div class="rec-meta">${r.pageTitle} &middot; ${formatTime(r.duration)}</div>
      </div>
    </div>
  `).join("");
  }
  screenBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "START_RECORDING", mode: "screen" });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "START_CAPTURE", mode: "screen" });
      }
    });
    window.close();
  });
  cameraBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "START_RECORDING", mode: "screen-camera" });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "START_CAPTURE", mode: "screen-camera" });
      }
    });
    window.close();
  });
  pauseBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" });
  });
  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
  });
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (state)
      updateUI(state);
  });
  chrome.runtime.sendMessage({ type: "GET_RECORDINGS" }, (recordings) => {
    if (recordings)
      renderRecordings(recordings);
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATE_UPDATE")
      updateUI(msg.state);
  });
})();
