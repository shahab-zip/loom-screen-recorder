import type { SavedRecording } from './types';

const RECORDINGS_KEY = 'loom_recordings';
const MAX_RECORDINGS = 50;

export async function getRecordings(): Promise<SavedRecording[]> {
  const result = await chrome.storage.local.get(RECORDINGS_KEY);
  return result[RECORDINGS_KEY] || [];
}

export async function saveRecording(recording: SavedRecording): Promise<void> {
  const existing = await getRecordings();
  const updated = [recording, ...existing].slice(0, MAX_RECORDINGS);
  await chrome.storage.local.set({ [RECORDINGS_KEY]: updated });
}

export async function deleteRecording(id: string): Promise<void> {
  const existing = await getRecordings();
  const updated = existing.filter(r => r.id !== id);
  await chrome.storage.local.set({ [RECORDINGS_KEY]: updated });
}

export async function clearRecordings(): Promise<void> {
  await chrome.storage.local.remove(RECORDINGS_KEY);
}
