'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../DashboardContext';
import {
  getDb,
  saveDb,
  addActivityLog,
  Task,
  Profile,
  Project
} from '@/lib/database/mockDb';
import {
  LayoutGrid,
  ListTodo,
  TrendingUp,
  Calendar,
  AlertTriangle,
  User,
  Plus,
  Clock,
  MessageCircle,
  Paperclip,
  CheckCircle2,
  Trash2,
  X,
  Play,
  CheckSquare,
  ChevronRight,
  Sparkles,
  Edit2
} from 'lucide-react';

export default function ProjectTasks() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [db, setDb] = useState(getDb());
  
  // View states
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'gantt' | 'calendar'>('kanban');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  
  // Selected task modal details state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Task detail inputs
  const [newCommentText, setNewCommentText] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [logHoursInput, setLogHoursInput] = useState('');
  
  // Attachment simulator helper
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  if (!user) return null;

  // Filter tasks based on project
  const tasksFiltered = db.tasks.filter(t => {
    if (selectedProjectId === 'all') return true;
    return t.projectId === selectedProjectId;
  });

  const selectedTask = db.tasks.find(t => t.id === selectedTaskId) || null;

  // Kanban columns mapping
  const columns = [
    { id: 'To Do', title: 'To Do', color: 'border-slate-700 bg-slate-900/10' },
    { id: 'In Progress', title: 'In Progress', color: 'border-blue-500/30 bg-blue-500/5' },
    { id: 'Review', title: 'Review', color: 'border-amber-500/30 bg-amber-500/5' },
    { id: 'Completed', title: 'Completed', color: 'border-emerald-500/30 bg-emerald-500/5' }
  ] as const;

  // Kanban status changer helper
  const moveTaskStatus = (taskId: string, newStatus: Task['status']) => {
    const currentDb = getDb();
    const taskIdx = currentDb.tasks.findIndex(t => t.id === taskId);
    if (taskIdx !== -1) {
      const task = currentDb.tasks[taskIdx];
      const prevStatus = task.status;
      task.status = newStatus;
      
      // Compute progress
      if (newStatus === 'Completed') {
        task.progress = 100;
        // Mark all subtasks complete
        task.subtasks.forEach(s => s.isCompleted = true);
      } else if (prevStatus === 'Completed') {
        task.progress = 50;
      }

      // Add timeline event
      task.timeline.unshift({
        id: `tl-${Date.now()}`,
        action: `Moved task status from "${prevStatus}" to "${newStatus}"`,
        profileId: user.id,
        timestamp: new Date().toISOString()
      });

      addActivityLog(user.id, 'Task Status Changed', `Modified status of task "${task.name}" to ${newStatus}`);
      saveDb(currentDb);
      refreshDbState();
    }
  };

  // Add Comment on Task
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    const currentDb = getDb();
    const taskIdx = currentDb.tasks.findIndex(t => t.id === selectedTask.id);
    if (taskIdx !== -1) {
      const commentId = `c-${Date.now()}`;
      currentDb.tasks[taskIdx].comments.push({
        id: commentId,
        profileId: user.id,
        content: newCommentText,
        createdAt: new Date().toISOString()
      });

      currentDb.tasks[taskIdx].timeline.unshift({
        id: `tl-${Date.now()}`,
        action: `Added comment: "${newCommentText.slice(0, 30)}..."`,
        profileId: user.id,
        timestamp: new Date().toISOString()
      });

      // Notify other assignees if not user
      const otherAssignees = currentDb.tasks[taskIdx].assigneeIds.filter(id => id !== user.id);
      otherAssignees.forEach(assigneeId => {
        currentDb.notifications.unshift({
          id: `notif-${Date.now()}-${assigneeId}`,
          profileId: assigneeId,
          title: 'New Comment on Task',
          body: `${user.name} commented on: "${selectedTask.name}"`,
          type: 'task',
          isRead: false,
          referenceId: selectedTask.id,
          createdAt: new Date().toISOString()
        });
      });

      saveDb(currentDb);
      setNewCommentText('');
      refreshDbState();
    }
  };

  // Toggle subtask status
  const handleToggleSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    const currentDb = getDb();
    const taskIdx = currentDb.tasks.findIndex(t => t.id === selectedTask.id);
    if (taskIdx !== -1) {
      const task = currentDb.tasks[taskIdx];
      const subtaskIdx = task.subtasks.findIndex(s => s.id === subtaskId);
      if (subtaskIdx !== -1) {
        task.subtasks[subtaskIdx].isCompleted = !task.subtasks[subtaskIdx].isCompleted;
        
        // Recompute progress percentage
        const completedCount = task.subtasks.filter(s => s.isCompleted).length;
        task.progress = Math.round((completedCount / task.subtasks.length) * 100);

        task.timeline.unshift({
          id: `tl-${Date.now()}`,
          action: `Toggled subtask: "${task.subtasks[subtaskIdx].name}"`,
          profileId: user.id,
          timestamp: new Date().toISOString()
        });

        saveDb(currentDb);
        refreshDbState();
      }
    }
  };

  // Add Subtask
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim() || !selectedTask) return;

    const currentDb = getDb();
    const taskIdx = currentDb.tasks.findIndex(t => t.id === selectedTask.id);
    if (taskIdx !== -1) {
      const task = currentDb.tasks[taskIdx];
      task.subtasks.push({
        id: `sub-${Date.now()}`,
        name: newSubtaskText,
        isCompleted: false
      });

      // Recalculate progress
      const completedCount = task.subtasks.filter(s => s.isCompleted).length;
      task.progress = Math.round((completedCount / task.subtasks.length) * 100);

      task.timeline.unshift({
        id: `tl-${Date.now()}`,
        action: `Added subtask: "${newSubtaskText}"`,
        profileId: user.id,
        timestamp: new Date().toISOString()
      });

      saveDb(currentDb);
      setNewSubtaskText('');
      refreshDbState();
    }
  };

  // Log Hours on Task
  const handleLogHours = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursVal = parseFloat(logHoursInput);
    if (isNaN(hoursVal) || hoursVal <= 0 || !selectedTask) return;

    const currentDb = getDb();
    const taskIdx = currentDb.tasks.findIndex(t => t.id === selectedTask.id);
    if (taskIdx !== -1) {
      const task = currentDb.tasks[taskIdx];
      task.actualHours = (task.actualHours || 0) + hoursVal;

      task.timeline.unshift({
        id: `tl-${Date.now()}`,
        action: `Logged ${hoursVal} hours of work time.`,
        profileId: user.id,
        timestamp: new Date().toISOString()
      });

      addActivityLog(user.id, 'Task Time Logged', `Logged ${hoursVal} hours on task "${task.name}"`);
      saveDb(currentDb);
      setLogHoursInput('');
      refreshDbState();
    }
  };

  // Accept / Reject task
  const handleAcceptRejectTask = (isAccept: boolean) => {
    if (!selectedTask) return;
    const currentDb = getDb();
    const taskIdx = currentDb.tasks.findIndex(t => t.id === selectedTask.id);
    if (taskIdx !== -1) {
      const task = currentDb.tasks[taskIdx];
      
      const actionText = isAccept ? 'Accepted the task assignment' : 'Rejected the task assignment';
      task.timeline.unshift({
        id: `tl-${Date.now()}`,
        action: actionText,
        profileId: user.id,
        timestamp: new Date().toISOString()
      });

      // If rejected, remove user from assignee list
      if (!isAccept) {
        task.assigneeIds = task.assigneeIds.filter(id => id !== user.id);
      }

      addActivityLog(user.id, 'Task Action', `${actionText} for task "${task.name}"`);
      saveDb(currentDb);
      refreshDbState();
      if (!isAccept) {
        setSelectedTaskId(null); // Close modal since they are no longer assigned
      }
    }
  };

  // Simulate file upload attachments on task detail
  const handleSimulateAttachmentUpload = () => {
    if (!selectedTask) return;
    setIsUploading(true);
    setTimeout(() => {
      const currentDb = getDb();
      const taskIdx = currentDb.tasks.findIndex(t => t.id === selectedTask.id);
      if (taskIdx !== -1) {
        const task = currentDb.tasks[taskIdx];
        task.attachments.push({
          id: `att-${Date.now()}`,
          name: 'Task_Reference_Asset.png',
          url: '#',
          size: '640 KB',
          type: 'image',
          uploadedBy: user.name,
          uploadedAt: new Date().toISOString()
        });

        task.timeline.unshift({
          id: `tl-${Date.now()}`,
          action: 'Uploaded file: Task_Reference_Asset.png',
          profileId: user.id,
          timestamp: new Date().toISOString()
        });

        saveDb(currentDb);
        setIsUploading(false);
        refreshDbState();
      }
    }, 1000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. VIEW FILTER AND HEADER AREA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
        
        {/* Project selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Workspace:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-350 outline-none focus:border-violet-500 appearance-none"
          >
            <option value="all">All Corporate Projects</option>
            {db.projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* View selection tabs */}
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
          {[
            { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
            { id: 'list', label: 'Grid List', icon: ListTodo },
            { id: 'gantt', label: 'Gantt Chart', icon: TrendingUp },
            { id: 'calendar', label: 'Calendar', icon: Calendar }
          ].map(view => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === view.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {view.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* ==================================================== */}
      {/* 2. CHOSEN SUBVIEW AREA */}
      {/* ==================================================== */}

      {/* KANBAN VIEW */}
      {activeView === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {columns.map(col => {
            const colTasks = tasksFiltered.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="space-y-4">
                <div className={`p-3 border-b-2 rounded-xl flex items-center justify-between text-xs font-bold text-white bg-slate-900/20 ${col.color}`}>
                  <span>{col.title}</span>
                  <span className="bg-slate-950/65 px-2 py-0.5 rounded border border-slate-800 text-[10px] text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[500px] bg-slate-950/20 p-2.5 rounded-xl border border-slate-850/40">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-10 text-slate-600 text-[10px]">
                      No tasks in this column.
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const assigneeList = db.profiles.filter(p => task.assigneeIds.includes(p.id));
                      const subtaskCompleted = task.subtasks.filter(s => s.isCompleted).length;
                      const hasSubtasks = task.subtasks.length > 0;
                      
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="group p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all space-y-3 text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              task.priority === 'Urgent' ? 'bg-red-500/10 text-red-400 border-red-500/25' :
                              task.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-slate-800 text-slate-400 border-slate-750'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">Est: {task.estimatedHours}h</span>
                          </div>

                          <h3 className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-2">
                            {task.name}
                          </h3>

                          {/* Subtask checklist progress */}
                          {hasSubtasks && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                                <span>CHECKLIST</span>
                                <span>{subtaskCompleted}/{task.subtasks.length} ({task.progress}%)</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1">
                                <div className="bg-violet-600 h-full rounded-full" style={{ width: `${task.progress}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-slate-800/40 pt-2.5 mt-2.5">
                            <span className="text-[9px] text-slate-500 font-mono">
                              ⏳ {new Date(task.deadline).toLocaleDateString()}
                            </span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {assigneeList.map(a => (
                                <img
                                  key={a.id}
                                  src={a.avatarUrl}
                                  alt={a.name}
                                  className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-slate-900 object-cover"
                                  title={a.name}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Quick drag/move dropdown shortcuts */}
                          <div className="flex gap-1.5 pt-2 border-t border-slate-800/25 opacity-0 group-hover:opacity-100 transition-opacity">
                            {columns.filter(c => c.id !== task.status).map(c => (
                              <button
                                key={c.id}
                                onClick={(e) => { e.stopPropagation(); moveTaskStatus(task.id, c.id); }}
                                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-1 py-0.5 rounded text-[8px] text-slate-400 uppercase font-semibold"
                              >
                                → {c.title.replace('In ', '')}
                              </button>
                            ))}
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* GRID LIST VIEW */}
      {activeView === 'list' && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3">Task Name</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assignees</th>
                  <th className="p-3">Timeline</th>
                  <th className="p-3">Logged Hours</th>
                  <th className="p-3 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tasksFiltered.map(task => {
                  const assignees = db.profiles.filter(p => task.assigneeIds.includes(p.id));
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="hover:bg-slate-900/40 cursor-pointer transition-all"
                    >
                      <td className="p-3 font-semibold text-slate-200">{task.name}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          task.priority === 'Urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          task.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-semibold ${
                          task.status === 'Completed' ? 'text-emerald-450' : 'text-slate-400'
                        }`}>{task.status}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {assignees.map(a => (
                            <img key={a.id} src={a.avatarUrl} alt={a.name} className="w-5 h-5 rounded-full object-cover" title={a.name} />
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">
                        {new Date(task.startDate).toLocaleDateString()} - {new Date(task.deadline).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-slate-350">{task.actualHours || 0} / {task.estimatedHours} hrs</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{task.progress}%</span>
                          <div className="w-16 bg-slate-950 rounded-full h-1">
                            <div className="bg-violet-650 h-full rounded-full" style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GANTT TIMELINE CHART */}
      {activeView === 'gantt' && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 backdrop-blur-md space-y-4 overflow-x-auto min-w-[700px]">
          
          {/* Gantt Header Columns */}
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-800">
            <div className="col-span-4">Active Task Project</div>
            <div className="col-span-1 text-center">Jul 1-5</div>
            <div className="col-span-1 text-center">Jul 6-10</div>
            <div className="col-span-1 text-center">Jul 11-15</div>
            <div className="col-span-1 text-center">Jul 16-20</div>
            <div className="col-span-1 text-center">Jul 21-25</div>
            <div className="col-span-1 text-center">Jul 26-30</div>
            <div className="col-span-1 text-center">Aug 1-5</div>
            <div className="col-span-1 text-center">Aug 6+</div>
          </div>

          <div className="space-y-4.5 pt-2">
            {tasksFiltered.map(task => {
              // Determine visual bar spanning based on deadline date (very simple mockup Gantt mapping)
              // Maps task.id to specific grid span
              const deadlineDate = new Date(task.deadline);
              const day = deadlineDate.getDate();
              
              let spanStyle = 'col-start-5 col-span-3'; // default fallback
              if (day <= 5) spanStyle = 'col-start-5 col-span-1';
              else if (day <= 10) spanStyle = 'col-start-5 col-span-2';
              else if (day <= 15) spanStyle = 'col-start-6 col-span-2';
              else if (day <= 20) spanStyle = 'col-start-7 col-span-2';
              else if (day <= 25) spanStyle = 'col-start-7 col-span-3';
              else if (day <= 30) spanStyle = 'col-start-8 col-span-3';
              else spanStyle = 'col-start-8 col-span-4';

              const barColor =
                task.status === 'Completed' ? 'bg-emerald-600/40 border-emerald-500 text-emerald-300' :
                task.status === 'In Progress' ? 'bg-blue-600/40 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400';

              return (
                <div key={task.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-4 min-w-0 pr-4">
                    <p className="font-bold text-slate-200 truncate">{task.name}</p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">Status: {task.status}</p>
                  </div>
                  
                  <div className={`py-2 px-3 border rounded-lg text-[9px] font-bold text-center truncate cursor-pointer transition-all ${spanStyle} ${barColor}`} onClick={() => setSelectedTaskId(task.id)}>
                    {task.progress}% complete
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* CALENDAR VIEW */}
      {activeView === 'calendar' && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 backdrop-blur-md text-slate-200">
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">July 2026</h3>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-500 uppercase pb-2 border-b border-slate-800">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {/* Pad blank slots for July 2026 (Starts on Wednesday -> 3 blank slots) */}
            <div className="h-20 bg-slate-950/20 border border-slate-900/50 rounded-lg p-1.5" />
            <div className="h-20 bg-slate-950/20 border border-slate-900/50 rounded-lg p-1.5" />
            <div className="h-20 bg-slate-950/20 border border-slate-900/50 rounded-lg p-1.5" />
            
            {Array.from({ length: 31 }).map((_, index) => {
              const dateVal = index + 1;
              const dateStr = `2026-07-${dateVal.toString().padStart(2, '0')}`;
              
              // Find matching deadline tasks
              const deadlineTasks = tasksFiltered.filter(t => t.deadline.startsWith(dateStr));
              
              return (
                <div key={index} className="h-24 bg-slate-950/40 border border-slate-850 rounded-lg p-1.5 flex flex-col justify-between text-left group">
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-white">{dateVal}</span>
                  
                  <div className="space-y-1 overflow-y-auto max-h-[50px] mt-1 pr-0.5">
                    {deadlineTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`text-[8px] px-1 py-0.5 rounded truncate font-semibold border cursor-pointer ${
                          t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-violet-950/40 text-violet-300 border-violet-500/20'
                        }`}
                        title={t.name}
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 🚀 TASK MODAL DETAILS OVERLAY */}
      {/* ==================================================== */}
      {selectedTaskId && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in text-slate-200">
            
            {/* Header info bar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="min-w-0 pr-4">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">TASK SPECIFICATION RECORD</span>
                <h2 className="text-sm font-bold text-white mt-1 truncate">{selectedTask.name}</h2>
              </div>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-slate-450 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scroll area split columns */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COL - Details parameters - 7 cols */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scope Description</h3>
                  <p className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs text-slate-300 leading-relaxed">
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>

                {/* Subtask checklist progress */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtask Checklist</h3>
                    <span className="text-[10px] text-violet-400 font-semibold">{selectedTask.progress}% Complete</span>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {selectedTask.subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 p-2 bg-slate-950/20 border border-slate-850 rounded-lg">
                        <input
                          type="checkbox"
                          checked={sub.isCompleted}
                          onChange={() => handleToggleSubtask(sub.id)}
                          className="rounded border-slate-800 text-violet-600 focus:ring-violet-500 bg-slate-950"
                        />
                        <span className={`text-xs ${sub.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {sub.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddSubtask} className="flex gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="Add new subtask item..."
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-white outline-none focus:border-violet-550"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskText.trim()}
                      className="bg-violet-650 hover:bg-violet-550 text-white font-bold text-[11px] px-3.5 rounded-lg shrink-0 disabled:opacity-40"
                    >
                      Add Item
                    </button>
                  </form>
                </div>

                {/* File attachments */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attachments</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTask.attachments.map(att => (
                      <div key={att.id} className="p-2 rounded-lg border border-slate-850 bg-slate-950/20 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-350 truncate">{att.name}</p>
                          <p className="text-[9px] text-slate-500">{att.size}</p>
                        </div>
                        <a href="#" className="text-[10px] text-violet-400 font-bold shrink-0">Download</a>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSimulateAttachmentUpload}
                    disabled={isUploading}
                    className="mt-3 text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading file...' : '📎 Attach Mock File'}
                  </button>
                </div>

                {/* Task History timeline logs */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Audit Timeline History</h3>
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {selectedTask.timeline.map(tl => (
                      <div key={tl.id} className="flex gap-2 text-[10px] text-slate-450 leading-relaxed">
                        <span className="font-semibold text-slate-300 truncate max-w-[100px]">{db.profiles.find(p => p.id === tl.profileId)?.name || 'Admin'}</span>
                        <span className="text-slate-500 shrink-0">•</span>
                        <span className="flex-1">{tl.action}</span>
                        <span className="text-slate-600 shrink-0">{new Date(tl.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COL - Task status controls & Comments - 5 cols */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Employee Accept/Reject controls */}
                {selectedTask.assigneeIds.includes(user.id) && (
                  <div className="p-4 bg-violet-950/20 border border-violet-500/25 rounded-xl space-y-3">
                    <p className="text-xs text-violet-300 font-semibold leading-relaxed">
                      📢 You are assigned as a member on this task. Would you like to update your acceptance status?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRejectTask(true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded text-[11px] shadow"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleAcceptRejectTask(false)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded text-[11px] border border-slate-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Parameters panel metadata */}
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Status</span>
                    <span className="font-semibold text-white">{selectedTask.status}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deadline Target</span>
                    <span className="font-semibold text-white">{new Date(selectedTask.deadline).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Effort</span>
                    <span className="font-semibold text-white">{selectedTask.estimatedHours} hrs</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Logged Effort</span>
                    <span className="font-semibold text-white">{selectedTask.actualHours || 0} hrs</span>
                  </div>

                  {/* Log time form */}
                  <form onSubmit={handleLogHours} className="flex gap-2 pt-2 border-t border-slate-800/40">
                    <input
                      type="number"
                      placeholder="Add hours..."
                      step="0.5"
                      value={logHoursInput}
                      onChange={(e) => setLogHoursInput(e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-850 rounded-lg p-1.5 text-xs text-white outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!logHoursInput}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-[10px] shrink-0 border border-slate-700 disabled:opacity-40"
                    >
                      Log Hours
                    </button>
                  </form>
                </div>

                {/* Comments box */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-violet-400" /> Discussion comments ({selectedTask.comments.length})
                  </h3>
                  
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto mb-3 pr-1">
                    {selectedTask.comments.length === 0 ? (
                      <p className="text-[10px] text-slate-550 text-center py-4">No comments posted yet. Ask a question!</p>
                    ) : (
                      selectedTask.comments.map(c => {
                        const commenter = db.profiles.find(p => p.id === c.profileId);
                        return (
                          <div key={c.id} className="p-2.5 rounded-xl border border-slate-850 bg-slate-950/20 text-xs">
                            <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                              <span className="font-bold text-slate-350">{commenter?.name || 'Colleague'}</span>
                              <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-400 leading-normal">{c.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Comment text..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-violet-550"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="bg-violet-650 hover:bg-violet-550 text-white font-bold text-[10px] px-3 rounded-lg disabled:opacity-40 shrink-0"
                    >
                      Send
                    </button>
                  </form>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
