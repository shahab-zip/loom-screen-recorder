import { useState } from 'react';
import { 
  User, 
  Video as VideoIcon, 
  Mic, 
  Bell, 
  Keyboard, 
  Lock, 
  Palette, 
  HardDrive,
  Monitor,
  Camera,
  Volume2,
  Download,
  Trash2,
  Check,
  ChevronRight
} from 'lucide-react';

interface SettingsProps {
  onNewVideo: () => void;
}

type SettingsTab = 'profile' | 'recording' | 'audio' | 'notifications' | 'shortcuts' | 'privacy' | 'storage' | 'appearance';

export function Settings({ onNewVideo }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [settings, setSettings] = useState({
    // Profile
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    workspace: 'sparkpixel-team',
    
    // Recording
    videoQuality: '1080p',
    frameRate: '30',
    recordMicrophone: true,
    recordSystemAudio: false,
    cameraPosition: 'bottom-right',
    cameraShape: 'circle',
    countdownTimer: 3,
    showMouseClicks: true,
    highlightClicks: true,
    
    // Audio
    microphoneDevice: 'default',
    microphoneVolume: 80,
    systemAudioVolume: 70,
    echoCancellation: true,
    noiseSuppression: true,
    
    // Notifications
    recordingComplete: true,
    uploadComplete: true,
    comments: true,
    mentions: true,
    emailDigest: 'daily',
    
    // Privacy
    defaultVideoPrivacy: 'private',
    allowDownloads: false,
    showViewersList: true,
    requirePassword: false,
    
    // Storage
    autoDelete: 'never',
    storageLocation: 'cloud',
    maxLocalStorage: 10,
    
    // Appearance
    theme: 'light',
    compactMode: false,
    showThumbnails: true,
    gridView: 'comfortable'
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Save to localStorage
    localStorage.setItem('app-settings', JSON.stringify({ ...settings, [key]: value }));
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'recording' as const, label: 'Recording', icon: VideoIcon },
    { id: 'audio' as const, label: 'Audio', icon: Mic },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'shortcuts' as const, label: 'Shortcuts', icon: Keyboard },
    { id: 'privacy' as const, label: 'Privacy', icon: Lock },
    { id: 'storage' as const, label: 'Storage', icon: HardDrive },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ];

  const clearAllData = () => {
    if (confirm('This will delete all videos and settings. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="text-xs text-gray-400 mb-2 tracking-widest" style={{ fontWeight: 600 }}>PREFERENCES</div>
          <h1 className="text-3xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>SETTINGS</h1>
        </div>
        
        <nav className="p-4 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm" style={{ fontWeight: 600 }}>{tab.label}</span>
                <ChevronRight className={`w-4 h-4 ml-auto transition-opacity ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>PROFILE</h2>
                <p className="text-sm text-gray-500">Manage your account information</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl" style={{ fontWeight: 700 }}>
                    JD
                  </div>
                  <div className="flex-1">
                    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm text-gray-700" style={{ fontWeight: 600 }}>
                      Change avatar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text"
                    value={settings.userName}
                    onChange={(e) => updateSetting('userName', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    value={settings.userEmail}
                    onChange={(e) => updateSetting('userEmail', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>Workspace</label>
                  <input
                    type="text"
                    value={settings.workspace}
                    onChange={(e) => updateSetting('workspace', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button className="text-sm text-red-600 hover:text-red-700 transition-colors" style={{ fontWeight: 600 }}>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recording Settings */}
          {activeTab === 'recording' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>RECORDING</h2>
                <p className="text-sm text-gray-500">Configure your recording preferences</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Video Quality</label>
                  <div className="grid grid-cols-4 gap-3">
                    {['720p', '1080p', '1440p', '4K'].map(quality => (
                      <button
                        key={quality}
                        onClick={() => updateSetting('videoQuality', quality)}
                        className={`px-4 py-2.5 rounded border-2 transition-all text-sm ${
                          settings.videoQuality === quality
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                        style={{ fontWeight: 600 }}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Frame Rate</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['24', '30', '60'].map(fps => (
                      <button
                        key={fps}
                        onClick={() => updateSetting('frameRate', fps)}
                        className={`px-4 py-2.5 rounded border-2 transition-all text-sm ${
                          settings.frameRate === fps
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                        style={{ fontWeight: 600 }}
                      >
                        {fps} FPS
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Record System Audio</div>
                        <div className="text-xs text-gray-500">Capture sounds from your computer</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('recordSystemAudio', !settings.recordSystemAudio)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.recordSystemAudio ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.recordSystemAudio ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Record Microphone</div>
                        <div className="text-xs text-gray-500">Enable audio from your microphone</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('recordMicrophone', !settings.recordMicrophone)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.recordMicrophone ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.recordMicrophone ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 text-gray-600">👆</div>
                      <div>
                        <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Show Mouse Clicks</div>
                        <div className="text-xs text-gray-500">Highlight cursor clicks in recordings</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('showMouseClicks', !settings.showMouseClicks)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.showMouseClicks ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.showMouseClicks ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Camera Position</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'bottom-right', label: 'Bottom Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'top-left', label: 'Top Left' }
                    ].map(pos => (
                      <button
                        key={pos.value}
                        onClick={() => updateSetting('cameraPosition', pos.value)}
                        className={`px-4 py-2.5 rounded border-2 transition-all text-sm ${
                          settings.cameraPosition === pos.value
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                        style={{ fontWeight: 600 }}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>
                    Countdown Timer: {settings.countdownTimer}s
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={settings.countdownTimer}
                    onChange={(e) => updateSetting('countdownTimer', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>No countdown</span>
                    <span>10 seconds</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Settings */}
          {activeTab === 'audio' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>AUDIO</h2>
                <p className="text-sm text-gray-500">Configure audio input and output</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Microphone Device</label>
                  <select
                    value={settings.microphoneDevice}
                    onChange={(e) => updateSetting('microphoneDevice', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400 cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <option value="default">Default Microphone</option>
                    <option value="built-in">Built-in Microphone</option>
                    <option value="external">External Microphone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>
                    Microphone Volume: {settings.microphoneVolume}%
                  </label>
                  <div className="flex items-center gap-4">
                    <Mic className="w-5 h-5 text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.microphoneVolume}
                      onChange={(e) => updateSetting('microphoneVolume', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600"
                    />
                    <Volume2 className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>
                    System Audio Volume: {settings.systemAudioVolume}%
                  </label>
                  <div className="flex items-center gap-4">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.systemAudioVolume}
                      onChange={(e) => updateSetting('systemAudioVolume', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600"
                    />
                    <Volume2 className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Echo Cancellation</div>
                      <div className="text-xs text-gray-500">Reduce echo and feedback</div>
                    </div>
                    <button
                      onClick={() => updateSetting('echoCancellation', !settings.echoCancellation)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.echoCancellation ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.echoCancellation ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Noise Suppression</div>
                      <div className="text-xs text-gray-500">Filter out background noise</div>
                    </div>
                    <button
                      onClick={() => updateSetting('noiseSuppression', !settings.noiseSuppression)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.noiseSuppression ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.noiseSuppression ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex gap-3">
                    <div className="text-lg">💡</div>
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Audio Tip</div>
                      <div className="text-xs text-gray-600">For best audio quality, use a dedicated microphone and record in a quiet environment.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>NOTIFICATIONS</h2>
                <p className="text-sm text-gray-500">Manage how you receive notifications</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-gray-600 mb-4" style={{ fontWeight: 600 }}>DESKTOP NOTIFICATIONS</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'recordingComplete', label: 'Recording Complete', desc: 'When a recording finishes' },
                      { key: 'uploadComplete', label: 'Upload Complete', desc: 'When a video finishes uploading' },
                      { key: 'comments', label: 'New Comments', desc: 'When someone comments on your video' },
                      { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you' }
                    ].map(notif => (
                      <div key={notif.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>{notif.label}</div>
                          <div className="text-xs text-gray-500">{notif.desc}</div>
                        </div>
                        <button
                          onClick={() => updateSetting(notif.key, !settings[notif.key as keyof typeof settings])}
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            settings[notif.key as keyof typeof settings] ? 'bg-red-600' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings[notif.key as keyof typeof settings] ? 'right-1' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Email Digest</label>
                  <select
                    value={settings.emailDigest}
                    onChange={(e) => updateSetting('emailDigest', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400 cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <option value="never">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts */}
          {activeTab === 'shortcuts' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>SHORTCUTS</h2>
                <p className="text-sm text-gray-500">Keyboard shortcuts for quick actions</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-gray-600 mb-4" style={{ fontWeight: 600 }}>RECORDING</h3>
                  <div className="space-y-2">
                    {[
                      { action: 'Start Recording', keys: ['Ctrl', 'Shift', 'R'] },
                      { action: 'Stop Recording', keys: ['Ctrl', 'Shift', 'S'] },
                      { action: 'Pause/Resume', keys: ['Ctrl', 'Shift', 'P'] },
                      { action: 'Cancel Recording', keys: ['Esc'] }
                    ].map(shortcut => (
                      <div key={shortcut.action} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{shortcut.action}</span>
                        <div className="flex gap-2">
                          {shortcut.keys.map((key, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700" style={{ fontWeight: 600 }}>
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-600 mb-4" style={{ fontWeight: 600 }}>PLAYBACK</h3>
                  <div className="space-y-2">
                    {[
                      { action: 'Play/Pause', keys: ['Space'] },
                      { action: 'Seek Forward', keys: ['→'] },
                      { action: 'Seek Backward', keys: ['←'] },
                      { action: 'Volume Up', keys: ['↑'] },
                      { action: 'Volume Down', keys: ['↓'] },
                      { action: 'Fullscreen', keys: ['F'] },
                      { action: 'Mute', keys: ['M'] }
                    ].map(shortcut => (
                      <div key={shortcut.action} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{shortcut.action}</span>
                        <div className="flex gap-2">
                          {shortcut.keys.map((key, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700" style={{ fontWeight: 600 }}>
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-600 mb-4" style={{ fontWeight: 600 }}>NAVIGATION</h3>
                  <div className="space-y-2">
                    {[
                      { action: 'Open Library', keys: ['Ctrl', 'L'] },
                      { action: 'Search Videos', keys: ['Ctrl', 'K'] },
                      { action: 'Open Settings', keys: ['Ctrl', ','] }
                    ].map(shortcut => (
                      <div key={shortcut.action} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{shortcut.action}</span>
                        <div className="flex gap-2">
                          {shortcut.keys.map((key, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700" style={{ fontWeight: 600 }}>
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>PRIVACY</h2>
                <p className="text-sm text-gray-500">Control who can see and interact with your videos</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Default Video Privacy</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'public', label: 'Public', icon: '🌐' },
                      { value: 'unlisted', label: 'Unlisted', icon: '🔗' },
                      { value: 'private', label: 'Private', icon: '🔒' }
                    ].map(privacy => (
                      <button
                        key={privacy.value}
                        onClick={() => updateSetting('defaultVideoPrivacy', privacy.value)}
                        className={`px-4 py-3 rounded border-2 transition-all text-sm ${
                          settings.defaultVideoPrivacy === privacy.value
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{privacy.icon}</div>
                        <div style={{ fontWeight: 600 }}>{privacy.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Allow Downloads</div>
                      <div className="text-xs text-gray-500">Let viewers download your videos</div>
                    </div>
                    <button
                      onClick={() => updateSetting('allowDownloads', !settings.allowDownloads)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.allowDownloads ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.allowDownloads ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Show Viewers List</div>
                      <div className="text-xs text-gray-500">Display who has watched your videos</div>
                    </div>
                    <button
                      onClick={() => updateSetting('showViewersList', !settings.showViewersList)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.showViewersList ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.showViewersList ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Require Password</div>
                      <div className="text-xs text-gray-500">Viewers need password to watch</div>
                    </div>
                    <button
                      onClick={() => updateSetting('requirePassword', !settings.requirePassword)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.requirePassword ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.requirePassword ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Storage Settings */}
          {activeTab === 'storage' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>STORAGE</h2>
                <p className="text-sm text-gray-500">Manage your video storage and cache</p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-red-50 to-transparent border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Storage Used</div>
                      <div className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>2.4 GB</div>
                    </div>
                    <HardDrive className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-red-600 rounded-full" style={{ width: '24%' }} />
                  </div>
                  <div className="text-xs text-gray-500">2.4 GB of 10 GB used</div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Storage Location</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'cloud', label: 'Cloud Storage', icon: '☁️' },
                      { value: 'local', label: 'Local Storage', icon: '💾' }
                    ].map(storage => (
                      <button
                        key={storage.value}
                        onClick={() => updateSetting('storageLocation', storage.value)}
                        className={`px-4 py-3 rounded border-2 transition-all text-sm ${
                          settings.storageLocation === storage.value
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{storage.icon}</div>
                        <div style={{ fontWeight: 600 }}>{storage.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Auto-Delete After</label>
                  <select
                    value={settings.autoDelete}
                    onChange={(e) => updateSetting('autoDelete', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400 cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <option value="never">Never</option>
                    <option value="7days">7 Days</option>
                    <option value="30days">30 Days</option>
                    <option value="90days">90 Days</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-between text-gray-700">
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5" />
                      <span className="text-sm" style={{ fontWeight: 600 }}>Export All Videos</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-between text-gray-700">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5" />
                      <span className="text-sm" style={{ fontWeight: 600 }}>Clear Cache</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={clearAllData}
                    className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors flex items-center justify-between text-red-600"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5" />
                      <span className="text-sm" style={{ fontWeight: 600 }}>Delete All Data</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontWeight: 700 }}>APPEARANCE</h2>
                <p className="text-sm text-gray-500">Customize the look and feel</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'dark', label: 'Dark', icon: '🌙' }
                    ].map(theme => (
                      <button
                        key={theme.value}
                        onClick={() => updateSetting('theme', theme.value)}
                        className={`px-4 py-3 rounded border-2 transition-all text-sm ${
                          settings.theme === theme.value
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{theme.icon}</div>
                        <div style={{ fontWeight: 600 }}>{theme.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>Grid View</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'compact', label: 'Compact' },
                      { value: 'comfortable', label: 'Comfortable' },
                      { value: 'spacious', label: 'Spacious' }
                    ].map(view => (
                      <button
                        key={view.value}
                        onClick={() => updateSetting('gridView', view.value)}
                        className={`px-4 py-2.5 rounded border-2 transition-all text-sm ${
                          settings.gridView === view.value
                            ? 'border-red-600 bg-red-50 text-red-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                        style={{ fontWeight: 600 }}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Compact Mode</div>
                      <div className="text-xs text-gray-500">Reduce spacing and padding</div>
                    </div>
                    <button
                      onClick={() => updateSetting('compactMode', !settings.compactMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.compactMode ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.compactMode ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Show Thumbnails</div>
                      <div className="text-xs text-gray-500">Display video preview thumbnails</div>
                    </div>
                    <button
                      onClick={() => updateSetting('showThumbnails', !settings.showThumbnails)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        settings.showThumbnails ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.showThumbnails ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-white">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>Version 1.0.0</div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>All changes saved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
