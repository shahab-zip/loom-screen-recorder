import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { hydrateVideo, type Video, type VideoRaw, type ViewType, type SortType, type CurrentView } from '../lib/types';

// ── State ──────────────────────────────────────────────

interface AppState {
  currentView: CurrentView;
  currentWorkspaceId: string;
  videos: Video[];
  selectedVideo: Video | null;
  showHomepage: boolean;
  viewType: ViewType;
  sortType: SortType;
  // Recording
  isRecording: boolean;
  showRecordingModal: boolean;
  isPaused: boolean;
  recordingDuration: number;
  recordingType: 'video' | 'screenshot' | null;
  // Annotations
  isAnnotating: boolean;
  annotationTool: string | null;
  annotationColor: string;
  annotationStrokeWidth: number;
}

const initialState: AppState = {
  currentView: 'for-you',
  currentWorkspaceId: 'default',
  videos: [],
  selectedVideo: null,
  showHomepage: false,
  viewType: 'all',
  sortType: 'newest',
  isRecording: false,
  showRecordingModal: false,
  isPaused: false,
  recordingDuration: 0,
  recordingType: null,
  isAnnotating: false,
  annotationTool: null,
  annotationColor: '#EF4444',
  annotationStrokeWidth: 4,
};

// ── Actions ────────────────────────────────────────────

