import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { hydrateVideo, type Video, type VideoRaw, type CurrentView } from '../lib/types';
import { putVideoBlob, deleteVideoBlob, resolveVideoUrl, blobFromUrl, getVideoBlob, uploadVideoForSharing } from '../lib/video-storage';
import { upsertVideo } from '../lib/video-repo';
import { supabase } from '../lib/supabase';

// ── State ──────────────────────────────────────────────

interface AppState {
  currentView: CurrentView;
  currentWorkspaceId: string;
  videos: Video[];
  selectedVideo: Video | null;
  showHomepage: boolean;
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
  | { type: 'PATCH_VIDEO'; payload: { id: string; patch: Partial<Video> } }
  | { type: 'SELECT_VIDEO'; payload: Video | null }
  | { type: 'SET_SHOW_HOMEPAGE'; payload: boolean }
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
      // Navigating away from a video player clears the selection so the
      // destination view can render instead of the persistent player overlay.
      return { ...state, currentView: action.payload, selectedVideo: null };
    case 'SET_WORKSPACE':
      return { ...state, currentWorkspaceId: action.payload };
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'PATCH_VIDEO': {
      const { id, patch } = action.payload;
      return {
        ...state,
        videos: state.videos.map(v => v.id === id ? { ...v, ...patch } : v),
        selectedVideo: state.selectedVideo?.id === id
          ? { ...state.selectedVideo, ...patch }
          : state.selectedVideo,
      };
    }
    case 'SELECT_VIDEO':
      return { ...state, selectedVideo: action.payload };
    case 'SET_SHOW_HOMEPAGE':
      return { ...state, showHomepage: action.payload };
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
  /** Upload (or re-upload) a video to public Storage and store the URL on the video. */
  ensurePublicUrl: (videoId: string) => Promise<{ url: string | null; error: string | null }>;
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

