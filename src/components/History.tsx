import { useState, useEffect, memo } from 'react';
import { History as HistoryIcon, Play, Trash2, Clock, Search, Calendar } from 'lucide-react';
import type { Video } from '../App';
import { getStorageItem, setStorageItem } from '../lib/storage';

interface HistoryEntryRaw {
  videoId: string;
  watchedAt: string;
  watchTime: number;
}

interface HistoryEntry {
  videoId: string;
  watchedAt: Date;
  watchTime: number;
}

interface HistoryProps {
  videos: Video[];
  onVideoClick: (video: Video) => void;
  onNewVideo: () => void;
}

export const History = memo(function History({ videos, onVideoClick, onNewVideo }: HistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const raw = getStorageItem<HistoryEntryRaw[]>('watch-history', []);
    setHistory(raw.map(h => ({ ...h, watchedAt: new Date(h.watchedAt) })));
  }, []);

  const saveHistory = (newHistory: HistoryEntry[]) => {
    setHistory(newHistory);
    setStorageItem('watch-history', newHistory);
  };

  const clearHistory = () => {
    if (confirm('Clear all watch history? This cannot be undone.')) {
      saveHistory([]);
    }
  };

  const removeFromHistory = (videoId: string) => {
    saveHistory(history.filter(h => h.videoId !== videoId));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffTime / (1000 * 60));
        return diffMins < 1 ? 'Just now' : `${diffMins} min ago`;
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filterHistoryByDate = (entries: HistoryEntry[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterDate) {
      case 'today':
        return entries.filter(e => e.watchedAt >= today);
      case 'week':
        return entries.filter(e => e.watchedAt >= weekAgo);
      case 'month':
        return entries.filter(e => e.watchedAt >= monthAgo);
      default:
        return entries;
    }
  };

  const groupByDate = (entries: HistoryEntry[]) => {
    const groups: { [key: string]: HistoryEntry[] } = {};
    
    entries.forEach(entry => {
      const date = entry.watchedAt;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      let key: string;
      if (date >= today) {
        key = 'Today';
      } else if (date >= yesterday) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });
    
    return groups;
  };

  const filteredHistory = filterHistoryByDate(
    history
      .filter(h => {
        const video = videos.find(v => v.id === h.videoId);
        return video && video.title.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())
  );

  const groupedHistory = groupByDate(filteredHistory);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-gray-400 mb-2 tracking-widest" style={{ fontWeight: 600 }}>ACTIVITY</div>
            <h1 className="text-5xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>HISTORY</h1>
          </div>
          <div className="flex gap-3">
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm text-red-600"
                style={{ fontWeight: 600 }}
              >
                Clear history
              </button>
            )}
            <button 
              onClick={onNewVideo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-white shadow-lg hover:shadow-xl hover:scale-105 group relative overflow-hidden"
              style={{ fontWeight: 600 }}
            >
              <div className="w-3 h-3 bg-white rounded-full group-hover:animate-heartbeat" />
              <span className="text-sm">New video</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Your recently watched videos • {filteredHistory.length} {filteredHistory.length === 1 ? 'video' : 'videos'}
        </p>
      </header>

      {/* Filters */}
      <div className="border-b border-gray-200 p-6 space-y-4 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'today', 'week', 'month'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setFilterDate(filter)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                filterDate === filter
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'All time' : filter === 'today' ? 'Today' : filter === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <HistoryIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl mb-2 tracking-wider text-gray-900">
              {history.length === 0 ? 'NO HISTORY YET' : 'NO RESULTS'}
            </h2>
            <p className="text-gray-500 mb-6 max-w-md">
              {history.length === 0 
                ? 'Videos you watch will appear here. Start watching to build your history.'
                : 'No videos found matching your search or filter criteria.'
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm text-gray-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedHistory).map(([date, entries]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm tracking-wider text-gray-700">{date.toUpperCase()}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="space-y-3">
                  {entries.map(entry => {
                    const video = videos.find(v => v.id === entry.videoId);
                    if (!video) return null;

                    return (
                      <div
                        key={`${entry.videoId}-${entry.watchedAt.getTime()}`}
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
                                <span>Watched {formatDate(entry.watchedAt)}</span>
                              </div>
                              <span>•</span>
                              <span>{video.views} total views</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onVideoClick(video)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm flex items-center gap-2 text-white"
                              >
                                <Play className="w-3 h-3" />
                                Watch again
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromHistory(video.id)}
                            className="p-2 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity text-red-600"
                            title="Remove from history"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});