"use strict";
(() => {
  // src/popup/popup.ts
  var idleView = document.getElementById("idle-view");
  var countdownView = document.getElementById("countdown-view");
  var recordingView = document.getElementById("recording-view");
  var startBtn = document.getElementById("startBtn");
  var pauseBtn = document.getElementById("pauseBtn");
  var stopBtn = document.getElementById("stopBtn");
  var cancelRecBtn = document.getElementById("cancelRecBtn");
  var cancelCdBtn = document.getElementById("cancelCountdownBtn");
  var recTimer = document.getElementById("rec-timer");
  var recModeBadge = document.getElementById("rec-mode-label");
  var countdownNum = document.getElementById("countdown-num");
  var recCount = document.getElementById("rec-count");
  var recordingsList = document.getElementById("recordings-list");
  var cameraSelect = document.getElementById("cameraSelect");
  var micSelect = document.getElementById("micSelect");
  var cameraToggle = document.getElementById("cameraToggle");
  var micToggle = document.getElementById("micToggle");
  var countdownToggle = document.getElementById("countdownToggle");
  var openAppBtn = document.getElementById("openAppBtn");
  var currentMode = "screen";
  var currentTarget = "screen";
  var currentQuality = "1080";
  var countdownInterval = null;
  var recState = null;
  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }
  function showView(view) {
    idleView.classList.toggle("hidden", view !== "idle");
    countdownView.classList.toggle("hidden", view !== "countdown");
    recordingView.classList.toggle("hidden", view !== "recording");
  }
  async function enumerateDevices() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {
      });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      const mics = devices.filter((d) => d.kind === "audioinput");
      cameraSelect.innerHTML = '<option value="">No Camera</option>';
      cameras.forEach((cam, i) => {
        const opt = document.createElement("option");
        opt.value = cam.deviceId;
        opt.textContent = cam.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(opt);
      });
      micSelect.innerHTML = '<option value="">No Microphone</option>';
      mics.forEach((mic, i) => {
        const opt = document.createElement("option");
        opt.value = mic.deviceId;
        opt.textContent = mic.label || `Microphone ${i + 1}`;
        micSelect.appendChild(opt);
      });
      if (cameras.length > 0) {
        cameraSelect.value = cameras[0].deviceId;
      }
      if (mics.length > 0) {
        micSelect.value = mics[0].deviceId;
        cameraToggle.checked = false;
      }
    } catch (e) {
    }
  }
  document.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      const cameraRow = document.getElementById("cameraRow");
      cameraRow.style.opacity = currentMode === "screen" ? "0.5" : "1";
      cameraRow.style.pointerEvents = currentMode === "screen" ? "none" : "auto";
    });
  });
  document.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTarget = btn.dataset.target;
    });
  });
  document.querySelectorAll(".q-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".q-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentQuality = btn.dataset.q;
    });
  });
  function startCountdown(onDone) {
    let n = 3;
    countdownNum.textContent = String(n);
    showView("countdown");
    countdownInterval = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        onDone();
      } else {
        countdownNum.textContent = String(n);
      }
    }, 1e3);
  }
  function cancelCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    showView("idle");
  }
  cancelCdBtn.addEventListener("click", cancelCountdown);
  function initiateRecording() {
    const mode = currentMode === "screenshot" ? "screen" : currentMode;
    const msg = {
      type: "START_RECORDING",
      mode,
      quality: currentQuality,
      target: currentTarget,
      useCamera: cameraToggle.checked && currentMode === "screen-camera",
      useMic: micToggle.checked,
      cameraDeviceId: cameraSelect.value,
      micDeviceId: micSelect.value
    };
    chrome.runtime.sendMessage(msg);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "START_CAPTURE", ...msg });
      }
    });
    recModeBadge.textContent = currentMode === "screen-camera" ? "Screen+Cam" : "Screen";
    showView("recording");
    window.close();
  }
  startBtn.addEventListener("click", () => {
    if (currentMode === "screenshot") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id)
          chrome.tabs.sendMessage(tabs[0].id, { type: "TAKE_SCREENSHOT" });
      });
      window.close();
      return;
    }
    if (countdownToggle.checked) {
      startCountdown(initiateRecording);
    } else {
      initiateRecording();
    }
  });
  pauseBtn.addEventListener("click", () => {
    const isPaused = recState?.isPaused;
    chrome.runtime.sendMessage({ type: isPaused ? "RESUME_RECORDING" : "PAUSE_RECORDING" });
    pauseBtn.innerHTML = isPaused ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause' : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Resume';
  });
  stopBtn.addEventListener("click", () => chrome.runtime.sendMessage({ type: "STOP_RECORDING" }));
  cancelRecBtn.addEventListener("click", () => chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" }));
  openAppBtn.addEventListener("click", () => chrome.tabs.create({ url: "http://localhost:3001" }));
  function renderRecordings(recordings) {
    recCount.textContent = String(recordings.length);
    if (!recordings.length) {
      recordingsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        No recordings yet
      </div>`;
      return;
    }
    recordingsList.innerHTML = recordings.slice(0, 8).map((r) => `
    <div class="recording-item" data-id="${r.id}">
      ${r.thumbnail ? `<img class="rec-thumb" src="${r.thumbnail}" alt="">` : '<div class="rec-thumb"></div>'}
      <div class="rec-info">
        <div class="rec-title">${r.title}</div>
        <div class="rec-meta">${r.pageTitle} &middot; ${formatTime(r.duration)}</div>
      </div>
    </div>
  `).join("");
  }
  function applyState(state) {
    recState = state;
    if (state.isRecording) {
      showView("recording");
      recTimer.textContent = formatTime(state.duration);
      pauseBtn.innerHTML = state.isPaused ? '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Resume' : '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause';
    } else if (!countdownInterval) {
      showView("idle");
    }
  }
  enumerateDevices();
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (state)
      applyState(state);
  });
  chrome.runtime.sendMessage({ type: "GET_RECORDINGS" }, (recordings) => {
    if (recordings)
      renderRecordings(recordings);
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATE_UPDATE")
      applyState(msg.state);
    if (msg.type === "RECORDINGS_LIST")
      renderRecordings(msg.recordings);
  });
})();
