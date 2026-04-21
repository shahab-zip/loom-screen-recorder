import { lazy, Suspense, useRef, useCallback, useMemo, useState } from 'react';
import { useAppContext } from './contexts/AppContext';
import { useScreenRecorder } from './hooks/useScreenRecorder';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { AuthGuard } from './components/auth/AuthGuard';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { AnnotationToolbar, type AnnotationTool } from './components/AnnotationToolbar';
import { AnnotationCanvas, type AnnotationCanvasHandle } from './components/AnnotationCanvas';
import type { ViewType, SortType, Video } from './lib/types';

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
  const { state, dispatch, handleVideoClick, handleDeleteVideo, handleRenameVideo, handleNewVideo, toggleWatchLater, isInWatchLater } = useAppContext();
  const annotationCanvasRef = useRef<AnnotationCanvasHandle>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Screen Recorder ──────────────────────────────────
  const recorder = useScreenRecorder();

  const {
    currentView, selectedVideo, showHomepage, showRecordingModal,
    isAnnotating, annotationTool, annotationColor, annotationStrokeWidth,
    videos, viewType, sortType, currentWorkspaceId,
  } = state;

  // Derive recording state from the hook (single source of truth)
  const isRecording = recorder.isRecording;
  const isPaused = recorder.isPaused;
  const recordingDuration = recorder.duration;

  // ── Handlers ─────────────────────────────────────────

  const handleGetStarted = useCallback(() => {
    dispatch({ type: 'SET_SHOW_HOMEPAGE', payload: false });
  }, [dispatch]);

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
  const closeVideo = useCallback(() => dispatch({ type: 'SELECT_VIDEO', payload: null }), [dispatch]);

  const setViewType = useCallback((vt: ViewType) => dispatch({ type: 'SET_VIEW_TYPE', payload: vt }), [dispatch]);
  const setSortType = useCallback((st: SortType) => dispatch({ type: 'SET_SORT_TYPE', payload: st }), [dispatch]);
  const setAnnotationToolCb = useCallback((tool: AnnotationTool) => dispatch({ type: 'SET_ANNOTATION_TOOL', payload: tool }), [dispatch]);
  const setAnnotationColorCb = useCallback((color: string) => dispatch({ type: 'SET_ANNOTATION_COLOR', payload: color }), [dispatch]);
  const setAnnotationStrokeWidthCb = useCallback((width: number) => dispatch({ type: 'SET_ANNOTATION_STROKE_WIDTH', payload: width }), [dispatch]);

  // ── Filtered videos (memoized) ────────────────────────

  const filteredVideos = useMemo(() => {
    return videos
      .filter(v => {
        // Workspace filter — 'default' shows everything
        if (currentWorkspaceId !== 'default' && v.workspaceId !== currentWorkspaceId) return false;
        // View type filter
        if (viewType === 'clips') return v.duration < 300;
        if (viewType === 'meetings') return v.duration >= 900;
        if (viewType === 'archive') return false;
        return true;
      })
      .sort((a, b) => {
        if (sortType === 'newest') return b.createdAt.getTime() - a.createdAt.getTime();
        if (sortType === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
        return b.views - a.views;
      });
  }, [videos, viewType, sortType, currentWorkspaceId]);

  // ── Content router ────────────────────────────────────

  const renderContent = () => {
    // Video player renders INSIDE the main layout so the sidebar stays visible
    if (selectedVideo) {
      return (
        <VideoPlayer
          video={selectedVideo}
          onClose={closeVideo}
          onDelete={handleDeleteVideo}
          onRename={handleRenameVideo}
          toggleWatchLater={toggleWatchLater}
          isInWatchLater={isInWatchLater}
        />
      );
    }

    switch (currentView) {
      case 'for-you':
        return <ForYou videos={filteredVideos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} />;
      case 'library':
        return (
          <VideoLibrary
            videos={filteredVideos}
            onVideoClick={handleVideoClick}
            onNewVideo={openRecordingModal}
            onDeleteVideo={handleDeleteVideo}
            onRenameVideo={handleRenameVideo}
            viewType={viewType}
            onViewTypeChange={setViewType}
            sortType={sortType}
            onSortTypeChange={setSortType}
          />
        );
      case 'meetings':
        return <Meetings onNewVideo={openRecordingModal} />;
      case 'watch-later':
        return <WatchLater videos={videos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} />;
      case 'history':
        return <History videos={videos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} />;
      case 'settings':
        return <Settings onNewVideo={openRecordingModal} />;
      case 'manage':
        return <ManagePage />;
      case 'workspace-settings':
        return <WorkspaceSettingsPage />;
      case 'billing':
        return <BillingPage />;
      case 'spaces':
        return <SpacesPage />;
      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {showHomepage ? (
        <Suspense fallback={<LoadingFallback />}>
          <Homepage onGetStarted={handleGetStarted} />
        </Suspense>
      ) : (
        <>
          <Sidebar
            currentView={currentView}
            onViewChange={(view) => dispatch({ type: 'SET_VIEW', payload: view })}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={(id) => dispatch({ type: 'SET_WORKSPACE', payload: id })}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                {renderContent()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </>
      )}

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