    // Rehydrate blob URLs: IndexedDB-backed videos use `idb:<id>` sentinels
    // in storage; turn those into fresh object URLs for this session.
    (async () => {
      const resolved = await Promise.all(
        videos.map(async (v) => {
          if (!v.url.startsWith('idb:')) return v;
          const fresh = await resolveVideoUrl(v.id);
          return fresh ? { ...v, url: fresh } : v;
        }),
      );
      dispatch({ type: 'SET_VIDEOS', payload: resolved });

      // Auto-open a video if the URL has `?v=<id>` (from a shared link).
      const params = new URLSearchParams(window.location.search);
      const sharedId = params.get('v');
      if (sharedId) {
        const target = resolved.find(v => v.id === sharedId);
        if (target) dispatch({ type: 'SELECT_VIDEO', payload: target });
      }
    })();
  }, []);

  // Persist workspace changes
  useEffect(() => {
    setStorageItem('current-workspace', state.currentWorkspaceId);
  }, [state.currentWorkspaceId]);

  // Rewrite any live blob URLs to idb sentinels before persisting, so the
  // URLs survive a reload (object URLs don't).
  const toPersisted = (vs: Video[]): Video[] =>
    vs.map(v => (v.url.startsWith('blob:') ? { ...v, url: `idb:${v.id}` } : v));

  const saveVideos = useCallback((videos: Video[]) => {
    dispatch({ type: 'SET_VIDEOS', payload: videos });
    setStorageItem('recorded-videos', toPersisted(videos));
  }, []);

  const handleVideoClick = useCallback((video: Video) => {
    const updatedVideo = { ...video, views: video.views + 1 };
    const nextVideos = state.videos.map(v => v.id === video.id ? updatedVideo : v);
    dispatch({ type: 'SET_VIDEOS', payload: nextVideos });
    setStorageItem('recorded-videos', toPersisted(nextVideos));
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
    // Also evict the persisted blob so IndexedDB doesn't grow unbounded.
    deleteVideoBlob(id).catch(() => {});
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

  const handleNewVideo = useCallback(async (data: { url: string; duration: number; thumbnail: string }) => {
    const id = Date.now().toString();
    // Capture the current auth user so useVideoPermissions can correctly gate
    // owner-only actions on freshly recorded videos.
    let createdBy: string | undefined;
    try {
      const { data: u } = await supabase.auth.getUser();
      createdBy = u.user?.id;
    } catch {
      // ignore — falls through to undefined; permissions will be conservative
    }
    const newVideo: Video = {
      id,
      title: `Recording ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`,
      thumbnail: data.thumbnail,
      duration: data.duration,
      createdAt: new Date(),
      views: 0,
      url: data.url, // live blob URL for this session
      workspaceId: state.currentWorkspaceId,
      createdBy,
    };
    // Persist the Blob itself so it survives page reload. localStorage holds
    // only a sentinel URL that we swap for a fresh object URL on next load.
    const blob = await blobFromUrl(data.url);
    if (blob) {
      try { await putVideoBlob(id, blob); } catch (err) { console.warn('video persist failed', err); }
    }
    const updated = [newVideo, ...state.videos];
    dispatch({ type: 'SET_VIDEOS', payload: updated });
    // Store sentinel form; live URLs won't survive reload anyway.
    const persisted = updated.map(v => (v.id === id ? { ...v, url: `idb:${id}` } : v));
    setStorageItem('recorded-videos', persisted);
    dispatch({ type: 'STOP_RECORDING' });
    dispatch({ type: 'SET_SHOW_RECORDING_MODAL', payload: false });
    // Open VideoPlayer immediately so user sees their recording
    dispatch({ type: 'SELECT_VIDEO', payload: newVideo });

    // Auto-publish: upload to Supabase Storage + mirror metadata so the
    // /videos/<id> URL is shareable immediately, without the user needing to
    // click Copy first. Runs in the background; failures are non-fatal and
    // ensurePublicUrl will retry on demand.
    if (blob) {
      (async () => {
        try {
          const { url, path, error } = await uploadVideoForSharing(id, blob);
          if (error || !url) {
            console.warn('auto-publish upload failed', error);
            return;
          }
          try {
            const { error: upsertErr } = await upsertVideo({
              id,
              title: newVideo.title,
              duration: newVideo.duration,
              thumbnail: newVideo.thumbnail,
              public_url: url,
              storage_path: path,
              workspace_id: newVideo.workspaceId,
              visibility: 'link',
            });
            if (upsertErr) console.warn('auto-publish metadata upsert failed', upsertErr);
          } catch (err) {
            console.warn('auto-publish metadata upsert threw', err);
          }
          // Patch state + persistence with the publicUrl so subsequent shares
          // skip re-upload. Re-read from localStorage so we don't clobber any
          // newer changes that landed while the upload was in flight.
          dispatch({ type: 'PATCH_VIDEO', payload: { id, patch: { publicUrl: url } } });
          const raw = getStorageItem<VideoRaw[]>('recorded-videos', []);
          const next = raw.map(v => v.id === id ? { ...v, publicUrl: url } : v);
          setStorageItem('recorded-videos', next);
        } catch (err) {
          console.warn('auto-publish threw', err);
        }
      })();
    }
  }, [state.videos, state.currentWorkspaceId]);

  const ensurePublicUrl = useCallback(async (videoId: string) => {
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return { url: null, error: 'video not found' };
    if (video.publicUrl) return { url: video.publicUrl, error: null };

    const blob = await getVideoBlob(videoId);
    if (!blob) return { url: null, error: 'video blob missing locally — cannot share' };

    const { url, path, error } = await uploadVideoForSharing(videoId, blob);
    if (error || !url) return { url: null, error: error?.message ?? 'upload failed' };

    // Mirror metadata to Supabase so other users can resolve the share URL.
    // Failure here doesn't block sharing — the storage upload already succeeded.
    try {
      const { error: upsertErr } = await upsertVideo({
        id: video.id,
        title: video.title,
        duration: video.duration,
        thumbnail: video.thumbnail,
        public_url: url,
        storage_path: path,
        workspace_id: video.workspaceId,
        visibility: video.visibility ?? 'link',
      });
      if (upsertErr) console.warn('video metadata upsert failed', upsertErr);
    } catch (err) {
      console.warn('video metadata upsert threw', err);
    }

    const updated = state.videos.map(v => v.id === videoId ? { ...v, publicUrl: url } : v);
    dispatch({ type: 'SET_VIDEOS', payload: updated });
    setStorageItem('recorded-videos', toPersisted(updated));
    if (state.selectedVideo?.id === videoId) {
      dispatch({ type: 'SELECT_VIDEO', payload: { ...state.selectedVideo, publicUrl: url } });
    }
    return { url, error: null };
  }, [state.videos, state.selectedVideo]);

  const value: AppContextValue = {
    state,
    dispatch,
    saveVideos,
    handleVideoClick,
    handleDeleteVideo,
    handleRenameVideo,
    handleNewVideo,
    ensurePublicUrl,
    toggleWatchLater,
    isInWatchLater,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
