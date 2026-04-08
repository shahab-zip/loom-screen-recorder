import { useState } from 'react';
import { X, Monitor, Video, Camera, Info, Check, AlertCircle } from 'lucide-react';

interface RecordingModalProps {
  onClose: () => void;
  onStartRecording: (type: 'video' | 'screenshot', mode: 'screen' | 'screen-camera') => void;
}

export function RecordingModal({ onClose, onStartRecording }: RecordingModalProps) {
  const [selectedMode, setSelectedMode] = useState<'screen' | 'screen-camera' | null>(null);
  const [showPermissionTip, setShowPermissionTip] = useState(false);

  const modes = [
    {
      id: 'screen' as const,
      title: 'Screen Only',
      description: 'Record your screen without camera',
      icon: Monitor,
      features: ['Full screen capture', 'System audio', 'Mouse tracking'],
      color: 'blue'
    },
    {
      id: 'screen-camera' as const,
      title: 'Screen + Camera',
      description: 'Record screen with camera bubble',
      icon: Video,
      features: ['Screen + webcam', 'Picture-in-picture', 'Full audio'],
      color: 'purple'
    }
  ];

  const handleStart = () => {
    if (!selectedMode) return;

    // Show permission tip briefly, then hand off
    setShowPermissionTip(true);
    setTimeout(() => {
      onStartRecording('video', selectedMode);
    }, 1500);
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl w-full max-w-2xl shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>
                START RECORDING
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose your recording mode to begin</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:rotate-90 group"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Mode Selection - Compact */}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 group hover:scale-[1.02] ${
                      isSelected
                        ? 'border-red-500 bg-red-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                    }`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center animate-scale-in">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                      isSelected 
                        ? 'bg-red-600 scale-110' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>

                    {/* Title */}
                    <h3 className={`text-base mb-1.5 transition-colors ${
                      isSelected ? 'text-red-600' : 'text-gray-900'
                    }`} style={{ fontWeight: 700 }}>
                      {mode.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mb-3">
                      {mode.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-1.5">
                      {mode.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                          <div className={`w-1 h-1 rounded-full ${
                            isSelected ? 'bg-red-600' : 'bg-gray-400'
                          }`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Compact Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-900" style={{ fontWeight: 600 }}>
                  Browser Permission Required
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  You'll be prompted to allow screen recording. Make sure to select the correct window or screen to share.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleStart}
                disabled={!selectedMode}
                className={`flex-1 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2.5 ${
                  selectedMode
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transform'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  selectedMode ? 'bg-white animate-pulse' : 'bg-gray-300'
                }`} />
                <span className="text-sm" style={{ fontWeight: 700 }}>
                  {selectedMode ? 'Start Recording' : 'Select a mode to continue'}
                </span>
              </button>
              
              <button
                onClick={onClose}
                className="px-5 py-3 border-2 border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-50 text-sm"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>

            {/* Keyboard Shortcut Hint */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>Press</span>
              <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs" style={{ fontWeight: 600 }}>
                Esc
              </kbd>
              <span>to cancel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Tip Overlay */}
      {showPermissionTip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-sm text-center animate-scale-in">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg mb-2 text-gray-900" style={{ fontWeight: 700 }}>
              Allow Screen Recording
            </h3>
            <p className="text-sm text-gray-600">
              Please select your screen or window in the browser permission dialog
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}