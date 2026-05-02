import { useState, useEffect, memo } from 'react';
import { Bookmark, Play, MoreVertical, Trash2, Clock } from 'lucide-react';
import type { Video } from '../App';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { RequirePermission } from './auth/RequirePermission';

interface WatchLaterProps {
  videos: Video[];
  onVideoClick: (video: Video) => void;
  onNewVideo: () => void;
}

export const WatchLater = memo(function WatchLater({ videos, onVideoClick, onNewVideo }: WatchLaterProps) {
  const [watchLaterIds, setWatchLaterIds] = useState<Set<string>>(new Set());
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    const saved = getStorageItem<string[]>('watch-later', []);
    setWatchLaterIds(new Set(saved));
  }, []);

  const saveWatchLater = (ids: Set<string>) => {
    setWatchLaterIds(ids);
    setStorageItem('watch-later', Array.from(ids));
  };

  const toggleWatchLater = (videoId: string) => {
    const newIds = new Set(watchLaterIds);
    if (newIds.has(videoId)) {
      newIds.delete(videoId);
    } else {
      newIds.add(videoId);
    }
    saveWatchLater(newIds);
  };

  const removeFromWatchLater = (videoId: string) => {
    const newIds = new Set(watchLaterIds);
    newIds.delete(videoId);
    saveWatchLater(newIds);
    setShowMenu(null);
  };

  const watchLaterVideos = videos.filter(v => watchLaterIds.has(v.id));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-gray-400 mb-2 tracking-widest" style={{ fontWeight: 600 }}>SAVED</div>
            <h1 className="text-5xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>WATCH LATER</h1>
          </div>
          <RequirePermission permission="video:create">
            <button
              onClick={onNewVideo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-white shadow-lg hover:shadow-xl hover:scale-105 group relative overflow-hidden"
              style={{ fontWeight: 600 }}
            >
              <div className="w-3 h-3 bg-white rounded-full group-hover:animate-heartbeat" />
              <span className="text-sm">New video</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </RequirePermission>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Videos you've saved to watch later • {watchLaterVideos.length} saved
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {watchLaterVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Bookmark className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl mb-2 tracking-wider text-gray-900">NO SAVED VIDEOS</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Videos you save for later will appear here. Start saving videos to build your watch list.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  💡
                </div>
                <div>
                  <div className="text-sm text-gray-900 mb-1">Pro Tip</div>
                  <div className="text-xs text-gray-500">
                    Hover over any video in your library and click the bookmark icon to add it to Watch Later
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {watchLaterVideos.map(video => (
              <div
                key={video.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => onVideoClick(video)}
                    className="relative w-48 h-28 bg-gray-100 rounded overflow-hidden flex-shrink-0 group/thumb"
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 ml-1 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                      {formatDuration(video.duration)}
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg mb-2 truncate text-gray-900">{video.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                      <span>•</span>
                      <span>{video.views} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onVideoClick(video)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm flex items-center gap-2 text-white"
                      >
                        <Play className="w-3 h-3" />
                        Watch now
                      </button>
                      <button
                        onClick={() => removeFromWatchLater(video.id)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm flex items-center gap-2 text-gray-700"
                      >
                        <Bookmark className="w-3 h-3 fill-red-600 text-red-600" />
                        Saved
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === video.id ? null : video.id)}
                      className="p-2 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    {showMenu === video.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[180px]">
                          <button
                            onClick={() => removeFromWatchLater(video.id)}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove from list
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      {watchLaterVideos.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              Total duration: {Math.floor(watchLaterVideos.reduce((acc, v) => acc + v.duration, 0) / 60)} minutes
            </div>
            <button className="text-red-600 hover:text-red-700 transition-colors">
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
});