'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addActivityLog, Task, Project, Profile } from '@/lib/database/mockDb';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { Kanban, CheckCircle, Calendar, Clock, Sparkles, Send, Paperclip, MessageSquare, ShieldAlert, Award, FileText, CheckSquare, Plus, ArrowRight } from 'lucide-react';

export default function MyTasksKanbanPage() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Submission / Comment inputs
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [commentText, setCommentText] = useState('');
  const [seniorComments, setSeniorComments] = useState('');

  // AI Mocking Status
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const fetchTasks = () => {
    if (!user) return;
    const db = getDb();
    setTasks(db.tasks);
    setProjects(db.projects);
    setProfiles(db.profiles);

    // Sync selectedTask reference if active
    if (selectedTask) {
      const refreshed = db.tasks.find(t => t.id === selectedTask.id) || null;
      setSelectedTask(refreshed);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, dbVersion]);

  const handleUpdateStatus = (taskId: string, status: Task['status']) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.status = status;
      task.timeline.push({
        id: `tl-${Date.now()}`,
        action: `Moved status to ${status}`,
        profileId: user!.id,
        timestamp: new Date().toISOString()
      });
      addActivityLog(user!.id, 'Update Task Status', `Status of task "${task.name}" set to ${status}`);
      saveDb(db);
      refreshDbState();
    }
  };

  const handleToggleChecklist = (taskId: string, itemId: string) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.checklist = task.checklist.map(item =>
        item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
      );
      
      // Auto progress based on checklist
      const checked = task.checklist.filter(c => c.isChecked).length;
      const total = task.checklist.length;
      task.progress = total > 0 ? Math.round((checked / total) * 100) : task.progress;
      
      saveDb(db);
      refreshDbState();
    }
  };

  const handleAddComment = () => {
    if (!selectedTask || !commentText.trim()) return;
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === selectedTask.id);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.comments.push({
        id: `com-${Date.now()}`,
        profileId: user!.id,
        content: commentText,
        createdAt: new Date().toISOString()
      });
      saveDb(db);
      setCommentText('');
      refreshDbState();
    }
  };

  const handleSubmitWork = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTask) return;

    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === selectedTask.id);
    if (idx !== -1) {
      const task = db.tasks[idx];
      task.status = 'Review Requested';
      task.submissionNotes = submissionNotes;
      task.timeline.push({
        id: `tl-${Date.now()}`,
        action: 'Submitted Work for Senior Review',
        profileId: user!.id,
        timestamp: new Date().toISOString()
      });
      saveDb(db);
      setSubmissionNotes('');
      refreshDbState();
    }
  };

  const handleSeniorReview = (approve: 'approve' | 'changes' | 'reject') => {
    if (!selectedTask) return;
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === selectedTask.id);
    if (idx !== -1) {
      const task = db.tasks[idx];
      if (approve === 'approve') {
        task.status = 'Admin Verification';
        task.rejectionReason = null;
        task.timeline.push({
          id: `tl-${Date.now()}`,
          action: 'Approved by Department Senior',
          profileId: user!.id,
          timestamp: new Date().toISOString()
        });
      } else if (approve === 'changes') {
        task.status = 'Rejected';
        task.rejectionReason = seniorComments || 'Changes requested by Senior reviewer.';
        task.timeline.push({
          id: `tl-${Date.now()}`,
          action: 'Changes Requested by Senior',
          profileId: user!.id,
          timestamp: new Date().toISOString()
        });
      } else {
        task.status = 'Assigned'; // returns to employee
        task.rejectionReason = seniorComments || 'Work rejected by Senior reviewer.';
        task.timeline.push({
          id: `tl-${Date.now()}`,
          action: 'Rejected by Senior reviewer',
          profileId: user!.id,
          timestamp: new Date().toISOString()
        });
      }
      saveDb(db);
      setSeniorComments('');
      refreshDbState();
    }
  };

  const runAiAssistant = (mode: 'checklist' | 'time' | 'summary') => {
    if (!selectedTask) return;
    setAiLoading(true);
    setAiResult('');
    
    setTimeout(() => {
      setAiLoading(false);
      if (mode === 'checklist') {
        const items = ["1. Gather requirements log", "2. Develop architecture layout draft", "3. Perform QA & testing verification", "4. Upload logs files"];
        const db = getDb();
        const idx = db.tasks.findIndex(t => t.id === selectedTask.id);
        if (idx !== -1) {
          const task = db.tasks[idx];
          task.checklist = [
            ...task.checklist,
            ...items.map((it, i) => ({ id: `ai-chk-${Date.now()}-${i}`, item: it, isChecked: false }))
          ];
          saveDb(db);
          refreshDbState();
        }
        setAiResult("AI generated checklist inserted successfully!");
      } else if (mode === 'time') {
        setAiResult(`AI suggests Estimated Time: ${selectedTask.priority === 'Urgent' ? '8' : '4'} hours based on priority and deadline.`);
      } else {
        setAiResult("AI summary: Task is in pipeline stage. Action requested. Review dependencies.");
      }
    }, 1200);
  };

  // Define Kanban columns
  const columns: Array<{ title: string; statuses: Task['status'][] }> = [
    { title: 'Assigned / Accepted', statuses: ['Assigned', 'Accepted', 'Reopened', 'On Hold', 'Blocked'] },
    { title: 'In Progress', statuses: ['Working'] },
    { title: 'Under Review', statuses: ['Review Requested', 'Senior Review', 'QA Review', 'Admin Verification'] },
    { title: 'Completed / Done', statuses: ['Completed', 'Archived'] }
  ];

  if (!user) return null;

  // Filter tasks assigned to this employee OR tasks where this employee is the designated Senior reviewer
  const myWorkflowTasks = tasks.filter(t => t.assigneeIds.includes(user.id) || t.seniorId === user.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Enterprise Workflow Kanban</h2>
          <p className="text-xs text-slate-400 mt-1">Submit deliverables and manage quality approvals cleanly.</p>
        </div>
        <div className="bg-violet-600/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          🔄 Real-time approval updates active
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map(col => {
          const colTasks = myWorkflowTasks.filter(t => col.statuses.includes(t.status));
          return (
            <div key={col.title} className="p-4 border border-border/80 rounded-2xl bg-slate-900/10 flex flex-col min-h-[480px]">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {col.title}
                </span>
                <span className="text-[10px] bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[520px] pr-1">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-border/60 rounded-xl flex items-center justify-center text-[10px] text-slate-500">
                    Empty Column
                  </div>
                ) : (
                  colTasks.map(t => {
                    const proj = projects.find(p => p.id === t.projectId);
                    const isSeniorReviewer = t.seniorId === user.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="bg-card border border-border p-4 rounded-xl shadow-sm hover:border-violet-500/30 transition-all space-y-3 cursor-pointer select-none"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            t.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            t.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-slate-800 text-slate-450'
                          }`}>
                            {t.priority}
                          </span>
                          <span className="text-[9px] text-slate-500 truncate max-w-[120px]">
                            {proj ? proj.name : 'Sprint Board'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-foreground leading-tight">{t.name}</h4>
                        
                        <div className="space-y-1.5">
                          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-violet-650 h-full transition-all duration-300" style={{ width: `${t.progress}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                            <span>Status: {t.status}</span>
                            <span>{t.progress}%</span>
                          </div>
                        </div>

                        {isSeniorReviewer && (
                          <div className="bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[8px] px-2 py-0.5 rounded font-bold uppercase w-fit tracking-wider">
                            ⭐ Reviewer Assignment
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail workspace drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-card border-l border-border h-full w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-350 rounded-2xl">
                    {/* Drawer Header */}
            <div className="p-4 border-b border-border bg-slate-100/50 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-foreground truncate">{selectedTask.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-1">Workspace Task Panel • ID: {selectedTask.id}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-border text-foreground font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

            {/* Visual Timeline workflow status */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/40 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto text-[9px] font-bold uppercase tracking-wider shrink-0 select-none">
              <span className="text-emerald-500">Created ✔</span>
              <span className="text-slate-650">→</span>
              <span className={['Assigned', 'Working', 'Review Requested', 'Senior Review', 'Admin Verification', 'Completed'].includes(selectedTask.status) ? 'text-emerald-500' : 'text-slate-500'}>Assigned</span>
              <span className="text-slate-600">→</span>
              <span className={['Working', 'Review Requested', 'Senior Review', 'Admin Verification', 'Completed'].includes(selectedTask.status) ? 'text-emerald-500' : 'text-slate-500'}>Working</span>
              <span className="text-slate-600">→</span>
              <span className={['Review Requested', 'Senior Review', 'Admin Verification', 'Completed'].includes(selectedTask.status) ? 'text-emerald-500' : 'text-slate-500'}>Submitted</span>
              <span className="text-slate-600">→</span>
              <span className={['Pending Admin Verification', 'Completed'].includes(selectedTask.status) ? 'text-emerald-500' : 'text-slate-500'}>Senior Approved</span>
              <span className="text-slate-600">→</span>
              <span className={selectedTask.status === 'Completed' ? 'text-emerald-500' : 'text-slate-500'}>Completed</span>
              
              {selectedTask.status === 'Rejected' && (
                <span className="text-red-500 ml-auto lowercase">⚠️ Changes requested: {selectedTask.rejectionReason}</span>
              )}
            </div>

            {/* Three Column Drawer Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              
              {/* Left Panel: Task Parameters */}
              <div className="lg:col-span-3 border-r border-border p-4 overflow-y-auto space-y-4 text-xs">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Metadata</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Priority Level</label>
                    <span className="font-semibold text-foreground">{selectedTask.priority}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Deadline date</label>
                    <span className="font-semibold text-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-violet-500" /> {selectedTask.deadline}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Est. hours</label>
                    <span className="font-semibold text-foreground">{selectedTask.estimatedHours} Hours</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Status state</label>
                    <span className="bg-slate-100 dark:bg-slate-800 border border-border px-2.5 py-1 rounded-md font-bold text-slate-700 dark:text-slate-300 uppercase">{selectedTask.status}</span>
                  </div>
                </div>

                {selectedTask.description && (
                  <div className="pt-3 border-t border-border/50">
                    <label className="text-[10px] text-slate-500 block mb-1">Objectives</label>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed break-words">{selectedTask.description}</p>
                  </div>
                )}
              </div>

              {/* Center Panel: Work Submission, Checklists & Senior review */}
              <div className="lg:col-span-5 p-5 overflow-y-auto space-y-6">
                
                {/* Progress slider */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Progress Slider</h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={selectedTask.progress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const db = getDb();
                        const idx = db.tasks.findIndex(t => t.id === selectedTask.id);
                        if (idx !== -1) {
                          db.tasks[idx].progress = val;
                          saveDb(db);
                          refreshDbState();
                        }
                      }}
                      className="w-full accent-violet-600"
                    />
                    <span className="text-xs font-bold text-foreground shrink-0">{selectedTask.progress}%</span>
                  </div>
                </div>

                {/* Subtask Checklists */}
                <div className="space-y-3">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Subtask Checklist</h4>
                  {selectedTask.checklist.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No checklist items configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTask.checklist.map(chk => (
                        <label key={chk.id} className="flex items-start gap-2.5 p-2 border border-border/40 hover:bg-slate-900/10 rounded-xl cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={chk.isChecked}
                            onChange={() => handleToggleChecklist(selectedTask.id, chk.id)}
                            className="mt-0.5 accent-violet-650"
                          />
                          <span className={chk.isChecked ? 'line-through text-slate-500' : 'text-slate-300'}>{chk.item}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div> 
                
                {/* Workflow Action Transitions */}
                {selectedTask.assigneeIds.includes(user.id) && (
                  <div className="pt-4 border-t border-border/50 space-y-3">
                    <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-1">Task Progression Control</h4>
                    
                    {selectedTask.status === 'Assigned' && (
                      <div className="bg-violet-500/5 border border-violet-500/10 p-4 rounded-xl space-y-2">
                        <p className="text-[10px] text-slate-500">You have been assigned this task. Review description and accept to initialize.</p>
                        <button
                          onClick={() => handleUpdateStatus(selectedTask.id, 'Accepted')}
                          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-all"
                        >
                          Accept Task
                        </button>
                      </div>
                    )}

                    {selectedTask.status === 'Accepted' && (
                      <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl space-y-2">
                        <p className="text-[10px] text-slate-500">Task accepted. Initialize clocking-in / status progress now.</p>
                        <button
                          onClick={() => handleUpdateStatus(selectedTask.id, 'Working')}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-all"
                        >
                          Start Working
                        </button>
                      </div>
                    )}

                    {['Working', 'Rejected'].includes(selectedTask.status) && (
                      <div className="bg-violet-500/5 border border-violet-500/10 p-4 rounded-xl space-y-3">
                        <p className="text-[10px] text-slate-500">Input any links, files references, or completion notes and submit to Senior reviewer.</p>
                        <textarea
                          required
                          value={submissionNotes}
                          onChange={(e) => setSubmissionNotes(e.target.value)}
                          placeholder="Figma specs, repository pull requests, or deliverable comments..."
                          className="w-full bg-slate-900 border border-border rounded-lg p-2.5 outline-none text-white focus:border-violet-500 h-24 resize-none text-xs"
                        />
                        <button
                          onClick={() => handleSubmitWork()}
                          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Submit to Senior Reviewer <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {['Review Requested', 'Senior Review', 'Admin Verification'].includes(selectedTask.status) && (
                      <div className="p-3 border border-amber-500/25 bg-amber-500/10 rounded-xl text-center text-amber-500 text-[10px] font-bold">
                        ⏳ Under Review: Awaiting Senior/Admin Approval
                      </div>
                    )}

                    {selectedTask.status === 'Completed' && (
                      <div className="p-3 border border-emerald-500/25 bg-emerald-500/10 rounded-xl text-center text-emerald-500 text-[10px] font-bold">
                        🎉 Approved & Completed
                      </div>
                    )}
                  </div>
                )}

                {/* Senior Review Action panel */}
                {selectedTask.seniorId === user.id && selectedTask.status === 'Senior Review' && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4">
                    <h4 className="font-bold text-xs text-amber-500 flex items-center gap-1">
                      ⭐ Senior Review Dashboard
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Remarks / Rejection Comments (Required if return)</label>
                        <input
                          type="text"
                          value={seniorComments}
                          onChange={(e) => setSeniorComments(e.target.value)}
                          placeholder="e.g. Code structure adjustments needed..."
                          className="w-full bg-slate-900 border border-border rounded p-2 text-white outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSeniorReview('reject')}
                          className="bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-red-400 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleSeniorReview('changes')}
                          className="bg-slate-800 border border-border hover:bg-slate-700 text-slate-350 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => handleSeniorReview('approve')}
                          className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Panel: Discussion Feed & AI Widget */}
              <div className="lg:col-span-4 border-l border-border p-4 overflow-y-auto space-y-6 flex flex-col">
                
                {/* AI Assistant Widget */}
                <div className="p-4 bg-violet-600/5 border border-violet-500/10 rounded-2xl space-y-3 shrink-0">
                  <h4 className="font-bold text-xs text-violet-500 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-violet-500" /> AI Assistant Widget
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => runAiAssistant('checklist')}
                      className="bg-slate-850 hover:bg-slate-800 border border-border text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                    >
                      Generate Checklist
                    </button>
                    <button
                      onClick={() => runAiAssistant('time')}
                      className="bg-slate-850 hover:bg-slate-800 border border-border text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                    >
                      Estimate Time
                    </button>
                  </div>
                  {aiLoading && <div className="text-[10px] text-slate-500 animate-pulse">AI engine analyzing task context...</div>}
                  {aiResult && <div className="p-2 bg-slate-900 border border-border text-[10px] text-slate-400 rounded leading-relaxed">{aiResult}</div>}
                </div>

                {/* Discussions Feed */}
                <div className="flex-1 flex flex-col min-h-[220px]">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-3">Task Discussion</h4>
                  
                  {/* Message feed */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[250px]">
                    {selectedTask.comments.map(com => {
                      const sender = profiles.find(p => p.id === com.profileId);
                      return (
                        <div key={com.id} className="text-[11px] leading-relaxed border-b border-border/20 pb-2 last:border-0">
                          <div className="flex items-center justify-between text-slate-500 font-bold mb-0.5">
                            <span>{sender?.name || 'Staff'}</span>
                            <span>{new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-300">{com.content}</p>
                        </div>
                      );
                    })}
                    {selectedTask.comments.length === 0 && (
                      <p className="text-slate-500 text-center py-6 italic text-[10px]">No discussion threads yet.</p>
                    )}
                  </div>

                  {/* Send Comment box */}
                  <div className="pt-3 border-t border-border/50 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Comment text..."
                      className="w-full bg-slate-900 border border-border rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                    <button
                      onClick={handleAddComment}
                      className="bg-violet-650 hover:bg-violet-600 text-white p-2 rounded cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
