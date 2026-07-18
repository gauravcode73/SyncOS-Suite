'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addAuditLog, Task, Project, Profile, Department, createNotification } from '@/lib/database/mockDb';
import { CheckSquare, Plus, Trash2, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/database/supabaseClient';
import { deleteRecordFromSupabase } from '@/lib/database/supabaseSync';

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Task creation state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newProj, setNewProj] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newSenior, setNewSenior] = useState('');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [newDeadline, setNewDeadline] = useState('');
  const [newEstHours, setNewEstHours] = useState(4);
  const [newDependency, setNewDependency] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Moderation state
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [adminCorrectionReason, setAdminCorrectionReason] = useState('');

  const fetchDbData = () => {
    const db = getDb();
    setTasks(db.tasks);
    setProjects(db.projects);
    setProfiles(db.profiles);
    setDepartments(db.departments);
  };

  useEffect(() => {
    fetchDbData();
    const interval = setInterval(fetchDbData, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const db = getDb();
    
    // Parse checklist items
    const checklistItems = newChecklistText
      .split('\n')
      .filter(item => item.trim())
      .map((item, index) => ({
        id: `chk-${Date.now()}-${index}`,
        item: item.trim(),
        isChecked: false
      }));

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: newProj || null,
      name: newName,
      description: newDesc,
      priority: newPriority,
      status: 'Assigned',
      departmentId: newDept || null,
      teamId: null,
      assigneeIds: newAssignee ? [newAssignee] : [],
      seniorId: newSenior || null,
      qaReviewerId: null,
      requiresQA: false,
      rejectionReason: null,
      submissionNotes: null,
      dependencyTaskId: newDependency || null,
      startDate: new Date().toISOString().split('T')[0],
      deadline: newDeadline,
      estimatedHours: Number(newEstHours),
      actualHours: 0,
      progress: 0,
      tags: [],
      subtasks: [],
      checklist: checklistItems,
      comments: [],
      attachments: [],
      timeline: [{ id: `tl-${Date.now()}`, action: 'Task Provisioned', profileId: 'system', timestamp: new Date().toISOString() }]
    };

    db.tasks.push(newTask);
    addAuditLog('system', 'Create Advanced Task', 'tasks', newTask.id, `Created task: ${newTask.name} assigned to senior ID: ${newSenior}`);
    if (newAssignee) {
      createNotification(
        newAssignee,
        'New Task Assigned',
        `You have been assigned a new task: ${newTask.name}`,
        'normal',
        newTask.id,
        'task'
      );
    }
    if (newSenior) {
      createNotification(
        newSenior,
        'New Task Review Request',
        `You have been assigned as the senior reviewer for task: ${newTask.name}`,
        'normal',
        newTask.id,
        'task'
      );
    }
    saveDb(db);

    setTasks([...db.tasks]);
    setNewName('');
    setNewDesc('');
    setNewProj('');
    setNewAssignee('');
    setNewSenior('');
    setNewDeadline('');
    setNewEstHours(4);
    setNewDependency('');
    setNewChecklistText('');
  };

  const handleAdminVerify = (taskId: string, approve: boolean) => {
    const db = getDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = db.tasks[idx];
      if (approve) {
        task.status = 'Completed';
        task.progress = 100;
        task.rejectionReason = null;
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Admin Final Verification Approved', profileId: 'system', timestamp: new Date().toISOString() });
        addAuditLog('system', 'Admin Approve Task', 'tasks', taskId, `Approved work for task: ${task.name}`);
      } else {
        task.status = 'Rejected';
        task.rejectionReason = adminCorrectionReason || 'Admin requested adjustments.';
        task.timeline.push({ id: `tl-${Date.now()}`, action: 'Admin Requested Revisions', profileId: 'system', timestamp: new Date().toISOString() });
        addAuditLog('system', 'Admin Request Changes', 'tasks', taskId, `Returned task ${task.name} for revisions: ${adminCorrectionReason}`);
      }
      saveDb(db);
      setTasks([...db.tasks]);
      setSelectedTaskForReview(null);
      setAdminCorrectionReason('');
    }
  };

  const handleDeleteTask = (id: string) => {
    const db = getDb();
    const taskToDelete = db.tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    
    db.tasks = db.tasks.filter(t => t.id !== id);
    addAuditLog('system', 'Delete Task', 'tasks', id, `Deleted task: ${taskToDelete.name}`);
    saveDb(db);
    if (isSupabaseConfigured) {
      deleteRecordFromSupabase('tasks', id);
    }

    setTasks([...db.tasks]);
  };

  const pendingVerificationTasks = tasks.filter(t => t.status === 'Senior Review' || t.status === 'Admin Verification');
  const otherTasks = tasks.filter(t => t.status !== 'Senior Review' && t.status !== 'Admin Verification');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div>
        <h2 className="text-xl font-bold tracking-tight">Enterprise Workflow Registry</h2>
        <p className="text-xs text-slate-400 mt-1">Configure multi-stage approvals, dependencies, and verify submissions.</p>
      </div>

      {/* Verification Queue Section */}
      {pendingVerificationTasks.length > 0 && (
        <div className="bg-card border border-violet-500/20 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-violet-500 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-violet-500" />
            Pending Admin Verification Queue ({pendingVerificationTasks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVerificationTasks.map(t => {
              const senior = profiles.find(p => p.id === t.seniorId);
              const assignee = profiles.find(p => t.assigneeIds.includes(p.id));
              return (
                <div key={t.id} className="p-4 border border-border bg-slate-900/10 rounded-xl space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{t.name}</h4>
                    <p className="text-[10px] text-slate-450 mt-1">Senior: {senior?.name || 'Reviewer'} • Assignee: {assignee?.name || 'Staff'}</p>
                  </div>
                  
                  {t.submissionNotes && (
                    <div className="p-2.5 bg-slate-950/40 border border-border rounded text-[10px] text-slate-400 leading-relaxed">
                      <strong>Submission Notes:</strong> {t.submissionNotes}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTaskForReview(t)}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-3 py-1.5 rounded text-[10px] transition-all cursor-pointer"
                    >
                      Audit Submission
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Create Task Form - Left */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-2xl shadow-sm h-fit">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" />
            Provision Workflow Task
          </h3>
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Task Title</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Redesign core dashboard"
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detailed objectives..."
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500 h-20 resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department</label>
                <select
                  required
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Project Board</label>
                <select
                  value={newProj}
                  onChange={(e) => setNewProj(e.target.value)}
                  className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Assignee</label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department Senior</label>
                <select
                  value={newSenior}
                  onChange={(e) => setNewSenior(e.target.value)}
                  className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Est. Hours</label>
                <input
                  type="number"
                  value={newEstHours}
                  onChange={(e) => setNewEstHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Dependency Task</label>
              <select
                value={newDependency}
                onChange={(e) => setNewDependency(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="">No Dependency...</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Checklist Subtasks (One per line)</label>
              <textarea
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="e.g. Research&#10;Design wireframe&#10;Implement layout"
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500 h-20 resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Deadline Date</label>
              <input
                type="date"
                required
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-all cursor-pointer"
            >
              Provision Advanced Workflow
            </button>
          </form>
        </div>

        {/* Other System Tasks list - Right */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-slate-900/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">All System Tasks</h3>
            </div>
            {otherTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No other tasks currently in the system registry.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {otherTasks.map(t => {
                  const proj = projects.find(p => p.id === t.projectId);
                  const assignee = profiles.find(p => t.assigneeIds.includes(p.id));
                  return (
                    <div key={t.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/10 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.2 rounded border ${
                            t.priority === 'Urgent' ? 'bg-red-500/10 border-red-500/25 text-red-500' :
                            t.priority === 'High' ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' :
                            'bg-slate-800 text-slate-450'
                          }`}>
                            {t.priority}
                          </span>
                          <span className="text-[9px] bg-slate-900 border border-border px-2 py-0.2 rounded font-semibold text-slate-400">
                            {t.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-foreground truncate">{t.name}</h4>
                        <p className="text-[10px] text-slate-450 line-clamp-1">Assignee: {assignee ? assignee.name : 'Unassigned'} • Est: {t.estimatedHours}h</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-850 px-2 py-0.5 rounded-full">{t.progress}%</span>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-2 border border-border rounded-xl text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Admin Audit/Verification Detail Modal */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-lg text-xs space-y-4 text-foreground">
            <h2 className="text-sm font-bold border-b border-border pb-2">Final Verification: {selectedTaskForReview.name}</h2>
            
            <div className="space-y-2 leading-relaxed text-slate-350">
              <p><strong>Estimated Hours:</strong> {selectedTaskForReview.estimatedHours}h</p>
              <p><strong>Submission Notes:</strong> {selectedTaskForReview.submissionNotes || 'No notes submitted.'}</p>
              <p><strong>Deadline:</strong> {selectedTaskForReview.deadline}</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correction Notes / Return Reason (Mandatory if requesting changes)</label>
              <input
                type="text"
                value={adminCorrectionReason}
                onChange={(e) => setAdminCorrectionReason(e.target.value)}
                placeholder="Specify adjustments required..."
                className="w-full bg-slate-900 border border-border rounded p-2 text-white outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTaskForReview(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-355 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleAdminVerify(selectedTaskForReview.id, false)}
                className="bg-red-650 hover:bg-red-650/80 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Request Revisions
              </button>
              <button
                onClick={() => handleAdminVerify(selectedTaskForReview.id, true)}
                className="bg-emerald-650 hover:bg-emerald-555 text-white font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve & Complete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
