import { createWidget } from './widget/widget';
import type { SavedRecording } from './shared/types';

let widget: ReturnType<typeof createWidget> | null = null;

const APP_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];
const isMainApp = APP_ORIGINS.some(o => window.location.origin === o);

// ── Main-app injection helpers ─────────────────────────
interface AppVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  createdAt: string;
  views: number;
  url: string;
  workspaceId: string;
}

function addRecordingToAppLocalStorage(rec: SavedRecording) {
  const KEY = 'recorded-videos';
  let list: AppVideo[] = [];
  try { list = JSON.parse(window.localStorage.getItem(KEY) || '[]'); } catch {}
  // Dedupe by id
  if (list.some(v => v.id === rec.id)) return;
  const video: AppVideo = {
    id: rec.id,
    title: rec.title || 'Screen Recording',
    thumbnail: rec.thumbnail,
    duration: rec.duration,
    createdAt: rec.createdAt,
    views: 0,
    url: rec.url,
    workspaceId: 'default',
  };
  list.unshift(video);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  // Show a native banner so user knows it arrived
  showAppBanner(`"${video.title}" imported from extension`);
  // Reload the app so it picks up new data
  setTimeout(() => window.dispatchEvent(new Event('storage')), 50);
}

function showAppBanner(text: string) {
  const b = document.createElement('div');
  b.textContent = text;
  b.style.cssText =
    'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#dc2626;color:#fff;padding:12px 20px;border-radius:999px;' +
    'font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:14px;' +
    'box-shadow:0 10px 30px rgba(220,38,38,0.35);z-index:2147483647;' +
    'opacity:0;transition:opacity .25s,transform .25s;';
  document.body.appendChild(b);
  requestAnimationFrame(() => { b.style.opacity = '1'; });
  setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 300); }, 3200);
}

// If on main app, check for pending import (from popup opening this tab)
if (isMainApp) {
  chrome.storage.local.get('pending_import').then((r) => {
    const rec = (r as { pending_import?: SavedRecording }).pending_import;
    if (rec) {
      addRecordingToAppLocalStorage(rec);
      chrome.storage.local.remove('pending_import');
    }
  });
}

// ── Message listener ───────────────────────────────────
chrome.runtime.onMessage.addListener((message: Record<string, unknown>) => {
  if (message.type === 'STATE_UPDATE' && 'state' in message) {
    const state = message.state as import('./shared/types').RecordingState;
    if (!widget && state.isRecording) {
      widget = createWidget();
    }
    widget?.updateState(state);
    if (!state.isRecording && widget) {
      widget.destroy();
      widget = null;
    }
  } else if (message.type === 'FINALIZE_RECORDING') {
    widget?.finalizeRecording();
  } else if (message.type === 'START_CAPTURE' && 'mode' in message) {
    if (!widget) widget = createWidget();
    widget.startCapture(message.mode as 'screen' | 'screen-camera', {
      useMic: message.useMic as boolean,
      micId: message.micId as string,
      quality: message.quality as 'SD' | 'HD' | '4K',
    });
  } else if (message.type === 'IMPORT_RECORDING_INTO_APP' && isMainApp) {
    addRecordingToAppLocalStorage(message.recording as SavedRecording);
  }
});

// Request initial state on load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
  if (state?.isRecording) {
    widget = createWidget();
    widget.updateState(state);
  }
});
