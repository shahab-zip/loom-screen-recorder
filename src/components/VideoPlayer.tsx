import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Download,
  Link2, Share2, MoreHorizontal, Edit2, Trash2, Check, MessageSquare, Eye,
  ChevronRight, Lock, Sparkles, Scissors, Mic, AlignLeft, Settings,
  Clock, Activity, ThumbsUp, RotateCcw, Bell,
  ChevronDown, Bookmark
} from 'lucide-react';
import type { Video } from '../App';
import { resolveVideoUrl } from '../lib/video-storage';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  toggleWatchLater?: (videoId: string) => void;
  isInWatchLater?: (videoId: string) => boolean;
}

type RightTab = 'edit' | 'activity' | 'transcript' | 'settings';

const REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '👍', label: 'Like' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😄', label: 'Haha' },
];

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  time?: number; // video timestamp in seconds
  reactions: Record<string, number>;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    author: 'Alex Rivera',
    avatar: 'AR',
    text: 'Great walkthrough! The part at 0:45 was especially helpful.',
    timestamp: '2 hours ago',
    time: 45,
    reactions: { '👍': 3, '❤️': 1 },
  },
  {
    id: '2',
    author: 'Jordan Kim',
    avatar: 'JK',
    text: 'Could you do a follow-up on the settings panel?',
    timestamp: '1 hour ago',
    reactions: { '👍': 1 },
  },
];

