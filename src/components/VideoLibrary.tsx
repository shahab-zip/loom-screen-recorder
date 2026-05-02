import { useState, memo } from 'react';
import { Search, SlidersHorizontal, Grid3x3, List, MoreVertical, Play, Download, Share2, Trash2, Edit2, Eye, Clock, Filter, X, Plus, Sparkles, Bookmark } from 'lucide-react';
import type { Video, ViewType, SortType } from '../App';
import { MagneticButton } from './MagneticButton';
import { useAppContext } from '../contexts/AppContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useVideoPermissions } from '../hooks/useVideoPermissions';
import { RequirePermission } from './auth/RequirePermission';

function VideoRowActions({
  video,
  onRename,
  onDelete,
}: {
  video: { id: string; createdBy?: string };
  onRename: () => void;
  onDelete: () => void;
}) {
  const { canEdit, canDelete } = useVideoPermissions({ ownerId: video.createdBy });
  return (
    <>
      {canEdit && (
        <button
          aria-label="Rename"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700"
        >
          <Edit2 className="w-4 h-4" />
          Rename
        </button>
      )}
      {canDelete && (
        <button
          aria-label="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-sm text-red-600"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}
    </>
  );
}

interface VideoLibraryProps {
  videos: Video[];
  onVideoClick: (video: Video) => void;
  onNewVideo: () => void;
  onDeleteVideo: (id: string) => void;
  onRenameVideo: (id: string, newTitle: string) => void;
  viewType: ViewType;
  onViewTypeChange: (type: ViewType) => void;
  sortType: SortType;
  onSortTypeChange: (type: SortType) => void;
}

export const VideoLibrary = memo(function VideoLibrary({
  videos, 
  onVideoClick, 
  onNewVideo,
  onDeleteVideo,
  onRenameVideo,
  viewType,
  onViewTypeChange,
  sortType,
  onSortTypeChange
}: VideoLibraryProps) {
  const { toggleWatchLater, isInWatchLater } = useAppContext();
  const { can } = useWorkspace();
  const { state: authState } = useAuth();
  const canCreateVideo = can('video:create');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRename = (video: Video) => {
    setEditingId(video.id);
    setEditValue(video.title);
    setOpenMenuId(null);
  };

  const saveRename = () => {
    if (editingId && editValue.trim()) {
      onRenameVideo(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const canDeleteVideo = (video: Video) =>
    can('video:delete-any') || (can('video:delete-own') && (video as any).createdBy === authState.currentUser?.id);

  const canEditVideo = (video: Video) =>
    can('video:edit-any') || (can('video:edit-own') && (video as any).createdBy === authState.currentUser?.id);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      onDeleteVideo(id);
      setOpenMenuId(null);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter videos based on viewType
  const categoryFilteredVideos = filteredVideos.filter(v => {
    if (viewType === 'clips') return v.duration < 300; // Less than 5 minutes
    if (viewType === 'meetings') return v.duration >= 900; // 15 minutes or more
    if (viewType === 'archive') return false; // Archive not implemented yet
    return true; // Show all videos
  });

  // Sort videos
  const sortedVideos = [...categoryFilteredVideos].sort((a, b) => {
    if (sortType === 'newest') return b.createdAt.getTime() - a.createdAt.getTime();
    if (sortType === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
    return b.views - a.views;
  });
  
  const viewTabs = [
    { id: 'all' as const, label: 'All Videos', count: videos.length },
    { id: 'clips' as const, label: 'Clips', count: videos.filter(v => v.duration < 300).length },
    { id: 'meetings' as const, label: 'Meetings', count: videos.filter(v => v.duration >= 900).length },
    { id: 'archive' as const, label: 'Archive', count: 0 }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white animate-fade-in">
      {/* Header */}
      <header className="border-b border-gray-200 p-6 space-y-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-2 tracking-widest animate-slide-in-left" style={{ fontWeight: 600 }}>WORKSPACE</div>
            <h1 className="text-5xl tracking-tight text-gray-900 animate-slide-in-left" style={{ fontWeight: 700, animationDelay: '0.1s' }}>MY LIBRARY</h1>
          </div>
          <RequirePermission permission="video:create">
            <button
              onClick={onNewVideo}
              disabled={!canCreateVideo}
              className={`px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 flex items-center gap-3 text-white shadow-lg hover:shadow-xl hover:scale-105 transform group ${!canCreateVideo ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
            >
              <div className="w-4 h-4 bg-white rounded-full group-hover:scale-110 transition-transform" />
              <span className="text-sm" style={{ fontWeight: 600 }}>New video</span>
            </button>
          </RequirePermission>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
              showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-all duration-200 ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-all duration-200 ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-slide-up">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600" style={{ fontWeight: 600 }}>Sort by:</span>
              <select
                value={sortType}
                onChange={(e) => onSortTypeChange(e.target.value as SortType)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most-viewed">Most Viewed</option>
              </select>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {viewTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onViewTypeChange(tab.id)}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 hover:scale-105 ${
                viewType === tab.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-sm" style={{ fontWeight: 600 }}>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                viewType === tab.id ? 'bg-red-100 text-red-600 animate-heartbeat-subtle' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {sortedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Play className="w-12 h-12 text-gray-300" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-2xl mb-2 text-gray-900" style={{ fontWeight: 700 }}>No videos found</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Try adjusting your search or filters to find what you're looking for
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-900"
                  style={{ fontWeight: 600 }}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl mb-2 text-gray-900" style={{ fontWeight: 700 }}>No videos yet</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Start recording to see your videos here. It only takes a click to get started.
                </p>
                <RequirePermission permission="video:create">
                  <button
                    onClick={onNewVideo}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all text-white flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transform"
                    style={{ fontWeight: 600 }}
                  >
                    <div className="w-3 h-3 bg-white rounded-full" />
                    <span>Create your first video</span>
                  </button>
                </RequirePermission>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedVideos.map((video, index) => (
              <div
                key={video.id}
                className="group animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div 
                    className="relative bg-gray-100 aspect-video cursor-pointer overflow-hidden"
                    onClick={() => onVideoClick(video)}
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 ml-1 text-red-600" />
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWatchLater(video.id); }}
                      className={`absolute top-3 left-3 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                        isInWatchLater(video.id)
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-black/60 text-gray-300 hover:text-white'
                      }`}
                      title={isInWatchLater(video.id) ? 'Remove from Watch Later' : 'Add to Watch Later'}
                    >
                      <Bookmark className={`w-4 h-4 ${isInWatchLater(video.id) ? 'fill-current' : ''}`} />
                    </button>
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-white flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {editingId === video.id ? (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="w-full px-3 py-2 border-2 border-red-500 rounded-lg focus:outline-none text-sm"
                        />
                      </div>
                    ) : (
                      <h3 className="text-sm mb-3 truncate text-gray-900 group-hover:text-red-600 transition-colors" style={{ fontWeight: 600 }}>
                        {video.title}
                      </h3>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{video.views}</span>
                        </div>
                        <span>{video.createdAt.toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <VideoRowActions
                          video={video}
                          onRename={() => handleRename(video)}
                          onDelete={() => handleDelete(video.id)}
                        />
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === video.id ? null : video.id)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === video.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 animate-scale-in">
                              <button
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700"
                              >
                                <Share2 className="w-4 h-4" />
                                Share
                              </button>
                              <button
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedVideos.map((video, index) => (
              <div
                key={video.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-4 group animate-slide-in-left"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div
                  className="relative w-40 h-24 bg-gray-100 rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
                  onClick={() => onVideoClick(video)}
                >
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 ml-0.5 text-red-600" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white">
                    {formatDuration(video.duration)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === video.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full px-3 py-2 border-2 border-red-500 rounded-lg focus:outline-none"
                    />
                  ) : (
                    <h3 className="text-sm mb-2 truncate text-gray-900 cursor-pointer group-hover:text-red-600 transition-colors" style={{ fontWeight: 600 }}>
                      {video.title}
                    </h3>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{video.views} views</span>
                    </div>
                    <span>•</span>
                    <span>{video.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWatchLater(video.id); }}
                    className={`p-2 rounded-lg transition-colors ${
                      isInWatchLater(video.id)
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'hover:bg-gray-100 text-gray-400'
                    }`}
                    title={isInWatchLater(video.id) ? 'Remove from Watch Later' : 'Add to Watch Later'}
                  >
                    <Bookmark className={`w-5 h-5 ${isInWatchLater(video.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => onVideoClick(video)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                    title="Play"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <VideoRowActions
                    video={video}
                    onRename={() => handleRename(video)}
                    onDelete={() => handleDelete(video.id)}
                  />
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === video.id ? null : video.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {openMenuId === video.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 animate-scale-in">
                        <button className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <button className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});