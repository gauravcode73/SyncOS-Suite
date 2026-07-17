'use client';
import React, { useState } from 'react';
import { Zap, Plus, Play, Pause, Trash2, ChevronRight, X, CheckCircle, AlertCircle, Clock, ToggleLeft, ToggleRight, FlaskConical } from 'lucide-react';
import { getDb, saveDb, getCurrentUser, AutomationRule, AutomationTrigger, AutomationAction } from '@/lib/database/mockDb';
import { TRIGGER_LABELS, ACTION_LABELS, testAutomationRule } from '@/lib/automation';

const TRIGGER_OPTIONS: AutomationTrigger[] = [
  'task_submitted', 'task_overdue', 'task_completed', 'task_assigned',
  'senior_approved', 'admin_approved', 'meeting_ended', 'employee_joined',
  'leave_approved', 'project_completed', 'file_uploaded', 'deadline_changed', 'department_created'
];

const ACTION_OPTIONS = [
  { type: 'notify_employee', label: 'Notify Employee', needsMessage: true },
  { type: 'notify_senior', label: 'Notify Department Senior', needsMessage: true },
  { type: 'notify_admin', label: 'Notify Admin', needsMessage: true },
  { type: 'notify_department', label: 'Notify Entire Department', needsMessage: true },
  { type: 'create_task', label: 'Create Follow-up Task', needsMessage: false },
  { type: 'update_task_status', label: 'Update Task Status', needsMessage: false },
  { type: 'add_to_group', label: 'Add to Chat Group', needsMessage: false },
  { type: 'generate_summary', label: 'Generate AI Summary', needsMessage: false },
  { type: 'archive_project', label: 'Archive Project', needsMessage: false },
];