type Action =
  | { type: 'SET_VIEW'; payload: CurrentView }
  | { type: 'SET_WORKSPACE'; payload: string }
  | { type: 'SET_VIDEOS'; payload: Video[] }
  | { type: 'SELECT_VIDEO'; payload: Video | null }
  | { type: 'SET_SHOW_HOMEPAGE'; payload: boolean }
  | { type: 'SET_VIEW_TYPE'; payload: ViewType }
  | { type: 'SET_SORT_TYPE'; payload: SortType }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_SHOW_RECORDING_MODAL'; payload: boolean }
  | { type: 'SET_PAUSED'; payload: boolean }
  | { type: 'SET_RECORDING_DURATION'; payload: number }
  | { type: 'SET_RECORDING_TYPE'; payload: 'video' | 'screenshot' | null }
  | { type: 'SET_ANNOTATING'; payload: boolean }
  | { type: 'SET_ANNOTATION_TOOL'; payload: string | null }
  | { type: 'SET_ANNOTATION_COLOR'; payload: string }
  | { type: 'SET_ANNOTATION_STROKE_WIDTH'; payload: number }
  | { type: 'STOP_RECORDING' };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_WORKSPACE':
      return { ...state, currentWorkspaceId: action.payload };
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'SELECT_VIDEO':
      return { ...state, selectedVideo: action.payload };
    case 'SET_SHOW_HOMEPAGE':
      return { ...state, showHomepage: action.payload };
    case 'SET_VIEW_TYPE':
      return { ...state, viewType: action.payload };
    case 'SET_SORT_TYPE':
      return { ...state, sortType: action.payload };
    case 'SET_RECORDING':
      return { ...state, isRecording: action.payload };
    case 'SET_SHOW_RECORDING_MODAL':
      return { ...state, showRecordingModal: action.payload };
    case 'SET_PAUSED':
      return { ...state, isPaused: action.payload };
    case 'SET_RECORDING_DURATION':
      return { ...state, recordingDuration: action.payload };
    case 'SET_RECORDING_TYPE':
      return { ...state, recordingType: action.payload };
    case 'SET_ANNOTATING':
      return { ...state, isAnnotating: action.payload };
    case 'SET_ANNOTATION_TOOL':
      return { ...state, annotationTool: action.payload };
    case 'SET_ANNOTATION_COLOR':
      return { ...state, annotationColor: action.payload };
    case 'SET_ANNOTATION_STROKE_WIDTH':
      return { ...state, annotationStrokeWidth: action.payload };
    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
        recordingType: null,
        recordingDuration: 0,
        isPaused: false,
        isAnnotating: false,
        annotationTool: null,
      };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers that also persist
  saveVideos: (videos: Video[]) => void;
  handleVideoClick: (video: Video) => void;
  handleDeleteVideo: (id: string) => void;
  handleRenameVideo: (id: string, newTitle: string) => void;
  handleNewVideo: (data: { url: string; duration: number; thumbnail: string }) => void;
  toggleWatchLater: (videoId: string) => void;
  isInWatchLater: (videoId: string) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted data on mount
  useEffect(() => {
    const rawVideos = getStorageItem<VideoRaw[]>('recorded-videos', []);
    const videos = rawVideos.map(hydrateVideo);
    dispatch({ type: 'SET_VIDEOS', payload: videos });

    const savedWorkspace = getStorageItem<string>('current-workspace', 'default');
    dispatch({ type: 'SET_WORKSPACE', payload: savedWorkspace });
  }, []);

  // Persist workspace changes
  useEffect(() => {
    setStorageItem('current-workspace', state.currentWorkspaceId);
  }, [state.currentWorkspaceId]);

  const saveVideos = useCallback((videos: Video[]) => {
    dispatch({ type: 'SET_VIDEOS', payload: videos });
    setStorageItem('recorded-videos', videos);
  }, []);

  const handleVideoClick = useCallback((video: Video) => {
    const updatedVideo = { ...video, views: video.views + 1 };
    dispatch({ type: 'SET_VIDEOS', payload: state.videos.map(v => v.id === video.id ? updatedVideo : v) });
    setStorageItem('recorded-videos', state.videos.map(v => v.id === video.id ? updatedVideo : v));
    dispatch({ type: 'SELECT_VIDEO', payload: updatedVideo });
    // Log to watch history
    const rawHistory = getStorageItem<Array<{ videoId: string; watchedAt: string; watchTime: number }>>('watch-history', []);
    const entry = {
      videoId: video.id,
      watchedAt: new Date().toISOString(),
      watchTime: 0,
    };
    setStorageItem('watch-history', [entry, ...rawHistory].slice(0, 500));
  }, [state.videos]);

  const handleDeleteVideo = useCallback((id: string) => {
    const newVideos = state.videos.filter(v => v.id !== id);
    saveVideos(newVideos);
    if (state.selectedVideo?.id === id) {
      dispatch({ type: 'SELECT_VIDEO', payload: null });
    }
  }, [state.videos, state.selectedVideo, saveVideos]);

  const handleRenameVideo = useCallback((id: string, newTitle: string) => {
    const newVideos = state.videos.map(v => v.id === id ? { ...v, title: newTitle } : v);
    saveVideos(newVideos);
    if (state.selectedVideo?.id === id) {
      dispatch({ type: 'SELECT_VIDEO', payload: { ...state.selectedVideo, title: newTitle } });
    }
  }, [state.videos, state.selectedVideo, saveVideos]);

  const toggleWatchLater = useCallback((videoId: string) => {
    const list = getStorageItem<string[]>('watch-later', []);
    const updated = list.includes(videoId)
      ? list.filter(id => id !== videoId)
      : [...list, videoId];
    setStorageItem('watch-later', updated);
  }, []);

  const isInWatchLater = useCallback((videoId: string) => {
    const list = getStorageItem<string[]>('watch-later', []);
    return list.includes(videoId);
  }, []);

  const handleNewVideo = useCallback((data: { url: string; duration: number; thumbnail: string }) => {
    const newVideo: Video = {
      id: Date.now().toString(),
      title: `Recording ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`,
      thumbnail: data.thumbnail,
      duration: data.duration,
      createdAt: new Date(),
      views: 0,
      url: data.url,
      workspaceId: state.currentWorkspaceId,
    };
    const updated = [newVideo, ...state.videos];
    dispatch({ type: 'SET_VIDEOS', payload: updated });
    setStorageItem('recorded-videos', updated);
    dispatch({ type: 'STOP_RECORDING' });
    dispatch({ type: 'SET_SHOW_RECORDING_MODAL', payload: false });
    // Open VideoPlayer immediately so user sees their recording
    dispatch({ type: 'SELECT_VIDEO', payload: newVideo });
  }, [state.videos, state.currentWorkspaceId]);

  const value: AppContextValue = {
    state,
    dispatch,
    saveVideos,
    handleVideoClick,
    handleDeleteVideo,
    handleRenameVideo,
    handleNewVideo,
    toggleWatchLater,
    isInWatchLater,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
