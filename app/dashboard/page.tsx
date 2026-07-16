'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import {
  getDb,
  saveDb,
  addActivityLog,
  Profile,
  Task,
  MeetingRoom,
  Announcement,
  CalendarEvent
} from '@/lib/database/mockDb';
import {
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Volume2,
  UserCheck,
  MapPin,
  Laptop,
  CheckSquare,
  FileText,
  UserPlus,
  Send,
  Loader2,
  Plus,
  Video
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const { user, isClockedIn, isOnBreak, workingHours, refreshDbState, dbVersion } = useDashboard();
  const [db, setDb] = useState(getDb());
  const [pollVoted, setPollVoted] = useState<string | null>(null);

  // Modal Triggers for Quick Actions
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Quick Task Creation Form State
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('8');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');



  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  if (!user) return null;

  // Filter tasks assigned to user
  const userTasks = db.tasks.filter(t => t.assigneeIds.includes(user.id) && t.status !== 'Completed');
  const completedTasksCount = db.tasks.filter(t => t.assigneeIds.includes(user.id) && t.status === 'Completed').length;
  const pendingTasksCount = userTasks.length;

  // Filter today's meetings
  const todayMeetings = db.meetingRooms.filter(m => m.status !== 'completed');

  // Filter announcements
  const pinnedAnnouncements = db.announcements.filter(a => a.pinned || a.type === 'poll');

  // Find online users
  const onlineUsers = db.profiles.filter(p => p.onlineStatus !== 'offline');

  // Total Storage usage computation
  // Simulating 512MB capacity, files size sum
  const maxStorageMb = 512;
  const filesWithSizes = db.documents.filter(d => !d.isFolder);
  let totalSizeKb = 0;
  filesWithSizes.forEach(f => {
    if (f.size.includes('MB')) {
      totalSizeKb += parseFloat(f.size.replace(' MB', '')) * 1024;
    } else if (f.size.includes('KB')) {
      totalSizeKb += parseFloat(f.size.replace(' KB', ''));
    }
  });
  const totalSizeMb = parseFloat((totalSizeKb / 1024).toFixed(2));
  const storagePercentage = Math.min(100, parseFloat(((totalSizeMb / maxStorageMb) * 100).toFixed(1)));

  // Handle Poll Voting
  const handleVote = (announcementId: string, optionId: string) => {
    const currentDb = getDb();
    const annIdx = currentDb.announcements.findIndex(a => a.id === announcementId);
    if (annIdx !== -1) {
      const ann = currentDb.announcements[annIdx];
      if (!ann.pollVotes) ann.pollVotes = {};
      
      // Remove user from any other options first
      Object.keys(ann.pollVotes).forEach(optId => {
        ann.pollVotes![optId] = ann.pollVotes![optId].filter(id => id !== user.id);
      });

      // Add to selected option
      if (!ann.pollVotes[optionId]) ann.pollVotes[optionId] = [];
      ann.pollVotes[optionId].push(user.id);
      
      // Add user to acknowledgements
      if (!ann.acknowledgements.includes(user.id)) {
        ann.acknowledgements.push(user.id);
      }

      addActivityLog(user.id, 'Poll Vote Casted', `Voted in poll "${ann.title}"`);
      saveDb(currentDb);
      setPollVoted(optionId);
      refreshDbState();
    }
  };

  // Submit Quick Task Form
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !newTaskAssignee) return;

    const currentDb = getDb();
    const task: Task = {
      id: `task-${Date.now()}`,
      projectId: null,
      name: newTaskName,
      description: newTaskDesc,
      priority: newTaskPriority,
      status: 'To Do',
      departmentId: user.departmentId,
      assigneeIds: [newTaskAssignee],
      startDate: new Date().toISOString(),
      deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : new Date(Date.now() + 3600000 * 48).toISOString(),
      estimatedHours: parseFloat(newTaskHours) || 8,
      actualHours: 0,
      progress: 0,
      subtasks: [],
      checklist: [],
      comments: [],
      attachments: [],
      timeline: [{ id: `tl-${Date.now()}`, action: 'Task Created (Quick Action)', profileId: user.id, timestamp: new Date().toISOString() }]
    };

    currentDb.tasks.push(task);

    // Create notifications for the assigned employee
    if (newTaskAssignee !== user.id) {
      currentDb.notifications.unshift({
        id: `notif-${Date.now()}`,
        profileId: newTaskAssignee,
        title: 'New Task Assigned',
        body: `${user.name} assigned you the task: "${newTaskName}"`,
        type: 'task',
        isRead: false,
        referenceId: task.id,
        createdAt: new Date().toISOString()
      });
    }

    addActivityLog(user.id, 'Task Created', `Created task: "${newTaskName}" assigned to employee.`);
    saveDb(currentDb);
    
    // Reset Form
    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskAssignee('');
    setTaskModalOpen(false);
    refreshDbState();
  };



  // Dismiss notification card helper
  const handleMarkNotifRead = (notifId: string) => {
    const currentDb = getDb();
    const idx = currentDb.notifications.findIndex(n => n.id === notifId);
    if (idx !== -1) {
      currentDb.notifications[idx].isRead = true;
      saveDb(currentDb);
      refreshDbState();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* GREETING CARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Hello, {user.name} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Role: <span className="text-violet-400 font-semibold">{user.role}</span> • Department: <span className="text-violet-400 font-semibold">{user.departmentId ? user.departmentId.replace('dept-', '').toUpperCase() : 'IT'}</span> • Designation: <span className="text-slate-200">{user.designation}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Create Task
          </button>
          <Link
            href="/dashboard/meetings"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5 text-rose-400" /> Video Sync
          </Link>
        </div>
      </div>

      {/* METRIC STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Pending tasks count */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 font-bold">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{pendingTasksCount}</h3>
          </div>
        </div>

        {/* Completed tasks count */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed Tasks</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{completedTasksCount}</h3>
          </div>
        </div>

        {/* Disk space usage widget */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Drive Storage</span>
            </div>
            <span className="text-[10px] text-slate-450 font-bold">{totalSizeMb}MB / {maxStorageMb}MB</span>
          </div>
          <div className="w-full bg-slate-955 rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${storagePercentage}%` }} />
          </div>
        </div>

      </div>

      {/* TWO COLUMN GRID MAIN BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PRIMARY PANEL - 8 COLS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TODAY'S TASKS & DEADLINES */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/40">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-400" /> Today's Focus Tasks
              </h2>
              <Link href="/dashboard/tasks" className="text-xs text-violet-400 hover:text-violet-300 font-semibold">View Planner</Link>
            </div>

            {userTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                🎉 Perfect! You have no pending tasks assigned. Enjoy your day!
              </div>
            ) : (
              <div className="space-y-3">
                {userTasks.map(t => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-800/60 bg-slate-950/20 hover:bg-slate-900/30 hover:border-slate-700 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{t.name}</p>
                      <div className="flex items-center gap-2.5 text-[10px] text-slate-450 mt-1">
                        <span className={`px-1.5 py-0.2 rounded border font-medium ${
                          t.priority === 'Urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          t.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-750'
                        }`}>
                          {t.priority}
                        </span>
                        <span>Estimate: {t.estimatedHours}h</span>
                        <span>Deadline: {new Date(t.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <Link
                      href="/dashboard/tasks"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-[10px] shrink-0 border border-slate-700"
                    >
                      Update
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVE MEETINGS & BROADCASTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MEETINGS CARD */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/40">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-400" /> Today's Video Syncs
                </h2>
                <Link href="/dashboard/meetings" className="text-xs text-rose-400 hover:text-rose-300 font-semibold">Join Room</Link>
              </div>

              {todayMeetings.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No active/upcoming meeting invitations for today.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayMeetings.map(m => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-950/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{m.title}</p>
                        <p className="text-[10px] text-slate-450 mt-0.5">Host: {db.profiles.find(p => p.id === m.hostId)?.name || 'Admin'}</p>
                      </div>
                      <Link
                        href="/dashboard/meetings"
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded text-[10px]"
                      >
                        Join Room
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ANNOUNCEMENTS & POLLS CARD */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/40">
                <Volume2 className="w-4 h-4 text-emerald-400" /> Company Bulletins
              </h2>

              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {pinnedAnnouncements.map(ann => {
                  const hasVoted = ann.pollVotes && Object.values(ann.pollVotes).some(voters => voters.includes(user.id));
                  
                  return (
                    <div key={ann.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/20 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-200">{ann.title}</p>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${
                          ann.type === 'poll' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-850 text-slate-400 border-slate-800'
                        }`}>
                          {ann.type.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-[11px] leading-normal">{ann.content}</p>

                      {ann.type === 'poll' && ann.pollOptions && (
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-800/40">
                          {ann.pollOptions.map(opt => {
                            const votes = ann.pollVotes?.[opt.id]?.length || 0;
                            const isUserSelection = ann.pollVotes?.[opt.id]?.includes(user.id);
                            
                            return (
                              <button
                                key={opt.id}
                                disabled={hasVoted}
                                onClick={() => handleVote(ann.id, opt.id)}
                                className={`w-full flex items-center justify-between p-2 rounded text-[11px] transition-all border text-left ${
                                  isUserSelection
                                    ? 'bg-violet-950/40 text-violet-300 border-violet-500/35'
                                    : 'bg-slate-950/50 hover:bg-slate-900 border-slate-850 text-slate-350'
                                }`}
                              >
                                <span>{opt.text}</span>
                                <span className="font-semibold">{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SYSTEM NOTIFICATIONS HISTORY CENTER */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/40">
              <Volume2 className="w-4 h-4 text-sky-400" /> Notifications Feed
            </h2>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {db.notifications.filter(n => n.profileId === user.id).length === 0 ? (
                <div className="text-center py-6 text-slate-550 text-xs">
                  Your notification feeds are currently empty.
                </div>
              ) : (
                db.notifications
                  .filter(n => n.profileId === user.id)
                  .slice(0, 10)
                  .map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkNotifRead(n.id)}
                      className={`p-3 rounded-lg border flex items-start justify-between gap-4 transition-all text-xs cursor-pointer ${
                        n.isRead
                          ? 'border-slate-850 bg-slate-950/10 text-slate-450'
                          : 'border-violet-500/25 bg-violet-950/10 text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-250 flex items-center gap-1.5">
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">{n.body}</p>
                        <span className="text-[9px] text-slate-500 mt-1 block">{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      
                      {!n.isRead && (
                        <button className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold shrink-0">
                          Clear
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT DIRECTORY PANEL - 4 COLS */}
        <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5">
          
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5 text-violet-400" /> Active Team Members
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Currently working in SyncOS Workspace ({onlineUsers.length})</p>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {db.profiles.map(p => {
              const statusColors = {
                online: 'bg-emerald-500 border-emerald-950',
                busy: 'bg-rose-500 border-rose-950',
                away: 'bg-amber-500 border-amber-950',
                offline: 'bg-slate-700 border-slate-950'
              };

              const roleLabels = {
                'Super Admin': 'Admin',
                'HR Admin': 'HR',
                'Department Admin': 'Dept Admin',
                'Manager': 'Mgr',
                'Team Lead': 'TL',
                'Employee': 'Staff',
                'Guest': 'Guest'
              };

              const isUserAdmin = user.role === 'Super Admin' || user.role === 'HR Admin';

              return (
                <div key={p.id} className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-slate-850/65 bg-slate-950/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img src={p.avatarUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-slate-850" />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${statusColors[p.onlineStatus]}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-450 truncate">{p.designation}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[8px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.2 rounded border border-slate-700">
                      {roleLabels[p.role]}
                    </span>
                    
                    {/* Admin monitoring location/device tracing */}
                    {isUserAdmin && p.onlineStatus !== 'offline' && (
                      <div className="flex items-center gap-1 text-[8px] text-slate-500">
                        <MapPin className="w-2 h-2" />
                        <span className="truncate max-w-[80px]">{p.location || 'Remote'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* ==================================================== */}
      {/* 🚀 QUICK MODALS POPUPS SECTION */}
      {/* ==================================================== */}

      {/* CREATE TASK QUICK MODAL */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in text-slate-200">
            <h2 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800/60">Create Corporate Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Task Title / Name</label>
                <input
                  type="text"
                  required
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g., Audit firewall log access"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Detailed Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Explain scope, attachments or links..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assign Employee</label>
                  <select
                    required
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none"
                  >
                    <option value="">-- Choose Staff --</option>
                    {db.profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.designation})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Estimated Hours</label>
                  <input
                    type="number"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(e.target.value)}
                    placeholder="8"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Deadline Date</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none text-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Assign Task
                </button>
              </div>

            </form>
          </div>
        </div>
      )}



    </div>
  );
}