export default function AdminAutomationPage() {
  const [db, setDb] = useState(() => getDb());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [testResult, setTestResult] = useState<{ ruleId: string; success: boolean; message: string } | null>(null);
  const user = getCurrentUser();

  const [form, setForm] = useState({
    name: '', description: '',
    trigger: 'task_submitted' as AutomationTrigger,
    actions: [{ type: 'notify_senior' as any, params: { message: '' } }] as AutomationAction[],
    priority: 1,
  });

  const refreshDb = () => setDb(getDb());

  const handleToggle = (ruleId: string) => {
    const freshDb = getDb();
    const idx = freshDb.automationRules.findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      freshDb.automationRules[idx].isEnabled = !freshDb.automationRules[idx].isEnabled;
      saveDb(freshDb); refreshDb();
    }
  };

  const handleDelete = (ruleId: string) => {
    const freshDb = getDb();
    freshDb.automationRules = freshDb.automationRules.filter(r => r.id !== ruleId);
    saveDb(freshDb); refreshDb();
    if (selectedRule?.id === ruleId) setSelectedRule(null);
  };

  const handleTest = (ruleId: string) => {
    const result = testAutomationRule(ruleId);
    setTestResult({ ruleId, ...result });
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const freshDb = getDb();
    const rule: AutomationRule = {
      id: `auto-${Date.now()}`,
      name: form.name,
      description: form.description,
      trigger: form.trigger,
      conditions: [],
      actions: form.actions,
      isEnabled: true,
      priority: form.priority,
      executionLogs: [],
      createdBy: user?.id || 'emp-001',
      createdAt: new Date().toISOString(),
      triggerCount: 0,
    };
    freshDb.automationRules.push(rule);
    freshDb.automationRules.sort((a, b) => a.priority - b.priority);
    saveDb(freshDb); refreshDb();
    setShowCreate(false);
    setForm({ name: '', description: '', trigger: 'task_submitted', actions: [{ type: 'notify_senior', params: { message: '' } }], priority: 1 });
  };

  const addAction = () => {
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'notify_employee' as any, params: { message: '' } }] }));
  };

  const updateAction = (index: number, field: string, value: string) => {
    setForm(f => {
      const newActions = [...f.actions];
      if (field === 'type') { newActions[index] = { type: value as any, params: { message: '' } }; }
      else { newActions[index] = { ...newActions[index], params: { ...newActions[index].params, [field]: value } }; }
      return { ...f, actions: newActions };
    });
  };

  const removeAction = (index: number) => {
    setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== index) }));
  };

  const rules = db.automationRules.sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Test Result Toast */}
      {testResult && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Zap className="w-5 h-5 text-violet-500" /> Workflow Automation</h1>
          <p className="text-xs text-slate-500 mt-0.5">{rules.filter(r => r.isEnabled).length} active rules · {rules.length} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/20 transition-all">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Rules', value: rules.filter(r => r.isEnabled).length, color: 'text-emerald-400' },
          { label: 'Total Triggers', value: rules.reduce((s, r) => s + r.triggerCount, 0), color: 'text-violet-400' },
          { label: 'Paused Rules', value: rules.filter(r => !r.isEnabled).length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Rule Cards */}
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className={`bg-card border rounded-2xl p-5 transition-all ${rule.isEnabled ? 'border-border hover:border-violet-500/30' : 'border-border/40 opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">Priority {rule.priority}</span>
                  {rule.isEnabled ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full">Paused</span>
                  )}
                  {rule.triggerCount > 0 && <span className="text-[10px] text-slate-500">{rule.triggerCount}× triggered</span>}
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1">{rule.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{rule.description}</p>

                {/* Flow visualization */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                    <Zap className="w-3 h-3" />
                    <span className="font-semibold">WHEN</span> {TRIGGER_LABELS[rule.trigger]}
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  {rule.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400">
                      <Play className="w-3 h-3" />
                      <span className="font-semibold">THEN</span> {ACTION_LABELS[action.type] || action.type}
                    </div>
                  ))}
                </div>

                {rule.lastTriggeredAt && (
                  <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last triggered: {new Date(rule.lastTriggeredAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => handleToggle(rule.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${rule.isEnabled ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                  {rule.isEnabled ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Enable</>}
                </button>
                <button onClick={() => handleTest(rule.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500/10 transition-all">
                  <FlaskConical className="w-3 h-3" /> Test
                </button>
                <button onClick={() => setSelectedRule(rule)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-border transition-all">
                  <Clock className="w-3 h-3" /> Logs
                </button>
                {!rule.id.startsWith('auto-00') && (
                  <button onClick={() => handleDelete(rule.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Logs Modal */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Execution Logs — {selectedRule.name}</h2>
              <button onClick={() => setSelectedRule(null)} className="p-1.5 rounded-lg hover:bg-border text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            {selectedRule.executionLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No executions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRule.executionLogs.map(log => (
                  <div key={log.id} className={`p-3 rounded-xl border text-xs ${log.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${log.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {log.status === 'success' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-slate-500">{new Date(log.executedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-foreground">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Create Automation Rule</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-border text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rule Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" placeholder="e.g. Alert on High Priority Overdue" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500 resize-none" />
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">⚡ Trigger (WHEN)</label>
                <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value as AutomationTrigger }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500">
                  {TRIGGER_OPTIONS.map(t => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}
                </select>
              </div>

              <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 Actions (THEN)</label>
                  <button onClick={addAction} className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                </div>
                {form.actions.map((action, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <select value={action.type} onChange={e => updateAction(i, 'type', e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500">
                        {ACTION_OPTIONS.map(a => <option key={a.type} value={a.type}>{a.label}</option>)}
                      </select>
                      {ACTION_OPTIONS.find(a => a.type === action.type)?.needsMessage && (
                        <input value={action.params.message || ''} onChange={e => updateAction(i, 'message', e.target.value)} placeholder="Notification message..." className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500" />
                      )}
                    </div>
                    {form.actions.length > 1 && (
                      <button onClick={() => removeAction(i)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priority (1 = Highest)</label>
                <input type="number" min={1} max={100} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 bg-border/50 hover:bg-border rounded-xl text-sm font-semibold text-foreground transition-all">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all">Create Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
