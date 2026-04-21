import type { RecordingState, SavedRecording } from '../shared/types';

export function createWidget() {
  const host = document.createElement('div');
  host.id = 'loom-recorder-widget';
  host.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:2147483647; font-family:system-ui,sans-serif;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .widget {
      background: #1f2937; color: white; border-radius: 16px;
      padding: 12px 16px; display: flex; align-items: center; gap: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4); min-width: 200px;
      user-select: none; cursor: grab; transition: transform 0.2s;
    }
    .widget:hover { transform: scale(1.02); }
    .dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; animation: pulse 1.5s infinite; }
    .dot.paused { background: #f59e0b; animation: none; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .timer { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 48px; }
    .actions { display: flex; gap: 6px; margin-left: auto; }
    .btn {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.1); color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .btn:hover { background: rgba(255,255,255,0.2); }
    .btn.stop { background: #ef4444; }
    .btn.stop:hover { background: #dc2626; }
    .btn svg { width: 16px; height: 16px; }
    .status { font-size: 11px; color: #9ca3af; font-weight: 500; }
  `;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'widget';
  container.innerHTML = `
    <div class="dot" id="dot"></div>
    <div>
      <div class="timer" id="timer">0:00</div>
      <div class="status" id="status">Recording</div>
    </div>
    <div class="actions">
      <button class="btn" id="pauseBtn" title="Pause">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      </button>
      <button class="btn stop" id="stopBtn" title="Stop">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
      </button>
      <button class="btn" id="cancelBtn" title="Discard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
  shadow.appendChild(container);

  const dot = shadow.getElementById('dot')!;
  const timer = shadow.getElementById('timer')!;
  const status = shadow.getElementById('status')!;
  const pauseBtn = shadow.getElementById('pauseBtn')!;
  const stopBtn = shadow.getElementById('stopBtn')!;
  const cancelBtn = shadow.getElementById('cancelBtn')!;

  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;

  pauseBtn.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.pause();
      chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
    } else if (mediaRecorder?.state === 'paused') {
      mediaRecorder.resume();
      chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
    }
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  });

  cancelBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    stream?.getTracks().forEach(t => t.stop());
    chrome.runtime.sendMessage({ type: 'CANCEL_RECORDING' });
  });

  // Drag support
  let isDragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;
  container.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.btn')) return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = host.offsetLeft; origY = host.offsetTop;
    container.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    host.style.left = `${origX + e.clientX - startX}px`;
    host.style.top = `${origY + e.clientY - startY}px`;
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return {
    updateState(s: RecordingState) {
      timer.textContent = formatTime(s.duration);
      dot.className = s.isPaused ? 'dot paused' : 'dot';
      status.textContent = s.isPaused ? 'Paused' : 'Recording';
      pauseBtn.innerHTML = s.isPaused
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    },

    async startCapture(
      mode: 'screen' | 'screen-camera',
      opts: { useMic?: boolean; micId?: string; quality?: 'SD' | 'HD' | '4K' } = {},
    ) {
      try {
        const qualityMap = {
          SD: { width: 1280, height: 720, frameRate: 24, bitsPerSecond: 2_000_000 },
          HD: { width: 1920, height: 1080, frameRate: 30, bitsPerSecond: 5_000_000 },
          '4K': { width: 3840, height: 2160, frameRate: 30, bitsPerSecond: 15_000_000 },
        };
        const q = qualityMap[opts.quality || 'HD'];

        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: q.frameRate, width: q.width, height: q.height },
          audio: true,
        });

        // Mix in mic audio if requested
        if (opts.useMic) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: opts.micId ? { deviceId: { exact: opts.micId } } : true,
            });
            const ac = new AudioContext();
            const dest = ac.createMediaStreamDestination();
            const sysTracks = stream.getAudioTracks();
            if (sysTracks.length) {
              ac.createMediaStreamSource(new MediaStream([sysTracks[0]])).connect(dest);
            }
            ac.createMediaStreamSource(micStream).connect(dest);
            // Replace audio with the mixed track
            sysTracks.forEach(t => stream!.removeTrack(t));
            stream.addTrack(dest.stream.getAudioTracks()[0]);
          } catch { /* mic denied */ }
        }

        chunks = [];
        const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm'].find(
          t => MediaRecorder.isTypeSupported(t)
        ) || '';
        mediaRecorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: q.bitsPerSecond,
        });
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.start(1000);
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
        });
      } catch (err) {
        chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: String(err) });
      }
    },

    async finalizeRecording() {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
      return new Promise<void>((resolve) => {
        mediaRecorder!.onstop = async () => {
          const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || 'video/webm' });
          stream?.getTracks().forEach(t => t.stop());
          const thumbnail = await generateThumbnail(blob);
          const reader = new FileReader();
          reader.onloadend = () => {
            const recording: SavedRecording = {
              id: Date.now().toString(),
              title: `Recording - ${document.title}`,
              url: reader.result as string,
              thumbnail,
              duration: Math.floor(blob.size / 50000),
              createdAt: new Date().toISOString(),
              pageUrl: window.location.href,
              pageTitle: document.title,
            };
            chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED', recording });
            resolve();
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorder!.stop();
      });
    },

    destroy() {
      host.remove();
    },
  };
}

async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(blob);
    video.src = url;
    video.onloadeddata = () => { video.currentTime = 0.1; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 180);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}
