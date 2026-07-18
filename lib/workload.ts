// Workload Engine for SyncOS Enterprise Platform
// Calculates employee workload metrics and recommends assignees

import { getDb, WorkloadSnapshot, Task, Profile } from './database/mockDb';

// ─────────────────────────────────────────────
// WORKLOAD CALCULATION
// ─────────────────────────────────────────────

export const calculateWorkload = (profileId: string): WorkloadSnapshot => {
  const db = getDb();
  const profile = db.profiles.find(p => p.id === profileId);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];

  const myTasks = db.tasks.filter(t => {
    if (t.isDeleted) return false;
    const isAssignee = t.assigneeIds.includes(profileId) || 
      t.assigneeIds.some(id => {
        if (profile && (id.toLowerCase() === profile.name.toLowerCase() || id.toLowerCase() === profile.email.toLowerCase())) {
          return true;
        }
        const p = db.profiles.find(prof => prof.id === id);
        return p && profile && (p.email.toLowerCase() === profile.email.toLowerCase() || p.name.toLowerCase() === profile.name.toLowerCase());
      });
    return isAssignee || t.seniorId === profileId;
  });

  const activeTasks = myTasks.filter(t =>
    ['Working', 'In Progress', 'Accepted', 'Review Requested', 'Senior Review', 'QA Review'].includes(t.status)
  ).length;

  const pendingTasks = myTasks.filter(t =>
    ['Created', 'Assigned', 'Reopened', 'On Hold'].includes(t.status)
  ).length;

  const overdueTasks = myTasks.filter(t => {
    if (['Completed', 'Archived', 'Cancelled', 'Rejected'].includes(t.status)) return false;
    return t.deadline && t.deadline < todayStr;
  }).length;

  const completedThisWeek = myTasks.filter(t => {
    if (t.status !== 'Completed' && t.status !== 'Archived') return false;
    if (!t.completedAt) return false;
    return new Date(t.completedAt) >= weekAgo;
  }).length;

  // Average completion hours from completed tasks
  const completedTasks = myTasks.filter(t =>
    (t.status === 'Completed' || t.status === 'Archived') && t.actualHours > 0
  );
  const avgCompletionHours = completedTasks.length > 0
    ? Math.round(completedTasks.reduce((sum, t) => sum + t.actualHours, 0) / completedTasks.length)
    : 0;

  const weeklyCapacityHours = profile?.weeklyCapacityHours ?? 40;

  // Used capacity = sum of estimated hours of active/pending tasks
  const usedCapacityHours = myTasks
    .filter(t => !['Completed', 'Archived', 'Cancelled', 'Rejected'].includes(t.status))
    .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  const estimatedFreeHours = Math.max(0, weeklyCapacityHours - usedCapacityHours);
  const isOverloaded = usedCapacityHours > weeklyCapacityHours * 0.9; // >90% capacity

  // Productivity score: factors in completion rate, overdue rate, avg hours
  const totalAssigned = myTasks.filter(t => t.status !== 'Created').length;
  const completedTotal = myTasks.filter(t =>
    t.status === 'Completed' || t.status === 'Archived'
  ).length;
  const completionRate = totalAssigned > 0 ? (completedTotal / totalAssigned) * 100 : 100;
  const overdueRate = totalAssigned > 0 ? (overdueTasks / Math.max(totalAssigned, 1)) * 100 : 0;
  const productivityScore = Math.max(0, Math.min(100,
    Math.round(completionRate - (overdueRate * 0.5) + (profile?.performanceScore ? (profile.performanceScore - 50) * 0.2 : 0))
  ));

  return {
    id: `ws-${profileId}`,
    profileId,
    activeTasks,
    pendingTasks,
    overdueTasks,
    completedThisWeek,
    avgCompletionHours,
    productivityScore,
    weeklyCapacityHours,
    usedCapacityHours,
    estimatedFreeHours,
    isOverloaded,
    calculatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────
// DEPARTMENT WORKLOAD
// ─────────────────────────────────────────────

export interface DepartmentWorkload {
  departmentId: string;
  totalActiveTasks: number;
  teamCapacity: number;
  overloadedCount: number;
  availableCount: number;
  departmentProductivity: number;
  avgCompletionTime: number;
  employeeSnapshots: WorkloadSnapshot[];
}

export const getDepartmentWorkload = (departmentId: string): DepartmentWorkload => {
  const db = getDb();
  const employees = db.profiles.filter(p =>
    p.departmentId === departmentId && p.status === 'Active'
  );

  const snapshots = employees.map(e => calculateWorkload(e.id));

  const totalActiveTasks = snapshots.reduce((s, snap) => s + snap.activeTasks, 0);
  const teamCapacity = snapshots.reduce((s, snap) => s + snap.weeklyCapacityHours, 0);
  const overloadedCount = snapshots.filter(s => s.isOverloaded).length;
  const availableCount = snapshots.filter(s => !s.isOverloaded && s.estimatedFreeHours > 4).length;
  const departmentProductivity = snapshots.length > 0
    ? Math.round(snapshots.reduce((s, snap) => s + snap.productivityScore, 0) / snapshots.length)
    : 0;
  const avgCompletionTime = snapshots.length > 0
    ? Math.round(snapshots.reduce((s, snap) => s + snap.avgCompletionHours, 0) / snapshots.length)
    : 0;

  return {
    departmentId,
    totalActiveTasks,
    teamCapacity,
    overloadedCount,
    availableCount,
    departmentProductivity,
    avgCompletionTime,
    employeeSnapshots: snapshots,
  };
};

// ─────────────────────────────────────────────
// SMART ASSIGNEE RECOMMENDATION
// ─────────────────────────────────────────────

export interface AssigneeRecommendation {
  profile: Profile;
  snapshot: WorkloadSnapshot;
  score: number;
  reasons: string[];
  warnings: string[];
}

export const recommendAssignees = (params: {
  departmentId?: string;
  teamId?: string;
  requiredSkills?: string[];
  priority?: string;
  estimatedHours?: number;
}): AssigneeRecommendation[] => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const candidates = db.profiles.filter(p => {
    if (p.status !== 'Active') return false;
    if (params.departmentId && p.departmentId !== params.departmentId) return false;
    if (params.teamId && p.teamId !== params.teamId) return false;
    // Exclude admins from task assignment
    if (['Super Admin', 'Admin'].includes(p.role)) return false;
    return true;
  });

  return candidates
    .map(profile => {
      const snapshot = calculateWorkload(profile.id);
      let score = 100;
      const reasons: string[] = [];
      const warnings: string[] = [];

      // Check if on approved leave
      const onLeave = db.leaveRequests.some(l =>
        l.profileId === profile.id &&
        l.status === 'Approved' &&
        today >= l.startDate &&
        today <= l.endDate
      );
      if (onLeave) {
        score -= 50;
        warnings.push('Currently on approved leave');
      }

      // Workload factor
      if (snapshot.isOverloaded) {
        score -= 40;
        warnings.push(`Overloaded (${snapshot.usedCapacityHours}h / ${snapshot.weeklyCapacityHours}h used)`);
      } else if (snapshot.estimatedFreeHours < (params.estimatedHours ?? 0)) {
        score -= 20;
        warnings.push(`Limited free capacity (${snapshot.estimatedFreeHours}h free)`);
      } else {
        score += 10;
        reasons.push(`${snapshot.estimatedFreeHours}h of available capacity`);
      }

      // Active tasks factor
      if (snapshot.activeTasks === 0) {
        score += 15;
        reasons.push('No active tasks currently');
      } else if (snapshot.activeTasks <= 2) {
        score += 5;
        reasons.push(`Light workload (${snapshot.activeTasks} active tasks)`);
      } else if (snapshot.activeTasks >= 5) {
        score -= 15;
        warnings.push(`High active task count (${snapshot.activeTasks})`);
      }

      // Overdue tasks factor
      if (snapshot.overdueTasks > 0) {
        score -= snapshot.overdueTasks * 10;
        warnings.push(`${snapshot.overdueTasks} overdue task(s)`);
      }

      // Performance score factor
      if ((profile.performanceScore ?? 0) >= 80) {
        score += 10;
        reasons.push(`High performer (${profile.performanceScore}% score)`);
      }

      // Skills match factor
      if (params.requiredSkills?.length) {
        const matchCount = params.requiredSkills.filter(skill =>
          profile.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        ).length;
        if (matchCount === params.requiredSkills.length) {
          score += 20;
          reasons.push(`Full skills match (${matchCount}/${params.requiredSkills.length})`);
        } else if (matchCount > 0) {
          score += matchCount * 5;
          reasons.push(`Partial skills match (${matchCount}/${params.requiredSkills.length})`);
        } else {
          score -= 10;
          warnings.push('No matching skills');
        }
      }

      // Productivity score
      score += Math.round(snapshot.productivityScore * 0.1);
      reasons.push(`${snapshot.productivityScore}% productivity score`);

      return { profile, snapshot, score: Math.max(0, Math.min(100, score)), reasons, warnings };
    })
    .sort((a, b) => b.score - a.score);
};

export const getOverloadedEmployees = (departmentId?: string): WorkloadSnapshot[] => {
  const db = getDb();
  const employees = db.profiles.filter(p =>
    p.status === 'Active' &&
    (!departmentId || p.departmentId === departmentId) &&
    !['Super Admin', 'Admin'].includes(p.role)
  );
  return employees
    .map(e => calculateWorkload(e.id))
    .filter(s => s.isOverloaded);
};
