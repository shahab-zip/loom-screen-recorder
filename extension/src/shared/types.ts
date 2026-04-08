/** Messages between content script <-> background service worker */
export type ExtensionMessage =
  | { type: 'START_RECORDING'; mode: 'screen' | 'screen-camera' }
  | { type: 'STOP_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'RESUME_RECORDING' }
  | { type: 'CANCEL_RECORDING' }
  | { type: 'RECORDING_STARTED'; tabId: number }
  | { type: 'RECORDING_STOPPED'; recording: SavedRecording }
  | { type: 'RECORDING_ERROR'; error: string }
  | { type: 'GET_STATE' }
  | { type: 'STATE_UPDATE'; state: RecordingState }
  | { type: 'GET_RECORDINGS' }
  | { type: 'RECORDINGS_LIST'; recordings: SavedRecording[] };

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  mode: 'screen' | 'screen-camera' | null;
  tabId: number | null;
}

export interface SavedRecording {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  createdAt: string;
  pageUrl: string;
  pageTitle: string;
}

export const DEFAULT_STATE: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  mode: null,
  tabId: null,
};
