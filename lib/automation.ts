// Automation Engine for SyncOS Enterprise Platform
// Evaluates Trigger → Condition → Action rules client-side

import {
  getDb, saveDb, AutomationRule, AutomationTrigger, AutomationCondition,
  AutomationAction, AutomationExecutionLog, createNotification
} from './database/mockDb';

// ─────────────────────────────────────────────
// TRIGGER LABELS (for UI display)
// ─────────────────────────────────────────────

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  task_submitted: 'Task Submitted for Review',
  task_overdue: 'Task Becomes Overdue',
  task_completed: 'Task Marked Complete',
  task_assigned: 'Task Assigned to Employee',
  senior_approved: 'Senior Approves Task',
  admin_approved: 'Admin Verifies Task',
  meeting_ended: 'Meeting Ends',
  employee_joined: 'Employee Joins Platform',
  leave_approved: 'Leave Request Approved',
  project_completed: 'Project Reaches 100%',
  file_uploaded: 'File Uploaded',
  deadline_changed: 'Task Deadline Changed',
  department_created: 'Department Created',
};

export const ACTION_LABELS: Record<string, string> = {
  notify_employee: 'Notify Employee',
  notify_senior: 'Notify Department Senior',
  notify_admin: 'Notify Admin',
  notify_department: 'Notify Entire Department',
  create_task: 'Create a Follow-up Task',
  update_task_status: 'Update Task Status',
  add_to_group: 'Add Employee to Chat Group',
  generate_summary: 'Generate AI Summary',
  archive_project: 'Archive Project',
  create_calendar_event: 'Create Calendar Event',
};

export const CONDITION_FIELD_LABELS: Record<string, string> = {
  department: 'Department',
  team: 'Team',
  priority: 'Task Priority',
  role: 'Assignee Role',
  project: 'Project',
  status: 'Task Status',
};

// ─────────────────────────────────────────────
// CONTEXT TYPE
// ─────────────────────────────────────────────

export interface AutomationContext {
  taskId?: string;
  projectId?: string;
  departmentId?: string;
  teamId?: string;
  profileId?: string;
  priority?: string;
  status?: string;
  role?: string;
  [key: string]: string | undefined;
}

// ─────────────────────────────────────────────
// CONDITION EVALUATOR
// ─────────────────────────────────────────────

const evaluateCondition = (condition: AutomationCondition, context: AutomationContext): boolean => {
  const contextValue = context[condition.field];
  if (!contextValue) return false;

  switch (condition.operator) {
    case 'equals':
      return contextValue === condition.value;
    case 'not_equals':
      return contextValue !== condition.value;
    case 'contains':
      return contextValue.toLowerCase().includes(condition.value.toLowerCase());
    default:
      return false;
  }
};

// ─────────────────────────────────────────────
// ACTION EXECUTOR
// ─────────────────────────────────────────────

const executeAction = (action: AutomationAction, context: AutomationContext): void => {
  const db = getDb();

  switch (action.type) {
    case 'notify_employee': {
      const task = context.taskId ? db.tasks.find(t => t.id === context.taskId) : null;
      const recipientIds = task ? task.assigneeIds : context.profileId ? [context.profileId] : [];
      recipientIds.forEach(id => {
        createNotification(id, '🤖 Automation Alert', action.params.message || 'Automated notification.', 'normal', context.taskId, 'task');
      });
      break;
    }
    case 'notify_senior': {
      const task = context.taskId ? db.tasks.find(t => t.id === context.taskId) : null;
      const seniorId = task?.seniorId || context.profileId;
      if (seniorId) {
        createNotification(seniorId, '🤖 Senior Review Alert', action.params.message || 'Action required from you.', 'high', context.taskId, 'task');
      }
      break;
    }
    case 'notify_admin': {
      const admins = db.profiles.filter(p => ['Super Admin', 'Admin'].includes(p.role));
      admins.forEach(admin => {
        createNotification(admin.id, '🤖 Admin Alert', action.params.message || 'Admin action required.', 'high', context.taskId, 'task');
      });
      break;
    }
    case 'notify_department': {
      if (context.departmentId) {
        const members = db.profiles.filter(p => p.departmentId === context.departmentId && p.status === 'Active');
        members.forEach(m => {
          createNotification(m.id, '🤖 Department Alert', action.params.message || 'Department notification.', 'department', context.taskId, 'task');
        });
      }
      break;
    }
    case 'update_task_status': {
      if (context.taskId && action.params.status) {
        const freshDb = getDb();
        const taskIdx = freshDb.tasks.findIndex(t => t.id === context.taskId);
        if (taskIdx !== -1) {
          (freshDb.tasks[taskIdx] as any).status = action.params.status;
          saveDb(freshDb);
        }
      }
      break;
    }
    default:
      // Other actions (create_task, add_to_group, etc.) are logged but not auto-executed in v1
      console.log(`[Automation] Action '${action.type}' queued (requires manual execution).`);
      break;
  }
};

// ─────────────────────────────────────────────
// MAIN EVALUATOR
// ─────────────────────────────────────────────

export const evaluateAutomation = (trigger: AutomationTrigger, context: AutomationContext): void => {
  try {
    const db = getDb();
    const matchingRules = db.automationRules
      .filter(r => r.isEnabled && r.trigger === trigger)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of matchingRules) {
      // All conditions must pass (AND logic)
      const allConditionsMet = rule.conditions.every(c => evaluateCondition(c, context));

      if (allConditionsMet) {
        // Execute all actions
        rule.actions.forEach(action => {
          try {
            executeAction(action, context);
          } catch (e) {
            console.error(`[Automation] Action error in rule "${rule.name}":`, e);
          }
        });

        // Log execution
        const freshDb = getDb();
        const ruleIdx = freshDb.automationRules.findIndex(r => r.id === rule.id);
        if (ruleIdx !== -1) {
          const execLog: AutomationExecutionLog = {
            id: `exec-${Date.now()}`,
            ruleId: rule.id,
            trigger,
            contextSnapshot: JSON.stringify(context),
            status: 'success',
            message: `Rule executed successfully with ${rule.actions.length} action(s).`,
            executedAt: new Date().toISOString(),
          };
          freshDb.automationRules[ruleIdx].executionLogs.unshift(execLog);
          freshDb.automationRules[ruleIdx].triggerCount += 1;
          freshDb.automationRules[ruleIdx].lastTriggeredAt = new Date().toISOString();
          saveDb(freshDb);
        }
      }
    }
  } catch (e) {
    console.error('[Automation] Evaluation error:', e);
  }
};

// Manually test a rule
export const testAutomationRule = (ruleId: string): { success: boolean; message: string } => {
  const db = getDb();
  const rule = db.automationRules.find(r => r.id === ruleId);
  if (!rule) return { success: false, message: 'Rule not found.' };

  const mockContext: AutomationContext = {
    taskId: db.tasks[0]?.id,
    projectId: db.projects[0]?.id,
    departmentId: db.departments[0]?.id,
    profileId: db.profiles[0]?.id,
    priority: 'High',
    status: 'Review Requested',
  };

  evaluateAutomation(rule.trigger, mockContext);
  return { success: true, message: `Rule "${rule.name}" tested with mock context.` };
};
