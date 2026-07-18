'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addActivityLog, Task, Project, Profile } from '@/lib/database/mockDb';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import {
  CheckCircle, Calendar, Clock, Sparkles, Send, MessageSquare,
  Star, CheckSquare, ArrowRight, X, Activity, Eye, ListChecks,
  BarChart2, Timer, AlertTriangle, ChevronRight, Play, Layers,
  RefreshCw, Inbox, Filter, TrendingUp, AlertCircle, Award
} from 'lucide-react';

// ─── Status & Priority helpers ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string; column?: string }> = {
  'Assigned':           { label: 'Pending',        color: 'text-purple-400',  dot: 'bg-purple-500',  bg: 'bg-purple-500/10 border-purple-500/25', column: 'pending' },
  'Accepted':           { label: 'Accepted',        color: 'text-blue-400',    dot: 'bg-blue-500',    bg: 'bg-blue-500/10 border-blue-500/25', column: 'pending' },
  'Reopened':           { label: 'Reopened',        color: 'text-indigo-400',  dot: 'bg-indigo-500',  bg: 'bg-indigo-500/10 border-indigo-500/25', column: 'pending' },
  'On Hold':            { label: 'On Hold',         color: 'text-slate-400',   dot: 'bg-slate-500',   bg: 'bg-slate-500/10 border-slate-500/25', column: 'pending' },
  'Blocked':            { label: 'Blocked',         color: 'text-red-500',     dot: 'bg-red-600',     bg: 'bg-red-500/10 border-red-500/25', column: 'pending' },
  'Rejected':           { label: 'Needs Revision',  color: 'text-red-400',     dot: 'bg-red-500',     bg: 'bg-red-500/10 border-red-500/25', column: 'inprogress' },
  'Working':            { label: 'In Progress',     color: 'text-orange-400',  dot: 'bg-orange-500',  bg: 'bg-orange-500/10 border-orange-500/25', column: 'inprogress' },
  'Review Requested':   { label: 'Under Review',    color: 'text-yellow-400',  dot: 'bg-yellow-500',  bg: 'bg-yellow-500/10 border-yellow-500/25', column: 'review' },
  'Senior Review':      { label: 'Senior Review',   color: 'text-amber-400',   dot: 'bg-amber-500',   bg: 'bg-amber-500/10 border-amber-500/25', column: 'review' },
  'QA Review':          { label: 'QA Review',       color: 'text-teal-400',    dot: 'bg-teal-500',    bg: 'bg-teal-500/10 border-teal-500/25', column: 'review' },
  'Admin Verification': { label: 'Admin Review',    color: 'text-sky-400',     dot: 'bg-sky-500',     bg: 'bg-sky-500/10 border-sky-500/25', column: 'review' },
  'Completed':          { label: 'Completed',       color: 'text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/25', column: 'done' },
  'Archived':           { label: 'Archived',        color: 'text-slate-500',   dot: 'bg-slate-600',   bg: 'bg-slate-500/10 border-slate-500/20', column: 'done' },
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

// ─── Kanban column definitions ────────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'pending',
    title: 'Pending',
    emoji: '🟣',
    statuses: ['Assigned', 'Accepted', 'Reopened', 'On Hold', 'Blocked'],
    headerColor: 'text-purple-400',
    headerBg: 'bg-purple-500/10 border-purple-500/30',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'inprogress',
    title: 'In Progress',
    emoji: '🟠',
    statuses: ['Working', 'Rejected'],
    headerColor: 'text-orange-400',
    headerBg: 'bg-orange-500/10 border-orange-500/30',
    dotColor: 'bg-orange-500',
  },
  {
    id: 'review',
    title: 'Under Review',
    emoji: '🟡',
    statuses: ['Review Requested', 'Senior Review', 'QA Review', 'Admin Verification'],
    headerColor: 'text-yellow-400',
    headerBg: 'bg-yellow-500/10 border-yellow-500/30',
    dotColor: 'bg-yellow-500',
  },
  {
    id: 'done',
    title: 'Completed',
    emoji: '🟢',
    statuses: ['Completed', 'Archived'],
    headerColor: 'text-emerald-400',
    headerBg: 'bg-emerald-500/10 border-emerald-500/30',
    dotColor: 'bg-emerald-500',
  },
];

