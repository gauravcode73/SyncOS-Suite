'use client';
import React, { useState } from 'react';
import { Video, Plus, Calendar, Clock, Users, CheckCircle, X, Search, Wand2, ChevronRight, FileText, Zap, Copy, Link as LinkIcon } from 'lucide-react';
import { getDb, saveDb, getCurrentUser, MeetingRoom, MeetingActionItem, addAuditLog, createNotification } from '@/lib/database/mockDb';

const AI_SUMMARIES = [
  "The team aligned on Q3 priorities and sprint goals. Key decisions include migrating to the new authentication system by end of month and onboarding two new developers next week. Three action items were created and assigned.",
  "Product roadmap review meeting concluded with stakeholder sign-off on the new feature set. Design team to deliver mockups within 5 days. Engineering estimates shared and approved. Budget approved for third-party integrations.",
  "Department performance review completed. Attendance trends reviewed, productivity scores discussed. HR to follow up with 3 employees on performance improvement plans. New leave policy to be communicated company-wide.",
];

export default function AdminMeetingsPage() {
  const [db, setDb] = useState(() => getDb());
  const [tab, setTab] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRoom | null>(null);
  const [search, setSearch] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const user = getCurrentUser();

  const [form, setForm] = useState({
    title: '', scheduledAt: '', duration: 60, participantIds: [] as string[],
    isRecurring: false, recurringPattern: 'weekly' as 'daily' | 'weekly' | 'monthly',
    notes: '', agenda: ''
  });

  const refreshDb = () => setDb(getDb());

  const meetings = db.meetingRooms.filter(m => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'upcoming') return m.status === 'scheduled';
    if (tab === 'active') return m.status === 'active';
    if (tab === 'completed') return m.status === 'completed';
    return true;
  }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const handleCreate = () => {
    if (!form.title || !form.scheduledAt) return;
    const freshDb = getDb();
    const meeting: MeetingRoom = {
      id: `meet-${Date.now()}`,
      title: form.title,
      hostId: user?.id || 'emp-001',
      status: 'scheduled',
      scheduledAt: form.scheduledAt,
      duration: form.duration,
      isRecurring: form.isRecurring,
      recurringPattern: form.isRecurring ? form.recurringPattern : undefined,
      notes: form.notes,
      agenda: form.agenda ? form.agenda.split('\n').filter(Boolean).map((a, i) => ({
        id: `agenda-${i}`, title: a.trim(), duration: 10, isCompleted: false
      })) : [],
      actionItems: [],
      waitingRoomIds: [],
      participantIds: form.participantIds,
      chat: [],
      raisedHands: [],
      attendanceLog: [],
    };
    freshDb.meetingRooms.push(meeting);
    if (user) addAuditLog(user.id, 'Schedule Meeting', 'meeting_rooms', meeting.id, `Scheduled: ${meeting.title}`, { module: 'Meetings' });

    // Notify participants
    form.participantIds.forEach(pid => {
      createNotification(pid, '📅 Meeting Scheduled', `You've been invited to: ${form.title}`, 'normal', meeting.id, 'meeting');
    });

    saveDb(freshDb);
    refreshDb();
    setShowCreate(false);
    setForm({ title: '', scheduledAt: '', duration: 60, participantIds: [], isRecurring: false, recurringPattern: 'weekly', notes: '', agenda: '' });
  };

  const generateAiSummary = (meetingId: string) => {
    const freshDb = getDb();
    const idx = freshDb.meetingRooms.findIndex(m => m.id === meetingId);
    if (idx !== -1) {
      freshDb.meetingRooms[idx].aiSummary = AI_SUMMARIES[Math.floor(Math.random() * AI_SUMMARIES.length)];
      freshDb.meetingRooms[idx].decisions = ['Proceed with migration timeline', 'Approve new hire requests', 'Schedule follow-up in 2 weeks'];
      saveDb(freshDb);
      refreshDb();
      setSelectedMeeting(freshDb.meetingRooms[idx]);
    }
  };

  const handleCopyInviteLink = async (meetingId: string) => {
    const inviteUrl = `${window.location.origin}/meetings?room=${meetingId}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLinkId(meetingId);
    setTimeout(() => setCopiedLinkId(null), 1600);
    if (user) {
      createNotification(user.id, '📎 Invite Link Ready', `Share this meeting link with your team: ${inviteUrl}`, 'normal', meetingId, 'meeting');
    }
  };

  const getHostName = (hostId: string) => db.profiles.find(p => p.id === hostId)?.name || 'Unknown';

  const tabs = [
    { key: 'upcoming', label: 'Upcoming', count: db.meetingRooms.filter(m => m.status === 'scheduled').length },
    { key: 'active', label: 'Live Now', count: db.meetingRooms.filter(m => m.status === 'active').length },
    { key: 'completed', label: 'Completed', count: db.meetingRooms.filter(m => m.status === 'completed').length },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Video className="w-5 h-5 text-violet-500" /> Meeting Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">{db.meetingRooms.length} total meetings</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/20 transition-all">
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-card border border-border p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-foreground'}`}>
              {t.label}
              {t.count > 0 && <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${tab === t.key ? 'bg-white/20' : 'bg-border'}`}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meetings..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:border-violet-500 w-56" />
        </div>
      </div>

      {/* Meeting List */}
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-card border border-border rounded-2xl">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No meetings found</p>
            <p className="text-xs mt-1">Schedule a meeting to get started</p>
          </div>
        ) : meetings.map(meeting => (
          <div key={meeting.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-all cursor-pointer group"
            onClick={() => setSelectedMeeting(meeting)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-10 rounded-full ${meeting.status === 'active' ? 'bg-green-500 animate-pulse' : meeting.status === 'completed' ? 'bg-slate-600' : 'bg-violet-500'}`} />
                <div>
                  <h3 className="font-bold text-foreground text-sm">{meeting.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(meeting.scheduledAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {meeting.duration}m</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {meeting.participantIds.length} invited</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {meeting.status === 'completed' && !meeting.aiSummary && (
                  <button onClick={e => { e.stopPropagation(); generateAiSummary(meeting.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold transition-all">
                    <Wand2 className="w-3 h-3" /> AI Summary
                  </button>
                )}
                {meeting.aiSummary && <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold"><CheckCircle className="w-3 h-3" /> Summary Ready</span>}
                <button onClick={e => { e.stopPropagation(); handleCopyInviteLink(meeting.id); }} className="p-2 rounded-lg border border-border hover:bg-violet-500/10 text-slate-400 hover:text-violet-400 transition-all" title="Copy invite link">
                  {copiedLinkId === meeting.id ? <CheckCircle className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                </button>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">{selectedMeeting.title}</h2>
              <button onClick={() => setSelectedMeeting(null)} className="p-1.5 rounded-lg hover:bg-border text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 text-xs">
              <div className="bg-background rounded-xl p-3 border border-border">
                <p className="text-slate-500 mb-1">Host</p>
                <p className="font-semibold text-foreground">{getHostName(selectedMeeting.hostId)}</p>
              </div>
              <div className="bg-background rounded-xl p-3 border border-border">
                <p className="text-slate-500 mb-1">Scheduled</p>
                <p className="font-semibold text-foreground">{new Date(selectedMeeting.scheduledAt).toLocaleString()}</p>
              </div>
              <div className="bg-background rounded-xl p-3 border border-border">
                <p className="text-slate-500 mb-1">Duration</p>
                <p className="font-semibold text-foreground">{selectedMeeting.duration} minutes</p>
              </div>
              <div className="bg-background rounded-xl p-3 border border-border">
                <p className="text-slate-500 mb-1">Status</p>
                <span className={`font-semibold capitalize ${selectedMeeting.status === 'active' ? 'text-green-400' : selectedMeeting.status === 'completed' ? 'text-slate-400' : 'text-violet-400'}`}>{selectedMeeting.status}</span>
              </div>
            </div>

            {selectedMeeting.agenda && selectedMeeting.agenda.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agenda</h3>
                <div className="space-y-1">
                  {selectedMeeting.agenda.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="text-slate-500">{i + 1}.</span> {item.title}
                      {item.isCompleted && <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedMeeting.aiSummary && (
              <div className="mb-5 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-4 h-4 text-violet-400" />
                  <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">AI Meeting Summary</h3>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{selectedMeeting.aiSummary}</p>
                {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-400 mb-1">Key Decisions:</p>
                    {selectedMeeting.decisions.map((d, i) => (
                      <p key={i} className="text-xs text-foreground flex items-start gap-1.5 mb-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> {d}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => handleCopyInviteLink(selectedMeeting.id)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-border rounded-xl text-sm font-semibold text-foreground transition-all">
                <LinkIcon className="w-4 h-4" /> {copiedLinkId === selectedMeeting.id ? 'Invite Link Copied' : 'Copy Invite Link'}
              </button>
              {selectedMeeting.status === 'completed' && !selectedMeeting.aiSummary && (
                <button onClick={() => generateAiSummary(selectedMeeting.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 rounded-xl text-sm font-semibold text-violet-400 transition-all">
                  <Wand2 className="w-4 h-4" /> Generate AI Summary
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Schedule Meeting</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-border text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Meeting Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" placeholder="e.g. Weekly Team Standup" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date & Time *</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Duration (min)</label>
                  <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Agenda (one item per line)</label>
                <textarea value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} rows={4} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500 resize-none" placeholder="Q3 Review&#10;Budget Discussion&#10;New Hire Update" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 accent-violet-500" />
                <label htmlFor="recurring" className="text-xs font-semibold text-foreground">Recurring Meeting</label>
                {form.isRecurring && (
                  <select value={form.recurringPattern} onChange={e => setForm(f => ({ ...f, recurringPattern: e.target.value as any }))} className="ml-auto px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 bg-border/50 hover:bg-border rounded-xl text-sm font-semibold text-foreground transition-all">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
