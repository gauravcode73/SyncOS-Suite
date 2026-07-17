'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Video,
  FileText,
  Calendar,
  Layers,
  Bell,
  Coffee,
  CheckCircle,
  Play,
  Square
} from 'lucide-react';
import { useDashboard } from '../../dashboard/DashboardContext';
import { getDb, saveDb, addActivityLog, Task, Project, MeetingRoom, DocumentFile, Announcement } from '@/lib/database/mockDb';

export default function EmployeeDashboardPage() {
  const {
    user,
    isClockedIn,
    isOnBreak,
    clockInTime,
    triggerClockIn,
    triggerClockOut,
    triggerBreak,
    refreshDbState,
    dbVersion
  } = useDashboard();

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myMeetings, setMyMeetings] = useState<MeetingRoom[]>([]);
  const [recentFiles, setRecentFiles] = useState<DocumentFile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Profile Picture Editor States
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    if (!newAvatarUrl || !user) return;
    const db = getDb();
    const idx = db.profiles.findIndex(p => p.id === user.id);
    if (idx !== -1) {
      db.profiles[idx].avatarUrl = newAvatarUrl;
      localStorage.setItem('enterprise_os_current_user', JSON.stringify(db.profiles[idx]));
      saveDb(db);
      refreshDbState();
      setAvatarModalOpen(false);
    }
  };

  // Senior approval dashboard states
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [seniorApprovalComments, setSeniorApprovalComments] = useState('');
  
  const handleQuickSeniorReview = (taskId: string, action: 'approve' | 'changes') => {
    if (!user) return;
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      if (action === 'approve') {
        task.status = 'Admin Verification';
        task.rejectionReason = null;
        task.timeline.push({
          id: `tl-${Date.now()}`,
          action: 'Quick Approved by Senior from Dashboard',
          profileId: user.id,
          timestamp: new Date().toISOString()
        });
        addActivityLog(user.id, 'Senior Task Approve', `Quick approved task: ${task.name}`);
      } else {
        task.status = 'Rejected';
        task.rejectionReason = seniorApprovalComments || 'Changes requested by Senior reviewer.';
        task.timeline.push({
          id: `tl-${Date.now()}`,
          action: 'Changes Requested by Senior from Dashboard',
          profileId: user.id,
          timestamp: new Date().toISOString()
        });
        addActivityLog(user.id, 'Senior Task Revision Request', `Requested revisions for task: ${task.name}`);
      }
      saveDb(db);
      setSeniorApprovalComments('');
      refreshDbState();
    }
  };

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    
    // Filter tasks assigned to this employee
    const tasks = db.tasks.filter(t => t.assigneeIds.includes(user.id));
    setMyTasks(tasks);

    // Filter projects belonging to employee's department
    const projs = db.projects.filter(p => p.departmentId === user.departmentId);
    setMyProjects(projs);

    // Meetings that are active or scheduled
    const meets = db.meetingRooms.filter(m => m.status !== 'completed').slice(0, 3);
    setMyMeetings(meets);

    // Recent globally readable documents
    const docs = db.documents.filter(d => !d.isFolder).slice(0, 3);
    setRecentFiles(docs);

    // Announcements
    setAnnouncements(db.announcements.slice(0, 3));
  }, [user, dbVersion]);

  const toggleTaskStatus = (taskId: string) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.status = task.status === 'Completed' ? 'Assigned' : 'Completed';
      task.progress = task.status === 'Completed' ? 100 : 0;
      
      addActivityLog(user!.id, 'Update Task Status', `Toggled task "${task.name}" to ${task.status}.`);
      saveDb(db);
      refreshDbState();
    }
  };

  const activeTasksCount = myTasks.filter(t => t.status !== 'Completed').length;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const dueTodayCount = myTasks.filter(t => t.deadline === todayDateStr && t.status !== 'Completed').length;
  const completedCount = myTasks.filter(t => t.status === 'Completed').length;
  
  const dbData = getDb();
  const pendingApprovals = user ? dbData.tasks.filter(t => t.seniorId === user.id && (t.status === 'Senior Review' || t.status === 'Review Requested')) : [];
  const pendingApprovalsCount = pendingApprovals.length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer shrink-0" onClick={() => { setNewAvatarUrl(user.avatarUrl); setAvatarModalOpen(true); }}>
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border border-violet-500/40 group-hover:opacity-75 transition-all"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[8px] text-white opacity-0 group-hover:opacity-100 rounded-full font-bold transition-all">
              Change
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome back, {user.name}!</h2>
            <p className="text-xs text-slate-450 mt-0.5">Here is a summary of your workspace, tasks, and schedule for today.</p>
          </div>
        </div>

        {/* Timesheet Controls */}
        <div className="flex items-center gap-3 bg-card border border-border p-2.5 rounded-xl shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timesheet Status</p>
            <p className="text-xs font-semibold">
              {isClockedIn ? (isOnBreak ? 'On Break' : 'Clocked In') : 'Clocked Out'}
            </p>
          </div>
          
          <div className="flex gap-2">
            {!isClockedIn ? (
              <button
                onClick={() => triggerClockIn()}
                className="flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Clock In
              </button>
            ) : (
              <>
                <button
                  onClick={() => triggerBreak()}
                  className="flex items-center gap-1 border border-border hover:bg-border/60 text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Coffee className="w-3.5 h-3.5" /> {isOnBreak ? 'End Break' : 'Take Break'}
                </button>
                <button
                  onClick={() => triggerClockOut()}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" /> Clock Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI METRICS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Tasks</p>
          <h3 className="text-xl font-extrabold text-foreground mt-1">{activeTasksCount}</h3>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Today</p>
          <h3 className="text-xl font-extrabold text-foreground mt-1">{dueTodayCount}</h3>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Tasks</p>
          <h3 className="text-xl font-extrabold text-foreground mt-1">{completedCount}</h3>
        </div>
        <button
          onClick={() => { if (pendingApprovalsCount > 0) setApprovalsModalOpen(true); }}
          className={`text-left p-4 rounded-xl shadow-sm border transition-all cursor-pointer ${
            pendingApprovalsCount > 0 
              ? 'bg-amber-500/10 border-amber-500/30 hover:shadow-md' 
              : 'bg-card border-border'
          }`}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Approvals</span>
            {pendingApprovalsCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          </p>
          <h3 className="text-xl font-extrabold text-foreground mt-1">{pendingApprovalsCount}</h3>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tasks and Projects */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* My Tasks */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-500" />
                My Action Items ({myTasks.filter(t => t.status !== 'Completed').length})
              </h3>
            </div>
            
            {myTasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No tasks assigned to you. You are all caught up!</p>
            ) : (
              <div className="space-y-3">
                {myTasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 border border-border bg-background/50 hover:bg-border/20 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaskStatus(t.id)}
                        className={`p-1 rounded border transition-all cursor-pointer ${
                          t.status === 'Completed'
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-border text-transparent hover:border-violet-500'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <p className={`text-xs font-semibold ${t.status === 'Completed' ? 'line-through text-slate-500' : 'text-foreground'}`}>
                          {t.name}
                        </p>
                        <p className="text-[10px] text-slate-400">Due: {t.deadline}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      t.priority === 'Urgent' ? 'bg-red-500/10 border-red-500/25 text-red-500' :
                      t.priority === 'High' ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' :
                      'bg-slate-500/10 border-slate-500/25 text-slate-400'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Projects */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
              <Layers className="w-4 h-4 text-indigo-500" />
              Assigned Department Projects
            </h3>
            
            {myProjects.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No active projects linked to your department.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myProjects.map(p => (
                  <div key={p.id} className="p-4 border border-border rounded-xl bg-background/30 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Completion</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div className="bg-violet-600 h-1 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Schedule, Announcements, Files */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Meetings */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
              <Video className="w-4 h-4 text-pink-500" />
              Today Meetings
            </h3>
            
            {myMeetings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No meetings scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {myMeetings.map(m => (
                  <div key={m.id} className="p-3 border border-border rounded-xl bg-background/50 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold truncate">{m.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Status: {m.status}</p>
                    </div>
                    <span className="text-[10px] font-bold text-violet-500 mt-2">
                      {m.scheduledAt || 'Right Now'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
              <Bell className="w-4 h-4 text-amber-500" />
              Corporate Circulars
            </h3>
            
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 border border-border rounded-xl bg-background/50 text-xs">
                  <h4 className="font-bold text-foreground">{a.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Files */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
              <FileText className="w-4 h-4 text-emerald-500" />
              Knowledge SOP Base
            </h3>
            
            <div className="space-y-2.5">
              {recentFiles.map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs p-1">
                  <span className="truncate pr-4 text-slate-300 font-medium hover:text-white hover:underline cursor-pointer">{f.name}</span>
                  <span className="text-[10px] text-slate-500">{f.size}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Avatar Changer Modal */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm text-xs space-y-4 text-foreground">
            <h3 className="font-bold text-sm">Update Profile Avatar</h3>
            
            <div className="flex justify-center py-2">
              <img
                src={newAvatarUrl || user.avatarUrl}
                className="w-16 h-16 rounded-full object-cover border border-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Paste Image URL</label>
              <input
                type="text"
                value={newAvatarUrl}
                onChange={(e) => setNewAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-900 border border-border rounded p-2 text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Or Upload File</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAvatarModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAvatar}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Senior Task Approvals Modal */}
      {approvalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl text-xs space-y-4 text-foreground flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <span className="p-1 rounded bg-amber-500/10 text-amber-500 font-extrabold text-[10px]">⭐</span>
                Pending Project Task Approvals
              </h3>
              <button
                onClick={() => setApprovalsModalOpen(false)}
                className="text-slate-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingApprovals.map(t => {
                const assignee = dbData.profiles.find(p => p.id === t.assigneeIds[0]);
                const project = dbData.projects.find(p => p.id === t.projectId);
                return (
                  <div key={t.id} className="p-4 border border-border rounded-xl bg-background/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{t.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Project: <span className="font-bold text-slate-350">{project?.name || 'Workspace'}</span> • 
                          Assignee: <span className="font-bold text-violet-500">{assignee?.name || 'Staff'}</span>
                        </p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                        t.priority === 'High' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    {t.description && (
                      <div className="bg-slate-100/50 dark:bg-slate-900/30 p-2.5 rounded text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed border border-border/50">
                        <span className="font-bold block text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Deliverable description:</span>
                        {t.description}
                      </div>
                    )}

                    {t.submissionNotes && (
                      <div className="bg-violet-500/5 dark:bg-violet-950/20 p-2.5 rounded text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed border border-violet-500/15">
                        <span className="font-bold block text-violet-500 text-[9px] uppercase tracking-wider mb-0.5">Submission Notes / Links:</span>
                        {t.submissionNotes}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Remarks / Revision guidelines (required only for returning changes)..."
                        onChange={(e) => setSeniorApprovalComments(e.target.value)}
                        className="flex-1 bg-slate-100 dark:bg-slate-900 border border-border rounded px-3 py-1.5 outline-none text-foreground"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleQuickSeniorReview(t.id, 'changes')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg font-bold cursor-pointer text-[10px]"
                        >
                          Request Revisions
                        </button>
                        <button
                          onClick={() => handleQuickSeniorReview(t.id, 'approve')}
                          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg font-bold cursor-pointer text-[10px]"
                        >
                          Approve Task
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {pendingApprovals.length === 0 && (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <p className="font-bold text-sm">All tasks processed! 🎉</p>
                  <p className="text-xs">No pending project task approvals at this time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