export function VideoPlayer({ video, onClose, onRename, onDelete, toggleWatchLater, isInWatchLater }: VideoPlayerProps) {
  // ── Player state ─────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // If the stored URL is the `idb:<id>` sentinel (reload case), resolve it
  // to a fresh object URL from IndexedDB. Otherwise use the provided URL.
  const [playUrl, setPlayUrl] = useState<string>(() =>
    video.url.startsWith('idb:') ? '' : video.url,
  );
  useEffect(() => {
    let revoked: string | null = null;
    if (video.url.startsWith('idb:')) {
      resolveVideoUrl(video.id).then((u) => {
        if (u) { setPlayUrl(u); revoked = u; }
      });
    } else {
      setPlayUrl(video.url);
    }
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [video.id, video.url]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── UI state ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<RightTab>('edit');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(video.title);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Controls auto-hide ────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

  // ── Player helpers ────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); } else { v.play().catch(() => {}); }
    setIsPlaying(!isPlaying);
    resetControlsTimer();
  }, [isPlaying, resetControlsTimer]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = parseFloat(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  };

  const handleSpeedChange = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const replayVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    setIsPlaying(true);
    resetControlsTimer();
  };

  const skipTime = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = Math.max(0, Math.min(duration, v.currentTime + secs));
    v.currentTime = newTime;
    setCurrentTime(newTime); // Force immediate re-render of progress bar
  };

  // ── Keyboard shortcuts ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft') skipTime(-5);
      if (e.key === 'ArrowRight') skipTime(5);
      if (e.key === 'm') toggleMute();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, onClose]);

  // ── Formatters ────────────────────────────────────────
  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDate = (d: Date) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getTimeAgo = (d: Date) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Reactions ─────────────────────────────────────────
  const handleReaction = (emoji: string) => {
    setReactions(prev => {
      const next = { ...prev };
      if (myReaction === emoji) {
        next[emoji] = Math.max(0, (next[emoji] || 0) - 1);
        setMyReaction(null);
      } else {
        if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 0) - 1);
        next[emoji] = (next[emoji] || 0) + 1;
        setMyReaction(emoji);
      }
      return next;
    });
  };

  // ── Copy link ─────────────────────────────────────────
  // Build a video-specific URL (`?v=<id>`) so the recipient lands directly
  // on this recording when they open the link. NOTE: video blobs live in
  // each browser's IndexedDB, so the link only works for someone who has
  // the same blob locally. Hosted sharing requires uploading the blob to
  // a server (e.g. Supabase Storage) — see `handleShare` below.
  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('v', video.id);
    url.hash = '';
    return url.toString();
  };

  const writeToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    }
    // Fallback for http / older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    const ok = await writeToClipboard(buildShareUrl());
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      window.prompt('Copy link:', buildShareUrl());
    }
  };

  // The big red "Share" button is currently a copy-link shortcut. When hosted
  // sharing lands (Supabase Storage upload), this should open a share modal.
  const handleShare = handleCopyLink;

  // ── Title editing ─────────────────────────────────────
  const saveTitle = () => {
    if (titleValue.trim() && titleValue.trim() !== video.title) {
      onRename(video.id, titleValue.trim());
    } else {
      setTitleValue(video.title);
    }
    setIsEditingTitle(false);
  };

  // ── Comment ───────────────────────────────────────────
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const c: Comment = {
      id: Date.now().toString(),
      author: 'You',
      avatar: 'YO',
      text: newComment.trim(),
      timestamp: 'Just now',
      time: Math.floor(currentTime),
      reactions: {},
    };
    setComments(prev => [...prev, c]);
    setNewComment('');
  };

  // ── Download ──────────────────────────────────────────
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = playUrl || video.url;
    a.download = `${video.title}.webm`;
    a.click();
  };

  // ── Right panel content ───────────────────────────────
  const renderRightPanel = () => {
    switch (activeTab) {
      case 'edit':
        return (
          <div className="p-5 space-y-4">
            {/* AI Banner */}
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold text-gray-900">Loom Business + AI</span>
                </div>
                <button className="text-xs text-violet-600 font-semibold hover:text-violet-700 transition-colors flex items-center gap-1">
                  Upgrade <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Unlock AI-powered editing, transcripts & more</p>
            </div>

            {/* Edit tools */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Edit & Enhance</h3>
              <div className="space-y-2">
                {[
                  { icon: Scissors, label: 'Trim & clip video', desc: 'Cut, split, and rearrange clips', pro: true },
                  { icon: AlignLeft, label: 'Add captions', desc: 'Auto-generated captions', pro: true },
                  { icon: Mic, label: 'Remove silences', desc: 'Automatically remove filler words', pro: true },
                  { icon: Sparkles, label: 'AI title & summary', desc: 'Generate titles and chapters', pro: true },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.label}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group text-left"
                    >
                      <div className="w-9 h-9 bg-gray-100 group-hover:bg-white rounded-lg flex items-center justify-center flex-shrink-0 transition-colors shadow-sm">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{tool.label}</div>
                        <div className="text-xs text-gray-400 truncate">{tool.desc}</div>
                      </div>
                      {tool.pro && <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Download', onClick: handleDownload, icon: Download },
                  { label: 'Share link', onClick: handleCopyLink, icon: Share2 },
                ].map(({ label, onClick, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Details</h3>
              <div className="space-y-2">
                {[
                  { label: 'Duration', value: formatTime(duration) },
                  { label: 'Created', value: formatDate(video.createdAt) },
                  { label: 'Views', value: `${video.views} views` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-xs font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-widest">
                <Activity className="w-3.5 h-3.5" />
                <span>{comments.length} Comments</span>
              </div>

              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No comments yet</p>
                  <p className="text-xs text-gray-300 mt-1">Be the first to comment</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                      {comment.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                        <span className="text-xs text-gray-400">{comment.timestamp}</span>
                        {comment.time !== undefined && (
                          <button
                            onClick={() => {
                              if (videoRef.current) videoRef.current.currentTime = comment.time!;
                              setCurrentTime(comment.time!);
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium bg-red-50 px-1.5 py-0.5 rounded"
                          >
                            {formatTime(comment.time)}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{comment.text}</p>
                      {Object.keys(comment.reactions).length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {Object.entries(comment.reactions).map(([emoji, count]) => (
                            <span key={emoji} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                              {emoji} {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                  YO
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                    placeholder="Add a comment…"
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-400 focus:bg-white transition-colors"
                  />
                </div>
                {newComment.trim() && (
                  <button
                    onClick={handleAddComment}
                    className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 ml-10">
                Commenting at <span className="font-semibold text-gray-600">{formatTime(currentTime)}</span>
              </p>
            </div>
          </div>
        );

      case 'transcript':
        return (
          <div className="p-5">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-widest mb-4">
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Transcript</span>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-5 text-center">
              <Sparkles className="w-8 h-8 text-violet-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-800 mb-1">AI Transcript</p>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Auto-generated searchable transcripts are available on Business plans
              </p>
              <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
                Upgrade to unlock
              </button>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="p-5 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Privacy</h3>
              <div className="space-y-3">
                {[
                  { label: 'Anyone with the link', desc: 'Default sharing', active: true },
                  { label: 'Only me', desc: 'Private — only you can view', active: false },
                  { label: 'Workspace only', desc: 'Everyone in your workspace', active: false },
                ].map(({ label, desc, active }) => (
                  <button key={label} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${active ? 'border-red-300 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-red-600' : 'border-gray-300'}`}>
                      {active && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{label}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Danger Zone</h3>
              <button
                onClick={() => {
                  if (confirm('Permanently delete this recording?')) {
                    onDelete(video.id);
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4" />
                <div>
                  <div className="text-sm font-semibold">Delete recording</div>
                  <div className="text-xs text-red-400">This cannot be undone</div>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in">
      {/* ── Top navigation bar ───────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-sm flex-shrink-0 z-10">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 group"
            title="Back to library"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500 group-hover:text-gray-800 transition-colors" />
            <span className="text-sm font-medium text-gray-500 group-hover:text-gray-800 transition-colors">Back</span>
          </button>

          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                autoFocus
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') { setTitleValue(video.title); setIsEditingTitle(false); }
                }}
                className="text-base font-bold text-gray-900 bg-transparent border-b-2 border-red-500 focus:outline-none w-full max-w-sm"
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 group text-left min-w-0"
                title="Click to rename"
              >
                <h1 className="text-base font-bold text-gray-900 truncate max-w-sm group-hover:text-red-600 transition-colors">
                  {video.title}
                </h1>
                <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                ME
              </div>
              <span>You</span>
              <span>·</span>
              <span>{getTimeAgo(video.createdAt)}</span>
              <span>·</span>
              <Eye className="w-3 h-3" />
              <span>{video.views} {video.views === 1 ? 'view' : 'views'}</span>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {toggleWatchLater && isInWatchLater && (
            <button
              onClick={() => toggleWatchLater(video.id)}
              title={isInWatchLater(video.id) ? 'Remove from Watch Later' : 'Add to Watch Later'}
              className={`p-2 rounded-xl border transition-all ${
                isInWatchLater(video.id)
                  ? 'bg-yellow-100 border-yellow-300 text-yellow-600'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isInWatchLater(video.id) ? 'fill-current' : ''}`} />
            </button>
          )}
          <button
            onClick={handleCopyLink}
            title="Copy link"
            className={`p-2 rounded-xl border transition-all ${linkCopied ? 'bg-green-50 border-green-300 text-green-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            title="Download"
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            title={linkCopied ? 'Link copied!' : 'Copy shareable link'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md font-semibold text-sm text-white ${
              linkCopied ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {linkCopied ? 'Copied!' : 'Share'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-44 py-1">
                  <button
                    onClick={() => { setIsEditingTitle(true); setShowMoreMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" /> Rename
                  </button>
                  <button
                    onClick={() => { handleDownload(); setShowMoreMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <Download className="w-4 h-4 text-gray-400" /> Download
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    onClick={() => {
                      if (confirm('Delete this recording?')) { onDelete(video.id); onClose(); }
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Video + reactions + comments column ───── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-950 min-w-0">

          {/* Video player */}
          <div
            ref={containerRef}
            className="relative flex-1 flex items-center justify-center bg-gray-950 group cursor-pointer overflow-hidden"
            onMouseMove={resetControlsTimer}
            onClick={togglePlay}
          >
            {/* Thumbnail fallback shown when video can't load */}
            {video.thumbnail && (
              <img
                src={video.thumbnail}
                alt="thumbnail"
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
              />
            )}

            <video
              ref={videoRef}
              src={playUrl}
              className="relative max-w-full max-h-full z-10"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={e => {
                  const d = e.currentTarget.duration;
                  // WebM blobs from MediaRecorder often report Infinity — fall back to stored duration
                  setDuration(isFinite(d) && d > 0 ? d : (video.duration || 0));
                }}
              onEnded={handleVideoEnded}
              onClick={e => e.stopPropagation()}
              playsInline
            />

            {/* Big play button overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center z-20" onClick={togglePlay}>
                <div className="w-20 h-20 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-200">
                  <Play className="w-9 h-9 ml-1 text-red-600" />
                </div>
              </div>
            )}

            {/* Replay after end */}
            {!isPlaying && currentTime > 0 && currentTime >= duration - 0.5 && duration > 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); replayVideo(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white text-sm font-semibold hover:bg-white/30 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
              </div>
            )}

            {/* Controls bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div className="px-4 pb-1">
                <div className="relative h-1 group/bar cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  const t = pct * duration;
                  if (videoRef.current) videoRef.current.currentTime = t;
                  setCurrentTime(t);
                }}>
                  <div className="absolute inset-0 bg-white/20 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-red-500 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity"
                    style={{ left: `calc(${progressPct}% - 6px)` }}
                  />
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center gap-1">
                  {/* Play/Pause */}
                  <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {isPlaying
                      ? <Pause className="w-5 h-5 text-white" />
                      : <Play className="w-5 h-5 text-white" />}
                  </button>

                  {/* Skip back */}
                  <button onClick={() => skipTime(-10)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Back 10s">
                    <RotateCcw className="w-4 h-4 text-white" />
                  </button>

                  {/* Volume */}
                  <div
                    className="relative flex items-center gap-1"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      {isMuted || volume === 0
                        ? <VolumeX className="w-5 h-5 text-white" />
                        : <Volume2 className="w-5 h-5 text-white" />}
                    </button>
                    {showVolumeSlider && (
                      <div className="absolute left-8 bottom-1 flex items-center bg-gray-900/90 rounded-lg px-2 py-1.5">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-20 accent-red-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-sm text-white/80 font-medium tabular-nums ml-1">
                    {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Playback speed */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-white/80 text-sm font-semibold transition-colors flex items-center gap-1"
                    >
                      {playbackSpeed}×
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSpeedMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSpeedMenu(false)} />
                        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden z-20 w-28 py-1">
                          {PLAYBACK_SPEEDS.map(s => (
                            <button
                              key={s}
                              onClick={() => handleSpeedChange(s)}
                              className={`w-full px-4 py-2 text-sm text-left transition-colors flex items-center justify-between ${s === playbackSpeed ? 'text-red-400 bg-white/10' : 'text-white/80 hover:bg-white/10'}`}
                            >
                              {s}×
                              {s === playbackSpeed && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Fullscreen */}
                  <button onClick={handleFullscreen} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {isFullscreen
                      ? <Minimize className="w-4 h-4 text-white" />
                      : <Maximize className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Reactions + comment bar ─────────────── */}
          <div className="bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1">
              {REACTIONS.map(({ emoji, label }) => {
                const count = reactions[emoji] || 0;
                const active = myReaction === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    title={label}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm transition-all hover:scale-110 ${
                      active
                        ? 'bg-red-50 border border-red-200 shadow-sm'
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <span className="text-lg leading-none">{emoji}</span>
                    {count > 0 && (
                      <span className={`text-xs font-semibold ${active ? 'text-red-600' : 'text-gray-500'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setActiveTab('activity')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Comment
              {comments.length > 0 && (
                <span className="w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {comments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Right panel ──────────────────────────── */}
        <div className="w-80 flex flex-col border-l border-gray-100 bg-white flex-shrink-0 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {([
              { id: 'edit', label: 'Edit', icon: Scissors },
              { id: 'activity', label: 'Activity', icon: Activity },
              { id: 'transcript', label: 'Transcript', icon: AlignLeft },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as { id: RightTab; label: string; icon: typeof Scissors }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all border-b-2 ${
                  activeTab === id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {renderRightPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
