import { lazy, Suspense, useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from './contexts/AppContext';
import { useScreenRecorder } from './hooks/useScreenRecorder';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { AuthGuard } from './components/auth/AuthGuard';
import { RouteGuard } from './components/auth/RouteGuard';
import { RequireSuperAdmin } from './components/auth/RequireSuperAdmin';
import { AcceptInvitePage } from './components/auth/AcceptInvitePage';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { AnnotationToolbar, type AnnotationTool } from './components/AnnotationToolbar';
import { AnnotationCanvas, type AnnotationCanvasHandle } from './components/AnnotationCanvas';
import type { ViewType, SortType, Video } from './lib/types';
import { fetchVideoById, incrementVideoViews } from './lib/video-repo';

// Lazy-load route-level components for code splitting
const Homepage = lazy(() => import('./components/Homepage').then(m => ({ default: m.Homepage })));
const VideoLibrary = lazy(() => import('./components/VideoLibrary').then(m => ({ default: m.VideoLibrary })));
const VideoPlayer = lazy(() => import('./components/VideoPlayer').then(m => ({ default: m.VideoPlayer })));
const ForYou = lazy(() => import('./components/ForYou').then(m => ({ default: m.ForYou })));
const Meetings = lazy(() => import('./components/Meetings').then(m => ({ default: m.Meetings })));
const WatchLater = lazy(() => import('./components/WatchLater').then(m => ({ default: m.WatchLater })));
const History = lazy(() => import('./components/History').then(m => ({ default: m.History })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const RecordingModal = lazy(() => import('./components/RecordingModal').then(m => ({ default: m.RecordingModal })));
const RecordingControls = lazy(() => import('./components/RecordingControls').then(m => ({ default: m.RecordingControls })));
const CameraBubble = lazy(() => import('./components/CameraBubble').then(m => ({ default: m.CameraBubble })));
const ManagePage = lazy(() => import('./components/ManagePage').then(m => ({ default: m.ManagePage })));
const WorkspaceSettingsPage = lazy(() => import('./components/WorkspaceSettingsPage').then(m => ({ default: m.WorkspaceSettingsPage })));
const BillingPage = lazy(() => import('./components/BillingPage').then(m => ({ default: m.BillingPage })));
const SpacesPage = lazy(() => import('./components/SpacesPage').then(m => ({ default: m.SpacesPage })));
const SuperAdminPanel = lazy(() => import('./components/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })));

// Re-export types for backward compatibility
export type { ViewType, SortType, Video };

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { state, dispatch, handleDeleteVideo, handleRenameVideo, handleNewVideo, toggleWatchLater, isInWatchLater } = useAppContext();
  const annotationCanvasRef = useRef<AnnotationCanvasHandle>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // ── Screen Recorder ──────────────────────────────────
  const recorder = useScreenRecorder();

  const {
    showHomepage, showRecordingModal,
    isAnnotating, annotationTool, annotationColor, annotationStrokeWidth,
    videos, currentWorkspaceId,
  } = state;

  // Derive recording state from the hook (single source of truth)
  const isRecording = recorder.isRecording;
  const isPaused = recorder.isPaused;
  const recordingDuration = recorder.duration;

  // Navigate to a video's URL — used wherever the old context's handleVideoClick was used.
  const onVideoClick = useCallback((v: Video) => {
    navigate(`/videos/${v.id}`);
  }, [navigate]);

  // ── Legacy ?invite=TOKEN redirect to /invite/:token ───
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      navigate(`/invite/${token}`, { replace: true });
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-collapse sidebar ──────────────────────────────
  // Collapse to icon-only when previewing a video so the player gets full width.
  // Also collapse the moment recording stops so the user lands in a focused state.
  const wasRecordingRef = useRef(false);
  useEffect(() => {
    if (location.pathname.startsWith('/videos/')) setSidebarCollapsed(true);
  }, [location.pathname]);
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      setSidebarCollapsed(true);
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording]);

  // ── Handlers ─────────────────────────────────────────

  const handleGetStarted = useCallback(() => {
    dispatch({ type: 'SET_SHOW_HOMEPAGE', payload: false });
    navigate('/for-you');
  }, [dispatch, navigate]);

  /** Called from RecordingModal when the user picks a mode and confirms */
  const handleStartRecording = useCallback(async (
    _type: 'video' | 'screenshot',
    mode: 'screen' | 'screen-camera' = 'screen',
  ) => {
    dispatch({ type: 'SET_SHOW_RECORDING_MODAL', payload: false });
    const started = await recorder.startRecording(mode);
    if (!started) {
      console.warn('Recording start failed');
    }
  }, [dispatch, recorder]);

  /** Stop → finalize blob → save → open VideoPlayer */
  const handleStopRecording = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await recorder.stopRecording();
      if (result) {
        handleNewVideo(result); // saves + selects the new video
      } else {
        dispatch({ type: 'STOP_RECORDING' });
      }
    } finally {
      setIsSaving(false);
    }
  }, [recorder, handleNewVideo, dispatch, isSaving]);

  /** Cancel recording without saving */
  const handleCancelRecording = useCallback(() => {
    recorder.cancelRecording();
    dispatch({ type: 'STOP_RECORDING' });
  }, [recorder, dispatch]);

  const handleTogglePause = useCallback(() => {
    if (isPaused) {
      recorder.resumeRecording();
    } else {
      recorder.pauseRecording();
    }
  }, [isPaused, recorder]);

  const handleToggleAnnotations = useCallback(() => {
    const next = !isAnnotating;
    dispatch({ type: 'SET_ANNOTATING', payload: next });
    dispatch({ type: 'SET_ANNOTATION_TOOL', payload: next ? 'pen' : null });
  }, [isAnnotating, dispatch]);

  const handleAnnotationUndo = useCallback(() => annotationCanvasRef.current?.undo(), []);
  const handleAnnotationRedo = useCallback(() => annotationCanvasRef.current?.redo(), []);
  const handleAnnotationClear = useCallback(() => {
    if (confirm('Clear all annotations?')) annotationCanvasRef.current?.clearAll();
  }, []);
  const handleHistoryChange = useCallback((undo: boolean, redo: boolean) => {
    setCanUndo(undo);
    setCanRedo(redo);
  }, []);

  const openRecordingModal = useCallback(() => dispatch({ type: 'SET_SHOW_RECORDING_MODAL', payload: true }), [dispatch]);
  const closeRecordingModal = useCallback(() => dispatch({ type: 'SET_SHOW_RECORDING_MODAL', payload: false }), [dispatch]);

  const closeVideo = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/library');
  }, [navigate]);

  const setAnnotationToolCb = useCallback((tool: AnnotationTool) => dispatch({ type: 'SET_ANNOTATION_TOOL', payload: tool }), [dispatch]);
  const setAnnotationColorCb = useCallback((color: string) => dispatch({ type: 'SET_ANNOTATION_COLOR', payload: color }), [dispatch]);
  const setAnnotationStrokeWidthCb = useCallback((width: number) => dispatch({ type: 'SET_ANNOTATION_STROKE_WIDTH', payload: width }), [dispatch]);

  // ── Filtered videos (memoized) ────────────────────────

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      // Workspace filter — 'default' shows everything
      if (currentWorkspaceId !== 'default' && v.workspaceId !== currentWorkspaceId) return false;
      return true;
    });
  }, [videos, currentWorkspaceId]);

  // ── Route components (inline wrappers) ────────────────

  const VideoPlayerRoute = () => {
    const { videoId } = useParams<{ videoId: string }>();
    const localVideo = videos.find(v => v.id === videoId);
    const [remoteVideo, setRemoteVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState<boolean>(!localVideo);
    const [notFound, setNotFound] = useState<boolean>(false);
    const viewBumpedRef = useRef<string | null>(null);

    // If the video isn't in local state, fetch it from Supabase.
    useEffect(() => {
      if (!videoId || localVideo) return;
      let cancelled = false;
      setLoading(true);
      setNotFound(false);
      fetchVideoById(videoId)
        .then(v => {
          if (cancelled) return;
          if (v) setRemoteVideo(v);
          else setNotFound(true);
        })
        .catch(() => { if (!cancelled) setNotFound(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [videoId, localVideo]);

    const video = localVideo ?? remoteVideo;

    // Bump view counter once per (route, video) combination.
    useEffect(() => {
      if (!video || viewBumpedRef.current === video.id) return;
      viewBumpedRef.current = video.id;
      incrementVideoViews(video.id).catch(() => {});
    }, [video]);

    if (!localVideo && loading) return <LoadingFallback />;
    if (!video) {
      if (notFound) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Video not found</h2>
            <p className="text-sm text-gray-500 max-w-md">
              This video may have been deleted, or the link may be incorrect.
            </p>
          </div>
        );
      }
      return <LoadingFallback />;
    }
    return (
      <VideoPlayer
        video={video}
        onClose={closeVideo}
        onDelete={handleDeleteVideo}
        onRename={handleRenameVideo}
        toggleWatchLater={toggleWatchLater}
        isInWatchLater={isInWatchLater}
      />
    );
  };

  const AcceptInviteRoute = () => {
    const { token } = useParams<{ token: string }>();
    return (
      <AcceptInvitePage
        token={token!}
        onDone={() => navigate('/for-you', { replace: true })}
      />
    );
  };

  // Show marketing landing only on "/" when showHomepage is true
  if (showHomepage && location.pathname === '/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Homepage onGetStarted={handleGetStarted} />
      </Suspense>
    );
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceChange={(id) => dispatch({ type: 'SET_WORKSPACE', payload: id })}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/for-you" replace />} />
              <Route
                path="/for-you"
                element={
                  <RouteGuard permission="video:view">
                    <ForYou videos={filteredVideos} onVideoClick={onVideoClick} onNewVideo={openRecordingModal} />
                  </RouteGuard>
                }
              />
              <Route
                path="/library"
                element={
                  <RouteGuard permission="video:view">
                    <VideoLibrary
                      videos={filteredVideos}
                      onVideoClick={onVideoClick}
                      onNewVideo={openRecordingModal}
                      onDeleteVideo={handleDeleteVideo}
                      onRenameVideo={handleRenameVideo}
                    />
                  </RouteGuard>
                }
              />
              <Route path="/videos/:videoId" element={<VideoPlayerRoute />} />
              <Route
                path="/meetings"
                element={
                  <RouteGuard permission="video:view">
                    <Meetings onNewVideo={openRecordingModal} />
                  </RouteGuard>
                }
              />
              <Route
                path="/watch-later"
                element={
                  <RouteGuard permission="video:view">
                    <WatchLater videos={videos} onVideoClick={onVideoClick} onNewVideo={openRecordingModal} />
                  </RouteGuard>
                }
              />
              <Route
                path="/history"
                element={
                  <RouteGuard permission="video:view">
                    <History videos={videos} onVideoClick={onVideoClick} onNewVideo={openRecordingModal} />
                  </RouteGuard>
                }
              />
              <Route path="/settings" element={<Settings onNewVideo={openRecordingModal} />} />
              <Route
                path="/workspace/members"
                element={
                  <RouteGuard permission="member:view">
                    <ManagePage />
                  </RouteGuard>
                }
              />
              <Route
                path="/workspace/settings"
                element={
                  <RouteGuard permission="workspace:view-settings">
                    <WorkspaceSettingsPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/workspace/billing"
                element={
                  <RouteGuard permission="workspace:view-billing">
                    <BillingPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/spaces"
                element={
                  <RouteGuard permission="space:create">
                    <SpacesPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireSuperAdmin fallback={<div className="p-8 text-gray-600">You don't have access to this page.</div>}>
                    <SuperAdminPanel />
                  </RequireSuperAdmin>
                }
              />
              <Route path="/invite/:token" element={<AcceptInviteRoute />} />
              <Route path="*" element={<Navigate to="/for-you" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Recording Modal */}
      {showRecordingModal && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <RecordingModal
              onClose={closeRecordingModal}
              onStartRecording={handleStartRecording}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Camera PiP bubble (screen + camera mode) */}
      {isRecording && recorder.cameraStream && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <CameraBubble stream={recorder.cameraStream} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Recording Controls + Annotation overlay */}
      {isRecording && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <RecordingControls
              onStop={handleStopRecording}
              onCancel={handleCancelRecording}
              onPause={handleTogglePause}
              isPaused={isPaused}
              duration={recordingDuration}
              isSaving={isSaving}
              recordingType="video"
              onToggleAnnotations={handleToggleAnnotations}
              isAnnotating={isAnnotating}
            />

            {isAnnotating && annotationTool && (
              <>
                <AnnotationToolbar
                  isOpen={isAnnotating}
                  onClose={() => dispatch({ type: 'SET_ANNOTATING', payload: false })}
                  activeTool={annotationTool as AnnotationTool}
                  onToolChange={setAnnotationToolCb}
                  color={annotationColor}
                  onColorChange={setAnnotationColorCb}
                  strokeWidth={annotationStrokeWidth}
                  onStrokeWidthChange={setAnnotationStrokeWidthCb}
                  onUndo={handleAnnotationUndo}
                  onRedo={handleAnnotationRedo}
                  onClear={handleAnnotationClear}
                  canUndo={canUndo}
                  canRedo={canRedo}
                />
                <AnnotationCanvas
                  ref={annotationCanvasRef}
                  isActive={isAnnotating}
                  tool={annotationTool as AnnotationTool}
                  color={annotationColor}
                  strokeWidth={annotationStrokeWidth}
                  onHistoryChange={handleHistoryChange}
                />
              </>
            )}
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Saving overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 border-4 border-white/20 border-t-red-500 rounded-full animate-spin" />
          <p className="text-white text-lg font-semibold">Saving your recording…</p>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </AuthGuard>
  );
}
