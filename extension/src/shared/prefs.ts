export interface Prefs {
  mode: 'screen' | 'screen-camera';
  cameraId: string;
  micId: string;
  cameraOn: boolean;
  micOn: boolean;
  countdownOn: boolean;
  quality: 'HD' | 'SD' | '4K';
  appUrl: string;
}

const KEY = 'loom_prefs';

export const DEFAULT_PREFS: Prefs = {
  mode: 'screen',
  cameraId: '',
  micId: '',
  cameraOn: false,
  micOn: true,
  countdownOn: true,
  quality: 'HD',
  appUrl: 'http://localhost:3000',
};

export async function getPrefs(): Promise<Prefs> {
  const r = await chrome.storage.local.get(KEY);
  return { ...DEFAULT_PREFS, ...(r[KEY] || {}) };
}

export async function setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const current = await getPrefs();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}
