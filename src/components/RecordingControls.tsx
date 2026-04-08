import { Square, Pause, Play, Mic, MicOff, Trash2, PenTool, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface RecordingControlsProps {
  onStop: () => void;
  onCancel?: () => void;
  onPause: () => void;
  isPaused: boolean;
  /** Duration in seconds — driven by parent (useScreenRecorder) */
  duration: number;
  isSaving?: boolean;
  recordingType: 'video' | 'screenshot';
  onToggleAnnotations?: () => void;
  isAnnotating?: boolean;
}

export function RecordingControls({
  onStop,
  onCancel,
  onPause,
  isPaused,
  duration,
  isSaving = false,
  recordingType,
  onToggleAnnotations,
  isAnnotating = false,
}: RecordingControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    if (confirm('Cancel this recording? It will not be saved.')) {
      if (onCancel) {
        onCancel();
      } else {
        onStop();
      }
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl">
        {/* Main Controls */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Recording Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {isPaused ? (
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              <span className="text-white text-sm font-semibold">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
            <div className="text-white text-sm tabular-nums font-medium">
              {formatDuration(duration)}
            </div>
          </div>

          <div className="w-px h-6 bg-gray-700" />

          {/* Control Buttons */}
          <div className="flex items-center gap-1">
            {/* Pause/Resume */}
            <button
              onClick={onPause}
              onMouseEnter={() => setShowTooltip('pause')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`relative group p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105 transform ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isPaused ? 'Resume' : 'Pause'}
              disabled={isSaving}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-white fill-white" />
              ) : (
                <Pause className="w-4 h-4 text-white" />
              )}
              {showTooltip === 'pause' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in">
                  {isPaused ? 'Resume' : 'Pause'} <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">Space</kbd>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </button>

            {/* Mute */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              onMouseEnter={() => setShowTooltip('mute')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`relative group p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105 transform ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
              disabled={isSaving}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4 text-red-400" />
              ) : (
                <Mic className="w-4 h-4 text-white" />
              )}
              {showTooltip === 'mute' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in">
                  {isMuted ? 'Unmute' : 'Mute'} <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">M</kbd>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </button>

            {/* Annotations */}
            {onToggleAnnotations && (
              <button
                onClick={onToggleAnnotations}
                onMouseEnter={() => setShowTooltip('annotate')}
                onMouseLeave={() => setShowTooltip(null)}
                className={`relative group p-2 rounded-lg transition-all duration-200 hover:scale-105 transform ${
                  isAnnotating
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Annotations"
                disabled={isSaving}
              >
                <PenTool className="w-4 h-4" />
                {showTooltip === 'annotate' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                    {isAnnotating ? 'Hide' : 'Show'} annotations <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">D</kbd>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                  </div>
                )}
                {isAnnotating && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-gray-900 animate-pulse" />
                )}
              </button>
            )}

            {/* Cancel (discard) */}
            <button
              onClick={handleCancel}
              onMouseEnter={() => setShowTooltip('cancel')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`relative group p-2 bg-gray-800 hover:bg-red-700 rounded-lg transition-all duration-200 hover:scale-105 transform ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Cancel Recording"
              disabled={isSaving}
            >
              <Trash2 className="w-4 h-4 text-white" />
              {showTooltip === 'cancel' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in">
                  Cancel (discard)
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </button>
          </div>

          <div className="w-px h-6 bg-gray-700" />

          {/* Stop & Save */}
          <button
            onClick={onStop}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-wait rounded-lg transition-all duration-200 hover:scale-105 transform"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Square className="w-4 h-4 text-white fill-white" />
            )}
            <span className="text-white text-sm font-semibold">
              {isSaving ? 'Saving…' : 'Stop'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
