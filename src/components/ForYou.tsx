import { memo, useMemo } from 'react';
import { TrendingUp, Clock, Eye, Play, Video as VideoIcon, Zap, Sparkles, Award, Target, Calendar, Activity } from 'lucide-react';
import type { Video } from '../App';

interface ForYouProps {
  videos: Video[];
  onVideoClick: (video: Video) => void;
  onNewVideo: () => void;
}

export const ForYou = memo(function ForYou({ videos, onVideoClick, onNewVideo }: ForYouProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const { totalViews, totalDuration, recentVideos, popularVideos, thisWeekVideos, thisWeekViews } = useMemo(() => {
    const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
    const totalDuration = videos.reduce((acc, v) => acc + v.duration, 0);
    const recentVideos = [...videos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
    const popularVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekVideos = videos.filter(v => v.createdAt > weekAgo);
    const thisWeekViews = thisWeekVideos.reduce((acc, v) => acc + v.views, 0);
    return { totalViews, totalDuration, recentVideos, popularVideos, thisWeekVideos, thisWeekViews };
  }, [videos]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 animate-fade-in">
      {/* Compact Header */}
      <header className="border-b border-gray-200 px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-1 tracking-widest" style={{ fontWeight: 600 }}>DASHBOARD</div>
            <h1 className="text-3xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>FOR YOU</h1>
          </div>
          <button 
            onClick={onNewVideo}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-white shadow-lg hover:shadow-xl hover:scale-105 transform group relative overflow-hidden"
          >
            <div className="w-3 h-3 bg-white rounded-full group-hover:animate-heartbeat transition-transform" />
            <span className="text-sm" style={{ fontWeight: 600 }}>New video</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 transition-all">
                  <VideoIcon className="w-5 h-5 text-red-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl mb-1 text-gray-900" style={{ fontWeight: 700 }}>{videos.length}</div>
              <div className="text-xs text-gray-500">Total Videos</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 transition-all">
                  <Eye className="w-5 h-5 text-red-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl mb-1 text-gray-900" style={{ fontWeight: 700 }}>{totalViews}</div>
              <div className="text-xs text-gray-500">Total Views</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 transition-all">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="text-2xl mb-1 text-gray-900" style={{ fontWeight: 700 }}>{Math.floor(totalDuration / 60)}m</div>
              <div className="text-xs text-gray-500">Total Duration</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 transition-all">
                  <Activity className="w-5 h-5 text-red-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl mb-1 text-gray-900" style={{ fontWeight: 700 }}>{thisWeekVideos.length}</div>
              <div className="text-xs text-gray-500">This Week</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Recent Activity - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm tracking-wider text-gray-900" style={{ fontWeight: 700 }}>RECENT ACTIVITY</h2>
                <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                  View all
                </button>
              </div>

              {recentVideos.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <VideoIcon className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">No videos yet</p>
                  <p className="text-xs text-gray-300 mb-4">Start recording to see your activity</p>
                  <button 
                    onClick={onNewVideo}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-xs text-white inline-flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                    Start Recording
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentVideos.map((video, index) => (
                    <button
                      key={video.id}
                      onClick={() => onVideoClick(video)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 hover:border-red-300 transition-all flex items-center gap-3 text-left group animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="relative w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm mb-1 truncate text-gray-900" style={{ fontWeight: 500 }}>{video.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{video.createdAt.toLocaleDateString()}</span>
                          <span>•</span>
                          <Eye className="w-3 h-3" />
                          <span>{video.views} views</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-4">
              {/* Quick Start */}
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-5 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5" />
                    <h3 className="text-sm tracking-wider" style={{ fontWeight: 700 }}>QUICK START</h3>
                  </div>
                  <p className="text-sm text-red-50 mb-4 leading-relaxed">
                    Record your screen instantly with one click
                  </p>
                  <button 
                    onClick={onNewVideo}
                    className="w-full px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors text-sm text-red-600 flex items-center justify-center gap-2"
                    style={{ fontWeight: 600 }}
                  >
                    <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
                    Start Recording
                  </button>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-red-300 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-red-600" />
                  <h3 className="text-sm tracking-wider text-gray-900" style={{ fontWeight: 700 }}>PRO TIP</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Use keyboard shortcuts for faster workflow. Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd> to pause/resume.
                </p>
              </div>

              {/* Achievement Badge */}
              {videos.length >= 5 && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-sm tracking-wider text-gray-900" style={{ fontWeight: 700 }}>ACHIEVEMENT</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Content Creator! 🎉</p>
                  <p className="text-xs text-gray-600">You've created {videos.length} videos. Keep it up!</p>
                </div>
              )}

              {/* This Week Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-red-600" />
                  <h3 className="text-sm tracking-wider text-gray-900" style={{ fontWeight: 700 }}>THIS WEEK</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Videos Created</span>
                    <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{thisWeekVideos.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total Views</span>
                    <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{thisWeekViews}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Most Viewed - Compact */}
          {popularVideos.length > 0 && (
            <div>
              <h2 className="text-sm tracking-wider text-gray-900 mb-4" style={{ fontWeight: 700 }}>MOST VIEWED</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {popularVideos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => onVideoClick(video)}
                    className="group text-left animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-3 aspect-video hover:ring-2 hover:ring-red-600 transition-all">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-bounce-in">
                          <Play className="w-6 h-6 ml-1 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                    <h3 className="text-sm truncate mb-1 text-gray-900" style={{ fontWeight: 500 }}>{video.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      <span>{video.views} views</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});