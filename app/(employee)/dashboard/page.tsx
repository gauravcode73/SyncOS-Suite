'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare, Clock, FileText, Calendar, Layers, Bell,
  Coffee, CheckCircle, Play, Square, X, ChevronRight,
  AlertTriangle, TrendingUp, Zap, Target, Star, Send,
  MoreHorizontal, Filter, RefreshCw, User, ArrowRight,
  Circle, AlertCircle, Activity, Award, Flag, Hash,
  ChevronDown, Eye, Paperclip, MessageSquare, Timer,
  BarChart2, Inbox, ListChecks
} from 'lucide-react';
import { useDashboard } from '../../dashboard/DashboardContext';
import {
  getDb, saveDb, addActivityLog, Task, Project, MeetingRoom,
  DocumentFile, Announcement, Profile
} from '@/lib/database/mockDb';

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  'Assigned':           { label: 'Pending',        color: 'text-purple-400',  dot: 'bg-purple-500',  bg: 'bg-purple-500/10 border-purple-500/25' },
  'Accepted':           { label: 'Accepted',        color: 'text-blue-400',    dot: 'bg-blue-500',    bg: 'bg-blue-500/10 border-blue-500/25' },
  'Working':            { label: 'In Progress',     color: 'text-orange-400',  dot: 'bg-orange-500',  bg: 'bg-orange-500/10 border-orange-500/25' },
  'Review Requested':   { label: 'Under Review',    color: 'text-yellow-400',  dot: 'bg-yellow-500',  bg: 'bg-yellow-500/10 border-yellow-500/25' },
  'Senior Review':      { label: 'Senior Review',   color: 'text-amber-400',   dot: 'bg-amber-500',   bg: 'bg-amber-500/10 border-amber-500/25' },
  'Admin Verification': { label: 'Admin Review',    color: 'text-sky-400',     dot: 'bg-sky-500',     bg: 'bg-sky-500/10 border-sky-500/25' },
  'Completed':          { label: 'Completed',       color: 'text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  'Rejected':           { label: 'Needs Revision',  color: 'text-red-400',     dot: 'bg-red-500',     bg: 'bg-red-500/10 border-red-500/25' },
  'Blocked':            { label: 'Blocked',         color: 'text-red-500',     dot: 'bg-red-600',     bg: 'bg-red-500/10 border-red-500/25' },
  'On Hold':            { label: 'On Hold',         color: 'text-slate-400',   dot: 'bg-slate-500',   bg: 'bg-slate-500/10 border-slate-500/25' },
  'QA Review':          { label: 'QA Review',       color: 'text-teal-400',    dot: 'bg-teal-500',    bg: 'bg-teal-500/10 border-teal-500/25' },
  'Reopened':           { label: 'Reopened',        color: 'text-indigo-400',  dot: 'bg-indigo-500',  bg: 'bg-indigo-500/10 border-indigo-500/25' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  'Urgent': { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',    icon: '🔴' },
  'High':   { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: '🟠' },
  'Medium': { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '🟡' },
  'Low':    { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/25', icon: '⚪' },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-slate-400', dot: 'bg-slate-500', bg: 'bg-slate-500/10 border-slate-500/25' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Low'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {priority}
    </span>
  );
}

// ─── Task Detail Drawer ───────────────────────────────────────────────────────
function TaskDetailDrawer({
  task, profiles, projects, user, onClose, onUpdateStatus, onToggleChecklist, onAddComment, onSubmitWork, onSeniorReview, onProgressChange
}: {
  task: Task;
  profiles: Profile[];
  projects: Project[];
  user: Profile;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onToggleChecklist: (taskId: string, itemId: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onSubmitWork: (taskId: string, notes: string) => void;
  onSeniorReview: (taskId: string, action: 'approve' | 'changes' | 'reject', comments: string) => void;
  onProgressChange: (taskId: string, val: number) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [seniorComments, setSeniorComments] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'comments' | 'timeline'>('details');

  const project = projects.find(p => p.id === task.projectId);
  const assignees = profiles.filter(p => task.assigneeIds.includes(p.id));
  const senior = task.seniorId ? profiles.find(p => p.id === task.seniorId) : null;
  const isSeniorReviewer = task.seniorId === user.id;
  const isAssignee = task.assigneeIds.includes(user.id);

  const checkedCount = task.checklist.filter(c => c.isChecked).length;
  const checklistPct = task.checklist.length > 0 ? Math.round((checkedCount / task.checklist.length) * 100) : 0;

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed';

  const WORKFLOW_STEPS = ['Assigned', 'Working', 'Review Requested', 'Admin Verification', 'Completed'];
  const currentStep = WORKFLOW_STEPS.findIndex(s => s === task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/70 backdrop-blur-sm">
      {/* Click-outside overlay */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer panel */}
      <div
        className="w-full max-w-2xl bg-[var(--card,#0f172a)] border-l border-slate-800 flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-violet-600/5 to-indigo-600/5 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <StatusChip status={task.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white leading-snug">{task.name}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {project ? `📁 ${project.name}` : '📋 General Task'} · ID: {task.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow progress bar */}
        <div className="px-5 py-3 border-b border-slate-800/50 shrink-0 bg-slate-950/30">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider overflow-x-auto">
            {['Created', 'Assigned', 'Working', 'Submitted', 'Senior OK', 'Completed'].map((step, i) => {
              const passed = currentStep >= i - 1;
              const active = (i === 1 && ['Assigned','Accepted'].includes(task.status)) ||
                             (i === 2 && task.status === 'Working') ||
                             (i === 3 && ['Review Requested','Senior Review'].includes(task.status)) ||
                             (i === 4 && task.status === 'Admin Verification') ||
                             (i === 5 && task.status === 'Completed');
              const done = (i === 0) ||
                           (i === 1 && ['Working','Review Requested','Senior Review','Admin Verification','Completed'].includes(task.status)) ||
                           (i === 2 && ['Review Requested','Senior Review','Admin Verification','Completed'].includes(task.status)) ||
                           (i === 3 && ['Admin Verification','Completed'].includes(task.status)) ||
                           (i === 4 && task.status === 'Completed') ||
                           (i === 5 && task.status === 'Completed');
              return (
                <React.Fragment key={step}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                  <span className={`whitespace-nowrap px-1.5 py-0.5 rounded ${
                    done ? 'text-emerald-400' : active ? 'text-violet-400' : 'text-slate-600'
                  }`}>{step} {done && i < 5 ? '✓' : ''}</span>
                </React.Fragment>
              );
            })}
            {task.status === 'Rejected' && (
              <span className="ml-2 text-red-400 whitespace-nowrap">⚠ Revision Needed</span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-800 shrink-0 px-2 pt-2 bg-slate-950/20 gap-1">
          {(['details', 'checklist', 'comments', 'timeline'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold capitalize rounded-t-lg transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'details' && <><Eye className="w-3.5 h-3.5 inline mr-1.5" />Details</>}
              {tab === 'checklist' && <><ListChecks className="w-3.5 h-3.5 inline mr-1.5" />Checklist {task.checklist.length > 0 && `(${checklistPct}%)`}</>}
              {tab === 'comments' && <><MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />Comments {task.comments.length > 0 && `(${task.comments.length})`}</>}
              {tab === 'timeline' && <><Activity className="w-3.5 h-3.5 inline mr-1.5" />Timeline</>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="p-5 space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Due Date', value: task.deadline, icon: <Calendar className="w-3.5 h-3.5 text-violet-400" />, red: isOverdue },
                  { label: 'Estimated', value: `${task.estimatedHours}h`, icon: <Timer className="w-3.5 h-3.5 text-blue-400" /> },
                  { label: 'Actual Hours', value: `${task.actualHours || 0}h`, icon: <Clock className="w-3.5 h-3.5 text-emerald-400" /> },
                  { label: 'Remaining', value: `${Math.max(0, task.estimatedHours - (task.actualHours || 0))}h`, icon: <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> },
                ].map(({ label, value, icon, red }) => (
                  <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span></div>
                    <p className={`text-sm font-bold ${red ? 'text-red-400' : 'text-white'}`}>{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Assignees & Senior */}
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Assigned To</p>
                  <div className="flex flex-wrap gap-2">
                    {assignees.map(a => (
                      <div key={a.id} className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
                        <img src={a.avatarUrl} alt={a.name} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-xs font-semibold text-slate-300">{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {senior && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Department Senior</p>
                    <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5 w-fit">
                      <img src={senior.avatarUrl} alt={senior.name} className="w-5 h-5 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-amber-300">{senior.name}</span>
                      <span className="text-[9px] text-amber-500/70">⭐ Reviewer</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Description</p>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 leading-relaxed">
                    {task.description}
                  </div>
                </div>
              )}

              {/* Progress slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progress</p>
                  <span className="text-xs font-bold text-violet-400">{task.progress}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="10"
                  value={task.progress}
                  onChange={e => onProgressChange(task.id, Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                </div>
              </div>

              {/* Submission notes (if any) */}
              {task.submissionNotes && (
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Submission Notes</p>
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-sm text-slate-300 leading-relaxed">
                    {task.submissionNotes}
                  </div>
                </div>
              )}

              {/* Rejection reason */}
              {task.rejectionReason && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">⚠ Revision Required</p>
                  <p className="text-sm text-red-300">{task.rejectionReason}</p>
                </div>
              )}

              {/* Workflow Actions — Assignee */}
              {isAssignee && (
                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Actions</p>

                  {task.status === 'Assigned' && (
                    <button
                      onClick={() => onUpdateStatus(task.id, 'Accepted')}
                      className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                    >
                      <CheckCircle className="w-4 h-4" /> Accept Task
                    </button>
                  )}

                  {task.status === 'Accepted' && (
                    <button
                      onClick={() => onUpdateStatus(task.id, 'Working')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                    >
                      <Play className="w-4 h-4" /> Start Working
                    </button>
                  )}

                  {['Working', 'Rejected'].includes(task.status) && (
                    <div className="space-y-2">
                      <textarea
                        value={submissionNotes}
                        onChange={e => setSubmissionNotes(e.target.value)}
                        placeholder="Add submission notes, links, or references..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-violet-500 h-20 resize-none placeholder-slate-600"
                      />
                      <button
                        onClick={() => { onSubmitWork(task.id, submissionNotes); setSubmissionNotes(''); }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                      >
                        Submit for Review <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {['Review Requested', 'Senior Review', 'Admin Verification'].includes(task.status) && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-400 text-sm font-semibold">
                      <Timer className="w-4 h-4" /> Awaiting review approval…
                    </div>
                  )}

                  {task.status === 'Completed' && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm font-bold">
                      <CheckCircle className="w-4 h-4" /> 🎉 Task Completed & Approved
                    </div>
                  )}
                </div>
              )}

              {/* Senior Review Panel */}
              {isSeniorReviewer && task.status === 'Senior Review' && (
                <div className="space-y-3 pt-2 border-t border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><Star className="w-4 h-4" /> Senior Review Panel</p>
                  <input
                    type="text"
                    value={seniorComments}
                    onChange={e => setSeniorComments(e.target.value)}
                    placeholder="Remarks / revision guidelines..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { onSeniorReview(task.id, 'reject', seniorComments); setSeniorComments(''); }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-2 rounded-lg text-xs transition-all">Reject</button>
                    <button onClick={() => { onSeniorReview(task.id, 'changes', seniorComments); setSeniorComments(''); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-2 rounded-lg text-xs transition-all">Request Changes</button>
                    <button onClick={() => { onSeniorReview(task.id, 'approve', seniorComments); setSeniorComments(''); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-all">Approve ✓</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div className="p-5 space-y-4">
              {task.checklist.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">{checkedCount}/{task.checklist.length} completed</span>
                    <span className="text-violet-400">{checklistPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>
                </div>
              )}

              {task.checklist.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No checklist items</p>
                  <p className="text-xs mt-1">Items added by admin will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {task.checklist.map(chk => (
                    <label
                      key={chk.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                        chk.isChecked
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                        chk.isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-violet-500'
                      }`}>
                        {chk.isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={chk.isChecked}
                        onChange={() => onToggleChecklist(task.id, chk.id)}
                        className="sr-only"
                      />
                      <span className={`text-sm leading-snug ${chk.isChecked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                        {chk.item}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="p-5 flex flex-col gap-4">
              <div className="space-y-3 flex-1">
                {task.comments.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">No comments yet</p>
                    <p className="text-xs mt-1">Start the conversation below</p>
                  </div>
                ) : (
                  task.comments.map(com => {
                    const sender = [{ id: user.id, name: user.name, avatarUrl: user.avatarUrl }].find(p => p.id === com.profileId)
                      || { id: com.profileId, name: 'Team Member', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=x' };
                    return (
                      <div key={com.id} className="flex gap-3">
                        <img src={sender.avatarUrl} alt={sender.name} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-300">{sender.name}</span>
                            <span className="text-[10px] text-slate-600">{new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 leading-relaxed">
                            {com.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment box */}
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) { onAddComment(task.id, commentText); setCommentText(''); } }}
                    placeholder="Write a comment… (Enter to send)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500 placeholder-slate-600"
                  />
                  <button
                    onClick={() => { if (commentText.trim()) { onAddComment(task.id, commentText); setCommentText(''); } }}
                    className="bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-xl transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="p-5 space-y-2">
              {task.timeline.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No timeline events yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-800" />
                  <div className="space-y-4">
                    {[...task.timeline].reverse().map((tl, i) => {
                      const actor = [{ id: user.id, name: user.name }].find(p => p.id === tl.profileId);
                      return (
                        <div key={tl.id} className="flex gap-4 relative">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 z-10">
                            <Activity className="w-3 h-3 text-violet-400" />
                          </div>
                          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                            <p className="text-sm text-slate-300 font-semibold">{tl.action}</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {actor ? actor.name : 'System'} · {new Date(tl.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  label, count, icon, gradient, borderColor, textColor, onClick, active
}: {
  label: string; count: number; icon: React.ReactNode;
  gradient: string; borderColor: string; textColor: string;
  onClick: () => void; active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer group relative overflow-hidden ${
        active ? `${gradient} ${borderColor} shadow-lg scale-[1.02]` : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`} />
      <div className="relative z-10">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${active ? 'bg-white/15' : 'bg-slate-800/80'}`}>
          <span className={textColor}>{icon}</span>
        </div>
        <p className="text-3xl font-extrabold text-white mb-1">{count}</p>
        <p className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-white/80' : 'text-slate-500'}`}>{label}</p>
      </div>
    </button>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, projects, onClick }: { task: Task; projects: Project[]; onClick: () => void }) {
  const project = projects.find(p => p.id === task.projectId);
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed';

  return (
    <div
      onClick={onClick}
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge priority={task.priority} />
          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle className="w-3 h-3" /> Overdue
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-white leading-snug mb-2 group-hover:text-violet-200 transition-colors">{task.name}</h4>

      {/* Project & Dept */}
      {project && (
        <p className="text-[11px] text-slate-500 mb-3 flex items-center gap-1">
          <Layers className="w-3 h-3" /> {project.name}
        </p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-bold mb-1">
          <span className="text-slate-500">Progress</span>
          <span className="text-slate-400">{task.progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-violet-600 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <StatusChip status={task.status} />
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Calendar className="w-3 h-3" />
          <span className={isOverdue ? 'text-red-400 font-bold' : ''}>{task.deadline || 'No deadline'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Widget ──────────────────────────────────────────────────────────
function CalendarWidget({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-violet-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">7-Day Overview</h3>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {weekDays.map(d => {
          const ds = d.toISOString().split('T')[0];
          const dayTasks = tasks.filter(t => t.deadline === ds);
          const isToday = ds === todayStr;
          const hasOverdue = dayTasks.some(t => t.status !== 'Completed');
          return (
            <div key={ds} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-slate-600 font-bold">{d.toLocaleDateString('en', { weekday: 'short' })}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                isToday ? 'bg-violet-600 text-white' :
                hasOverdue ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                dayTasks.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'text-slate-600'
              }`}>
                {d.getDate()}
              </div>
              {dayTasks.length > 0 && (
                <div className={`w-1.5 h-1.5 rounded-full ${hasOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Today's tasks */}
      <div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Due Today</p>
        {tasks.filter(t => t.deadline === todayStr).length === 0 ? (
          <p className="text-xs text-slate-600 italic">Nothing due today 🎉</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.filter(t => t.deadline === todayStr).slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_CONFIG[t.status]?.dot || 'bg-slate-500'}`} />
                <span className="text-slate-300 truncate">{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed({ tasks, user }: { tasks: Task[]; user: Profile }) {
  const recentEvents = tasks
    .flatMap(t => t.timeline.map(tl => ({ ...tl, taskName: t.name, taskId: t.id })))
    .filter(tl => tl.profileId === user.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const getEventIcon = (action: string) => {
    if (action.toLowerCase().includes('complet')) return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (action.toLowerCase().includes('submit') || action.toLowerCase().includes('review')) return <Send className="w-3.5 h-3.5 text-violet-400" />;
    if (action.toLowerCase().includes('start') || action.toLowerCase().includes('work')) return <Play className="w-3.5 h-3.5 text-blue-400" />;
    if (action.toLowerCase().includes('reject')) return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    if (action.toLowerCase().includes('approv')) return <Award className="w-3.5 h-3.5 text-amber-400" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Activity</h3>
      </div>
      {recentEvents.length === 0 ? (
        <p className="text-xs text-slate-600 italic text-center py-4">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {recentEvents.map((ev, i) => (
            <div key={`${ev.id}-${i}`} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                {getEventIcon(ev.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 font-medium leading-snug">{ev.action}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 truncate">{ev.taskName}</p>
              </div>
              <span className="text-[9px] text-slate-600 shrink-0 mt-0.5">
                {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center">
          <Inbox className="w-12 h-12 text-violet-500/60" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
          <span className="text-sm">✨</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No Tasks Assigned</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
        You currently don't have any assigned tasks. Once an administrator assigns one, it will appear here automatically.
      </p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
      >
        <RefreshCw className="w-4 h-4" /> Refresh Dashboard
      </button>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function EmployeeDashboardPage() {
  const {
    user, isClockedIn, isOnBreak,
    triggerClockIn, triggerClockOut, triggerBreak,
    refreshDbState, dbVersion
  } = useDashboard();

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Avatar modal
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');

  // Senior approvals modal (preserved)
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [seniorApprovalComments, setSeniorApprovalComments] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewAvatarUrl(reader.result as string);
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

  const dbData = getDb();
  const pendingApprovals = user ? dbData.tasks.filter(t => t.seniorId === user.id && (t.status === 'Senior Review' || t.status === 'Review Requested')) : [];
  const pendingApprovalsCount = pendingApprovals.length;

  const handleQuickSeniorReview = (taskId: string, action: 'approve' | 'changes') => {
    if (!user) return;
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      if (action === 'approve') {
        task.status = 'Admin Verification';
        task.rejectionReason = null;
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Quick Approved by Senior from Dashboard', profileId: user.id, timestamp: new Date().toISOString() });
        addActivityLog(user.id, 'Senior Task Approve', `Quick approved task: ${task.name}`);
      } else {
        task.status = 'Rejected';
        task.rejectionReason = seniorApprovalComments || 'Changes requested by Senior reviewer.';
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Changes Requested by Senior from Dashboard', profileId: user.id, timestamp: new Date().toISOString() });
        addActivityLog(user.id, 'Senior Task Revision Request', `Requested revisions for task: ${task.name}`);
      }
      saveDb(db);
      setSeniorApprovalComments('');
      refreshDbState();
    }
  };

  // Drawer handlers (preserved logic)
  const handleUpdateStatus = (taskId: string, status: Task['status']) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      db.tasks[idx].status = status;
      db.tasks[idx].timeline.push({ id: `tl-${Date.now()}`, action: `Moved status to ${status}`, profileId: user!.id, timestamp: new Date().toISOString() });
      addActivityLog(user!.id, 'Update Task Status', `Status of task "${db.tasks[idx].name}" set to ${status}`);
      saveDb(db); refreshDbState();
    }
  };

  const handleToggleChecklist = (taskId: string, itemId: string) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.checklist = task.checklist.map(item => item.id === itemId ? { ...item, isChecked: !item.isChecked } : item);
      const checked = task.checklist.filter(c => c.isChecked).length;
      task.progress = task.checklist.length > 0 ? Math.round((checked / task.checklist.length) * 100) : task.progress;
      saveDb(db); refreshDbState();
    }
  };

  const handleAddComment = (taskId: string, text: string) => {
    if (!text.trim()) return;
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      db.tasks[idx].comments.push({ id: `com-${Date.now()}`, profileId: user!.id, content: text, createdAt: new Date().toISOString() });
      saveDb(db); refreshDbState();
    }
  };

  const handleSubmitWork = (taskId: string, notes: string) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      db.tasks[idx].status = 'Review Requested';
      db.tasks[idx].submissionNotes = notes;
      db.tasks[idx].timeline.push({ id: `tl-${Date.now()}`, action: 'Submitted Work for Senior Review', profileId: user!.id, timestamp: new Date().toISOString() });
      saveDb(db); refreshDbState();
    }
  };

  const handleSeniorReview = (taskId: string, action: 'approve' | 'changes' | 'reject', comments: string) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      if (action === 'approve') {
        task.status = 'Admin Verification';
        task.rejectionReason = null;
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Approved by Department Senior', profileId: user!.id, timestamp: new Date().toISOString() });
      } else if (action === 'changes') {
        task.status = 'Rejected';
        task.rejectionReason = comments || 'Changes requested by Senior reviewer.';
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Changes Requested by Senior', profileId: user!.id, timestamp: new Date().toISOString() });
      } else {
        task.status = 'Assigned';
        task.rejectionReason = comments || 'Work rejected by Senior reviewer.';
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Rejected by Senior reviewer', profileId: user!.id, timestamp: new Date().toISOString() });
      }
      saveDb(db); refreshDbState();
    }
  };

  const handleProgressChange = (taskId: string, val: number) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) { db.tasks[idx].progress = val; saveDb(db); refreshDbState(); }
  };

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const tasks = db.tasks.filter(t => t.assigneeIds.includes(user.id) || t.seniorId === user.id);
    setMyTasks(tasks);
    setMyProjects(db.projects.filter(p => p.departmentId === user.departmentId));
    setAllProfiles(db.profiles);
    setAnnouncements(db.announcements.slice(0, 4));

    if (selectedTask) {
      const refreshed = db.tasks.find(t => t.id === selectedTask.id) || null;
      setSelectedTask(refreshed);
    }
  }, [user, dbVersion]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  // Stats
  const myAssignedTasks = myTasks.filter(t => t.assigneeIds.includes(user.id));
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = {
    assigned: myAssignedTasks.length,
    inProgress: myAssignedTasks.filter(t => t.status === 'Working').length,
    underReview: myAssignedTasks.filter(t => ['Review Requested', 'Senior Review', 'Admin Verification'].includes(t.status)).length,
    completed: myAssignedTasks.filter(t => t.status === 'Completed').length,
    upcoming: myAssignedTasks.filter(t => t.deadline >= todayStr && t.status !== 'Completed').length,
  };

  const filteredTasks = filterStatus === 'assigned' ? myAssignedTasks.filter(t => !['Working','Review Requested','Senior Review','Admin Verification','Completed'].includes(t.status))
    : filterStatus === 'inProgress' ? myAssignedTasks.filter(t => t.status === 'Working')
    : filterStatus === 'underReview' ? myAssignedTasks.filter(t => ['Review Requested','Senior Review','Admin Verification'].includes(t.status))
    : filterStatus === 'completed' ? myAssignedTasks.filter(t => t.status === 'Completed')
    : filterStatus === 'upcoming' ? myAssignedTasks.filter(t => t.deadline >= todayStr && t.status !== 'Completed')
    : myAssignedTasks;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent border border-violet-500/20 p-6 rounded-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_70%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer shrink-0" onClick={() => { setNewAvatarUrl(user.avatarUrl); setAvatarModalOpen(true); }}>
              <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-violet-500/40 group-hover:opacity-80 transition-all" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl transition-all">
                <span className="text-[9px] text-white font-bold">Edit</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-violet-400 font-bold uppercase tracking-widest mb-0.5">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋</p>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{user.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{user.designation} · {user.departmentId ? 'Department Active' : 'No Department'}</p>
            </div>
          </div>

          {/* Clock In/Out */}
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-2xl shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</p>
              <p className={`text-xs font-bold ${isClockedIn ? (isOnBreak ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-400'}`}>
                {isClockedIn ? (isOnBreak ? '☕ On Break' : '🟢 Active') : '⚫ Offline'}
              </p>
            </div>
            <div className="flex gap-2">
              {!isClockedIn ? (
                <button onClick={() => triggerClockIn()} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-lg hover:shadow-violet-500/20">
                  <Play className="w-3.5 h-3.5" /> Clock In
                </button>
              ) : (
                <>
                  <button onClick={() => triggerBreak()} className="flex items-center gap-1.5 border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                    <Coffee className="w-3.5 h-3.5" /> {isOnBreak ? 'Resume' : 'Break'}
                  </button>
                  <button onClick={() => triggerClockOut()} className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all">
                    <Square className="w-3.5 h-3.5" /> Clock Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Assigned Tasks" count={stats.assigned}
          icon={<CheckSquare className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-violet-600/20 to-indigo-600/10"
          borderColor="border-violet-500/40" textColor="text-violet-400"
          onClick={() => setFilterStatus(filterStatus === 'assigned' ? null : 'assigned')}
          active={filterStatus === 'assigned'}
        />
        <SummaryCard
          label="In Progress" count={stats.inProgress}
          icon={<Zap className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-blue-600/20 to-sky-600/10"
          borderColor="border-blue-500/40" textColor="text-blue-400"
          onClick={() => setFilterStatus(filterStatus === 'inProgress' ? null : 'inProgress')}
          active={filterStatus === 'inProgress'}
        />
        <SummaryCard
          label="Under Review" count={stats.underReview}
          icon={<Eye className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-yellow-600/20 to-amber-600/10"
          borderColor="border-yellow-500/40" textColor="text-yellow-400"
          onClick={() => setFilterStatus(filterStatus === 'underReview' ? null : 'underReview')}
          active={filterStatus === 'underReview'}
        />
        <SummaryCard
          label="Completed" count={stats.completed}
          icon={<CheckCircle className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-emerald-600/20 to-teal-600/10"
          borderColor="border-emerald-500/40" textColor="text-emerald-400"
          onClick={() => setFilterStatus(filterStatus === 'completed' ? null : 'completed')}
          active={filterStatus === 'completed'}
        />
        <SummaryCard
          label="Upcoming Deadlines" count={stats.upcoming}
          icon={<Clock className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-orange-600/20 to-red-600/10"
          borderColor="border-orange-500/40" textColor="text-orange-400"
          onClick={() => setFilterStatus(filterStatus === 'upcoming' ? null : 'upcoming')}
          active={filterStatus === 'upcoming'}
        />
      </div>

      {/* Pending Approvals Alert (for Seniors) */}
      {pendingApprovalsCount > 0 && (
        <button
          onClick={() => setApprovalsModalOpen(true)}
          className="w-full flex items-center justify-between gap-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-xl transition-all text-sm font-semibold"
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>{pendingApprovalsCount} task{pendingApprovalsCount > 1 ? 's' : ''} awaiting your senior review</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: My Tasks + Projects */}
        <div className="lg:col-span-8 space-y-6">

          {/* My Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">My Tasks</h2>
                {filterStatus && (
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-bold">
                    Filtered
                  </span>
                )}
                <span className="text-xs text-slate-500 font-semibold">({filteredTasks.length})</span>
              </div>
              {filterStatus && (
                <button
                  onClick={() => setFilterStatus(null)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear filter
                </button>
              )}
            </div>

            {myAssignedTasks.length === 0 ? (
              <EmptyState onRefresh={() => refreshDbState()} />
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm font-semibold">No tasks match this filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTasks.map(t => (
                  <TaskCard key={t.id} task={t} projects={myProjects} onClick={() => setSelectedTask(t)} />
                ))}
              </div>
            )}
          </div>

          {/* Department Projects */}
          {myProjects.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Department Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myProjects.slice(0, 4).map(p => (
                  <div key={p.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">{p.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{p.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        p.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        p.status === 'Paused' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>{p.status}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-500">Completion</span>
                        <span className="text-slate-400">{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity Feed, Calendar, Notifications */}
        <div className="lg:col-span-4 space-y-4">

          {/* Calendar widget */}
          <CalendarWidget tasks={myAssignedTasks} />

          {/* Activity Feed */}
          <ActivityFeed tasks={myTasks} user={user} />

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Corporate Circulars</h3>
              </div>
              <div className="space-y-3">
                {announcements.map(a => (
                  <div key={a.id} className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                    <h4 className="text-xs font-bold text-amber-300">{a.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Task Detail Drawer ── */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          profiles={allProfiles}
          projects={myProjects}
          user={user}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={handleUpdateStatus}
          onToggleChecklist={handleToggleChecklist}
          onAddComment={handleAddComment}
          onSubmitWork={handleSubmitWork}
          onSeniorReview={handleSeniorReview}
          onProgressChange={handleProgressChange}
        />
      )}

      {/* ── Avatar Modal (preserved) ── */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 text-foreground">
            <h3 className="font-bold text-sm text-white">Update Profile Avatar</h3>
            <div className="flex justify-center py-2">
              <img src={newAvatarUrl || user.avatarUrl} className="w-16 h-16 rounded-2xl object-cover border border-violet-500" alt="Preview" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Paste Image URL</label>
              <input type="text" value={newAvatarUrl} onChange={e => setNewAvatarUrl(e.target.value)} placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-violet-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Or Upload File</label>
              <input type="file" accept="image/*" onChange={handleFileUpload}
                className="w-full text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAvatarModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-all">Cancel</button>
              <button onClick={handleSaveAvatar} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-1.5 rounded-xl text-sm cursor-pointer transition-all">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Senior Approvals Modal (preserved logic, new UI) ── */}
      {approvalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Pending Senior Reviews
              </h3>
              <button onClick={() => setApprovalsModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingApprovals.map(t => {
                const assignee = dbData.profiles.find(p => p.id === t.assigneeIds[0]);
                const project = dbData.projects.find(p => p.id === t.projectId);
                return (
                  <div key={t.id} className="p-4 border border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{t.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {project?.name || 'Workspace'} · <span className="text-violet-400">{assignee?.name || 'Staff'}</span>
                        </p>
                      </div>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    {t.description && (
                      <div className="bg-slate-900 p-3 rounded-xl text-xs text-slate-400 border border-slate-800">{t.description}</div>
                    )}
                    {t.submissionNotes && (
                      <div className="bg-violet-500/5 border border-violet-500/15 p-3 rounded-xl text-xs text-slate-300">
                        <span className="text-violet-400 font-bold block mb-1 text-[10px] uppercase tracking-wider">Submission Notes</span>
                        {t.submissionNotes}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/50">
                      <input type="text" placeholder="Remarks for rejection (optional)..."
                        onChange={e => setSeniorApprovalComments(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500" />
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleQuickSeniorReview(t.id, 'changes')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl font-bold text-xs transition-all">Reject</button>
                        <button onClick={() => handleQuickSeniorReview(t.id, 'approve')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all">Approve ✓</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingApprovals.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/30" />
                  <p className="font-bold text-sm text-white">All tasks processed! 🎉</p>
                  <p className="text-xs mt-1">No pending approvals at this time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