// ─── Task Detail Drawer ───────────────────────────────────────────────────────
function TaskDetailDrawer({
  task, profiles, projects, user, onClose,
  onUpdateStatus, onToggleChecklist, onAddComment, onSubmitWork,
  onSeniorReview, onProgressChange, aiLoading, aiResult, onRunAi
}: {
  task: Task; profiles: Profile[]; projects: Project[]; user: Profile;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onToggleChecklist: (taskId: string, itemId: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onSubmitWork: (taskId: string, notes: string) => void;
  onSeniorReview: (taskId: string, action: 'approve' | 'changes' | 'reject', comments: string) => void;
  onProgressChange: (taskId: string, val: number) => void;
  aiLoading: boolean; aiResult: string;
  onRunAi: (mode: 'checklist' | 'time' | 'summary') => void;
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
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed';
  const checkedCount = task.checklist.filter(c => c.isChecked).length;
  const checklistPct = task.checklist.length > 0 ? Math.round((checkedCount / task.checklist.length) * 100) : 0;

  const WORKFLOW_STEPS = ['Created', 'Assigned', 'Working', 'Submitted', 'Senior OK', 'Completed'];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl" style={{ animation: 'slideInRight 0.25s ease-out' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-violet-600/5 to-transparent shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <PriorityBadge priority={task.priority} />
              <StatusChip status={task.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
              {isSeniorReviewer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  ⭐ Reviewer
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white leading-snug">{task.name}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {project ? `📁 ${project.name}` : '📋 General Task'} · ID: {task.id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow steps */}
        <div className="px-5 py-3 border-b border-slate-800/50 shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider overflow-x-auto">
            {WORKFLOW_STEPS.map((step, i) => {
              const done = (i === 0) ||
                           (i === 1 && ['Accepted','Working','Review Requested','Senior Review','Admin Verification','Completed'].includes(task.status)) ||
                           (i === 2 && ['Review Requested','Senior Review','Admin Verification','Completed'].includes(task.status)) ||
                           (i === 3 && ['Admin Verification','Completed'].includes(task.status)) ||
                           (i === 4 && task.status === 'Completed') ||
                           (i === 5 && task.status === 'Completed');
              const active = (i === 1 && ['Assigned'].includes(task.status)) ||
                             (i === 2 && task.status === 'Working') ||
                             (i === 3 && ['Review Requested','Senior Review'].includes(task.status)) ||
                             (i === 4 && task.status === 'Admin Verification');
              return (
                <React.Fragment key={step}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                  <span className={`whitespace-nowrap px-1.5 py-0.5 rounded ${done ? 'text-emerald-400' : active ? 'text-violet-400 animate-pulse' : 'text-slate-600'}`}>
                    {step}{done && i < 5 ? ' ✓' : ''}
                  </span>
                </React.Fragment>
              );
            })}
            {task.status === 'Rejected' && <span className="ml-2 text-red-400 whitespace-nowrap">⚠ Revision</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0 px-2 pt-2 gap-1">
          {(['details', 'checklist', 'comments', 'timeline'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold capitalize rounded-t-lg transition-all border-b-2 ${
                activeTab === tab ? 'border-violet-500 text-violet-400 bg-violet-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {tab === 'details' && <><Eye className="w-3.5 h-3.5 inline mr-1.5" />Details</>}
              {tab === 'checklist' && <><ListChecks className="w-3.5 h-3.5 inline mr-1.5" />Checklist {task.checklist.length > 0 && `(${checklistPct}%)`}</>}
              {tab === 'comments' && <><MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />Comments {task.comments.length > 0 && `(${task.comments.length})`}</>}
              {tab === 'timeline' && <><Activity className="w-3.5 h-3.5 inline mr-1.5" />Timeline</>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">

          {/* DETAILS */}
          {activeTab === 'details' && (
            <div className="p-5 space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Due Date', value: task.deadline, icon: <Calendar className="w-3.5 h-3.5 text-violet-400" />, red: !!isOverdue },
                  { label: 'Est. Hours', value: `${task.estimatedHours}h`, icon: <Timer className="w-3.5 h-3.5 text-blue-400" /> },
                  { label: 'Actual Hours', value: `${task.actualHours || 0}h`, icon: <Clock className="w-3.5 h-3.5 text-emerald-400" /> },
                  { label: 'Remaining', value: `${Math.max(0, task.estimatedHours - (task.actualHours || 0))}h`, icon: <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> },
                ].map(({ label, value, icon, red }) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span></div>
                    <p className={`text-sm font-bold ${red ? 'text-red-400' : 'text-white'}`}>{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Team */}
              {(assignees.length > 0 || senior) && (
                <div className="space-y-3">
                  {assignees.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Assigned To</p>
                      <div className="flex flex-wrap gap-2">
                        {assignees.map(a => (
                          <div key={a.id} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                            <img src={a.avatarUrl} alt={a.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-xs font-semibold text-slate-300">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
              )}

              {/* Description */}
              {task.description && (
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Description</p>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 leading-relaxed">{task.description}</div>
                </div>
              )}

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progress</p>
                  <span className="text-xs font-bold text-violet-400">{task.progress}%</span>
                </div>
                <input type="range" min="0" max="100" step="10" value={task.progress}
                  onChange={e => onProgressChange(task.id, Number(e.target.value))}
                  className="w-full accent-violet-600" />
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                </div>
              </div>

              {/* Submission notes */}
              {task.submissionNotes && (
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Submission Notes</p>
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-sm text-slate-300 leading-relaxed">{task.submissionNotes}</div>
                </div>
              )}

              {/* Rejection */}
              {task.rejectionReason && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">⚠ Revision Required</p>
                  <p className="text-sm text-red-300">{task.rejectionReason}</p>
                </div>
              )}

              {/* AI Widget */}
              <div className="p-4 bg-violet-600/5 border border-violet-500/15 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-violet-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> AI Assistant
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => onRunAi('checklist')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-300 transition-all">Generate Checklist</button>
                  <button onClick={() => onRunAi('time')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-300 transition-all">Estimate Time</button>
                </div>
                {aiLoading && <div className="text-[10px] text-violet-400 animate-pulse">AI analyzing task context…</div>}
                {aiResult && <div className="p-2.5 bg-slate-900 border border-slate-800 text-[11px] text-slate-400 rounded-lg leading-relaxed">{aiResult}</div>}
              </div>

              {/* Workflow Actions — Assignee */}
              {isAssignee && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Task Actions</p>

                  {task.status === 'Assigned' && (
                    <button onClick={() => onUpdateStatus(task.id, 'Accepted')} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                      <CheckCircle className="w-4 h-4" /> Accept Task
                    </button>
                  )}
                  {task.status === 'Accepted' && (
                    <button onClick={() => onUpdateStatus(task.id, 'Working')} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                      <Play className="w-4 h-4" /> Start Working
                    </button>
                  )}
                  {['Working', 'Rejected'].includes(task.status) && (
                    <div className="space-y-2">
                      <textarea value={submissionNotes} onChange={e => setSubmissionNotes(e.target.value)}
                        placeholder="Figma specs, repo links, or deliverable notes..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-violet-500 h-20 resize-none placeholder-slate-600" />
                      <button onClick={() => { onSubmitWork(task.id, submissionNotes); setSubmissionNotes(''); }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
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
                <div className="space-y-3 border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><Star className="w-4 h-4" /> Senior Review Panel</p>
                  <input type="text" value={seniorComments} onChange={e => setSeniorComments(e.target.value)}
                    placeholder="Remarks / revision guidelines..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500" />
                  <div className="flex gap-2">
                    <button onClick={() => { onSeniorReview(task.id, 'reject', seniorComments); setSeniorComments(''); }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-2 rounded-lg text-xs transition-all">Reject</button>
                    <button onClick={() => { onSeniorReview(task.id, 'changes', seniorComments); setSeniorComments(''); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-2 rounded-lg text-xs transition-all">Request Changes</button>
                    <button onClick={() => { onSeniorReview(task.id, 'approve', seniorComments); setSeniorComments(''); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-all">Approve ✓</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="p-5 space-y-4">
              {task.checklist.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">{checkedCount}/{task.checklist.length} completed</span>
                    <span className="text-violet-400">{checklistPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-violet-600 to-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${checklistPct}%` }} />
                  </div>
                </div>
              )}
              {task.checklist.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No checklist items</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {task.checklist.map(chk => (
                    <label key={chk.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                      chk.isChecked ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                        chk.isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-violet-500'
                      }`}>
                        {chk.isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <input type="checkbox" checked={chk.isChecked} onChange={() => onToggleChecklist(task.id, chk.id)} className="sr-only" />
                      <span className={`text-sm leading-snug ${chk.isChecked ? 'line-through text-slate-500' : 'text-slate-300'}`}>{chk.item}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMMENTS */}
          {activeTab === 'comments' && (
            <div className="p-5 flex flex-col gap-4">
              <div className="space-y-3 flex-1">
                {task.comments.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">No comments yet</p>
                  </div>
                ) : task.comments.map(com => {
                  const sender = profiles.find(p => p.id === com.profileId);
                  return (
                    <div key={com.id} className="flex gap-3">
                      <img src={sender?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=x'} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-300">{sender?.name || 'Team Member'}</span>
                          <span className="text-[10px] text-slate-600">{new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 leading-relaxed">{com.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
                <div className="flex-1 flex gap-2">
                  <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) { onAddComment(task.id, commentText); setCommentText(''); } }}
                    placeholder="Write a comment… (Enter to send)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500 placeholder-slate-600" />
                  <button onClick={() => { if (commentText.trim()) { onAddComment(task.id, commentText); setCommentText(''); } }}
                    className="bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-xl transition-all">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="p-5 space-y-2">
              {task.timeline.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No events yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-800" />
                  <div className="space-y-4">
                    {[...task.timeline].reverse().map((tl, i) => {
                      const actor = profiles.find(p => p.id === tl.profileId);
                      return (
                        <div key={tl.id} className="flex gap-4 relative">
                          <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 z-10">
                            <Activity className="w-3 h-3 text-violet-400" />
                          </div>
                          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                            <p className="text-sm text-slate-300 font-semibold">{tl.action}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{actor?.name || 'System'} · {new Date(tl.timestamp).toLocaleString()}</p>
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

// ─── Kanban Task Card ─────────────────────────────────────────────────────────
function KanbanCard({ task, projects, user, onClick }: { task: Task; projects: Project[]; user: Profile; onClick: () => void }) {
  const project = projects.find(p => p.id === task.projectId);
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed';
  const isSenior = task.seniorId === user.id;
  const checkedCount = task.checklist.filter(c => c.isChecked).length;

  return (
    <div onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group space-y-3">

      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {isSenior && (
          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">⭐ Reviewer</span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-xs font-bold text-white leading-snug group-hover:text-violet-200 transition-colors">{task.name}</h4>

      {/* Project */}
      {project && (
        <p className="text-[10px] text-slate-500 flex items-center gap-1">
          <Layers className="w-3 h-3" /> {project.name}
        </p>
      )}

      {/* Progress */}
      <div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full transition-all duration-300" style={{ width: `${task.progress}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">{task.progress}%</span>
          {task.checklist.length > 0 && (
            <span className="text-[9px] text-slate-600">{checkedCount}/{task.checklist.length} ✓</span>
          )}
        </div>
      </div>

      {/* Status & deadline */}
      <div className="flex items-center justify-between">
        <StatusChip status={task.status} />
        {task.deadline && (
          <span className={`text-[9px] font-bold flex items-center gap-0.5 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
            <Calendar className="w-3 h-3" /> {task.deadline}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyTasksKanbanPage() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // AI mock
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const fetchTasks = () => {
    if (!user) return;
    const db = getDb();
    setTasks(db.tasks);
    setProjects(db.projects);
    setProfiles(db.profiles);
    if (selectedTask) {
      const refreshed = db.tasks.find(t => t.id === selectedTask.id) || null;
      setSelectedTask(refreshed);
    }
  };

  useEffect(() => { fetchTasks(); }, [user, dbVersion]);

  // Handlers — all original logic preserved
  const handleUpdateStatus = (taskId: string, status: Task['status']) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.status = status;
      task.timeline.push({ id: `tl-${Date.now()}`, action: `Moved status to ${status}`, profileId: user!.id, timestamp: new Date().toISOString() });
      addActivityLog(user!.id, 'Update Task Status', `Status of task "${task.name}" set to ${status}`);
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

  const handleSeniorReview = (taskId: string, approve: 'approve' | 'changes' | 'reject', comments: string) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      if (approve === 'approve') {
        task.status = 'Admin Verification';
        task.rejectionReason = null;
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Approved by Department Senior', profileId: user!.id, timestamp: new Date().toISOString() });
      } else if (approve === 'changes') {
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

  const runAiAssistant = (mode: 'checklist' | 'time' | 'summary') => {
    if (!selectedTask) return;
    setAiLoading(true); setAiResult('');
    setTimeout(() => {
      setAiLoading(false);
      if (mode === 'checklist') {
        const items = ['1. Gather requirements log', '2. Develop architecture layout draft', '3. Perform QA & testing verification', '4. Upload log files'];
        const db = getDb();
        const idx = db.tasks.findIndex(t => t.id === selectedTask.id);
        if (idx !== -1) {
          db.tasks[idx].checklist = [...db.tasks[idx].checklist, ...items.map((it, i) => ({ id: `ai-chk-${Date.now()}-${i}`, item: it, isChecked: false }))];
          saveDb(db); refreshDbState();
        }
        setAiResult('AI generated checklist inserted successfully!');
      } else if (mode === 'time') {
        setAiResult(`AI suggests: ${selectedTask.priority === 'Urgent' ? '8' : '4'} hours based on priority and deadline.`);
      } else {
        setAiResult('AI summary: Task is in pipeline stage. Action requested. Review dependencies.');
      }
    }, 1200);
  };

  if (!user) return null;

  const myWorkflowTasks = tasks.filter(t => t.assigneeIds.includes(user.id) || t.seniorId === user.id);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-400" /> Enterprise Workflow Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">Submit deliverables and manage quality approvals.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-3 py-1.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time approval updates active
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const count = myWorkflowTasks.filter(t => col.statuses.includes(t.status)).length;
          return (
            <div key={col.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-2 h-8 rounded-full ${col.dotColor}`} />
              <div>
                <p className="text-2xl font-extrabold text-white">{count}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{col.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {myWorkflowTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <Inbox className="w-10 h-10 text-violet-500/40" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Tasks Assigned</h3>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">You currently don't have any assigned tasks. Once an administrator assigns one, it will appear here automatically.</p>
          <button onClick={() => refreshDbState()} className="flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh Board
          </button>
        </div>
      )}

      {/* Kanban columns */}
      {myWorkflowTasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colTasks = myWorkflowTasks.filter(t => col.statuses.includes(t.status));
            return (
              <div key={col.id} className="flex flex-col min-h-[400px]">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border mb-3 ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.emoji}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${col.headerColor}`}>{col.title}</span>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${col.headerBg} ${col.headerColor}`}>{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-slate-600 font-semibold">
                      No tasks here
                    </div>
                  ) : (
                    colTasks.map(t => (
                      <KanbanCard key={t.id} task={t} projects={projects} user={user} onClick={() => setSelectedTask(t)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          profiles={profiles}
          projects={projects}
          user={user}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={handleUpdateStatus}
          onToggleChecklist={handleToggleChecklist}
          onAddComment={handleAddComment}
          onSubmitWork={handleSubmitWork}
          onSeniorReview={handleSeniorReview}
          onProgressChange={handleProgressChange}
          aiLoading={aiLoading}
          aiResult={aiResult}
          onRunAi={runAiAssistant}
        />
      )}
    </div>
  );
}
