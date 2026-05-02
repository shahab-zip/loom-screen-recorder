import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, Users, Video, ExternalLink, Copy, Trash2 } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { RequirePermission } from './auth/RequirePermission';

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number;
  participants: number;
  link: string;
  status: 'upcoming' | 'completed';
  recordingId?: string;
}

interface MeetingsProps {
  onNewVideo: () => void;
}

const DEFAULT_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Team Standup',
    date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    duration: 30,
    participants: 5,
    link: 'https://meet.example.com/team-standup',
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Product Demo',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    duration: 60,
    participants: 12,
    link: 'https://meet.example.com/product-demo',
    status: 'upcoming'
  },
  {
    id: '3',
    title: 'Client Presentation',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    duration: 45,
    participants: 8,
    link: 'https://meet.example.com/client-presentation',
    status: 'completed',
    recordingId: 'rec-123'
  }
];

export function Meetings({ onNewVideo }: MeetingsProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = getStorageItem<Meeting[]>('meetings', []);
    const hydrated = saved.map(m => ({ ...m, date: new Date(m.date) }));
    return hydrated.length > 0 ? hydrated : DEFAULT_MEETINGS;
  });

  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: '',
    time: '',
    duration: '30',
    participants: '1'
  });

  const saveMeetings = (updated: Meeting[]) => {
    setMeetings(updated);
    setStorageItem('meetings', updated);
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming').sort((a, b) => a.date.getTime() - b.date.getTime());
  const completedMeetings = meetings.filter(m => m.status === 'completed').sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 24 && diffHours > 0) {
      return `In ${diffHours} hours`;
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays > 1) {
      return `In ${diffDays} days`;
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateMeeting = () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time) {
      alert('Please fill in all required fields');
      return;
    }

    const meetingDate = new Date(`${newMeeting.date}T${newMeeting.time}`);
    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title,
      date: meetingDate,
      duration: parseInt(newMeeting.duration),
      participants: parseInt(newMeeting.participants),
      link: `https://meet.example.com/${Date.now()}`,
      status: 'upcoming'
    };

    saveMeetings([...meetings, meeting]);
    setShowNewMeeting(false);
    setNewMeeting({ title: '', date: '', time: '', duration: '30', participants: '1' });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('Meeting link copied!');
  };

  const handleDeleteMeeting = (id: string) => {
    if (confirm('Delete this meeting?')) {
      saveMeetings(meetings.filter(m => m.id !== id));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs text-gray-400 tracking-widest" style={{ fontWeight: 600 }}>MEETINGS</div>
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded" style={{ fontWeight: 600 }}>NEW</span>
            </div>
            <h1 className="text-5xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>SCHEDULED</h1>
          </div>
          <button 
            onClick={() => setShowNewMeeting(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-white shadow-lg hover:shadow-xl hover:scale-105 group"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm">Schedule meeting</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Manage your scheduled recordings and meetings</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {/* Upcoming Meetings */}
        <div className="mb-8">
          <h2 className="text-xl tracking-wider mb-4 text-gray-900">UPCOMING MEETINGS</h2>
          
          {upcomingMeetings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400 mb-2">No upcoming meetings</p>
              <p className="text-sm text-gray-300">Schedule a meeting to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map(meeting => (
                <div
                  key={meeting.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg mb-2 text-gray-900">{meeting.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(meeting.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(meeting.date)} • {meeting.duration} min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{meeting.participants} participants</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(meeting.link)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600"
                        title="Copy meeting link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(meeting.link, '_blank')}
                        className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600"
                        title="Open meeting"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <RequirePermission permission="video:create">
                        <button
                          onClick={onNewVideo}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2 text-white"
                        >
                          <div className="w-2 h-2 bg-white rounded-full" />
                          <span className="text-sm">Record</span>
                        </button>
                      </RequirePermission>
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors text-red-600"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Meetings */}
        {completedMeetings.length > 0 && (
          <div>
            <h2 className="text-xl tracking-wider mb-4 text-gray-900">PAST MEETINGS</h2>
            <div className="space-y-3">
              {completedMeetings.map(meeting => (
                <div
                  key={meeting.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 opacity-70 hover:opacity-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg mb-2 text-gray-900">{meeting.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{meeting.date.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{meeting.duration} min</span>
                          </div>
                          {meeting.recordingId && (
                            <div className="flex items-center gap-2 text-green-600">
                              <div className="w-2 h-2 bg-green-600 rounded-full" />
                              <span>Recorded</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors text-red-600"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl text-gray-900">Schedule Meeting</h2>
              <button
                onClick={() => setShowNewMeeting(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Meeting Title *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-900 focus:outline-none focus:border-gray-400"
                  placeholder="Team Standup"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Date *</label>
                  <input
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Time *</label>
                  <input
                    type="time"
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Duration (min)</label>
                  <input
                    type="number"
                    value={newMeeting.duration}
                    onChange={(e) => setNewMeeting({ ...newMeeting, duration: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-900 focus:outline-none focus:border-gray-400"
                    min="15"
                    step="15"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Participants</label>
                  <input
                    type="number"
                    value={newMeeting.participants}
                    onChange={(e) => setNewMeeting({ ...newMeeting, participants: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-900 focus:outline-none focus:border-gray-400"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowNewMeeting(false)}
                className="px-4 py-2 hover:bg-gray-100 rounded transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMeeting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-white"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}