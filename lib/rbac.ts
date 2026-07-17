// Role-Based Access Control (RBAC) for SyncOS Enterprise Platform
// Defines the 7-level hierarchy and permission system

import { UserRole } from './database/mockDb';

// ─────────────────────────────────────────────
// ROLE HIERARCHY (higher = more access)
// ─────────────────────────────────────────────

export const ROLE_LEVEL: Record<UserRole, number> = {
  'Super Admin': 7,
  'Admin': 6,
  'Department Head': 5,
  'Team Lead': 4,
  'Senior Employee': 3,
  'Employee': 2,
  'Intern': 1,
};

// ─────────────────────────────────────────────
// ADMIN PORTAL ACCESS
// Roles that can access /admin/* routes
// ─────────────────────────────────────────────

export const ADMIN_ROLES: UserRole[] = [
  'Super Admin',
  'Admin',
  'Department Head',
  'Team Lead',
];

export const canAccessAdminPortal = (role: UserRole): boolean => {
  return ADMIN_ROLES.includes(role);
};

// ─────────────────────────────────────────────
// PERMISSIONS SYSTEM
// ─────────────────────────────────────────────

export type Permission =
  // User Management
  | 'manage_employees'
  | 'view_all_employees'
  | 'approve_employees'
  | 'suspend_employees'
  | 'delete_employees'
  // Department Management
  | 'manage_departments'
  | 'view_department'
  | 'manage_own_department'
  // Team Management
  | 'manage_teams'
  | 'manage_own_team'
  | 'view_teams'
  // Project Management
  | 'manage_projects'
  | 'view_all_projects'
  | 'create_projects'
  | 'archive_projects'
  // Task Management
  | 'assign_tasks'
  | 'create_tasks'
  | 'delete_tasks'
  | 'verify_tasks'
  | 'approve_tasks_senior'
  | 'approve_tasks_qa'
  | 'view_all_tasks'
  | 'manage_own_tasks'
  // Chat & Groups
  | 'monitor_chats'
  | 'manage_groups'
  | 'delete_messages'
  | 'lock_channels'
  | 'broadcast_messages'
  // Meetings
  | 'schedule_meetings'
  | 'manage_all_meetings'
  | 'view_recordings'
  // Reports & Analytics
  | 'view_reports'
  | 'export_reports'
  | 'generate_reports'
  // Audit & System
  | 'view_audit_logs'
  | 'manage_automation'
  | 'manage_system_settings'
  | 'view_system_health'
  // Documents
  | 'manage_documents'
  | 'approve_documents'
  | 'delete_documents';

const PERMISSIONS: Record<UserRole, Permission[]> = {
  'Super Admin': [
    'manage_employees', 'view_all_employees', 'approve_employees', 'suspend_employees', 'delete_employees',
    'manage_departments', 'view_department', 'manage_own_department',
    'manage_teams', 'manage_own_team', 'view_teams',
    'manage_projects', 'view_all_projects', 'create_projects', 'archive_projects',
    'assign_tasks', 'create_tasks', 'delete_tasks', 'verify_tasks', 'approve_tasks_senior', 'approve_tasks_qa', 'view_all_tasks', 'manage_own_tasks',
    'monitor_chats', 'manage_groups', 'delete_messages', 'lock_channels', 'broadcast_messages',
    'schedule_meetings', 'manage_all_meetings', 'view_recordings',
    'view_reports', 'export_reports', 'generate_reports',
    'view_audit_logs', 'manage_automation', 'manage_system_settings', 'view_system_health',
    'manage_documents', 'approve_documents', 'delete_documents',
  ],
  'Admin': [
    'manage_employees', 'view_all_employees', 'approve_employees', 'suspend_employees',
    'manage_departments', 'view_department', 'manage_own_department',
    'manage_teams', 'manage_own_team', 'view_teams',
    'manage_projects', 'view_all_projects', 'create_projects', 'archive_projects',
    'assign_tasks', 'create_tasks', 'verify_tasks', 'approve_tasks_senior', 'view_all_tasks', 'manage_own_tasks',
    'monitor_chats', 'manage_groups', 'delete_messages', 'lock_channels', 'broadcast_messages',
    'schedule_meetings', 'manage_all_meetings', 'view_recordings',
    'view_reports', 'export_reports', 'generate_reports',
    'view_audit_logs', 'manage_automation',
    'manage_documents', 'approve_documents',
  ],
  'Department Head': [
    'view_all_employees', 'manage_own_department',
    'manage_teams', 'manage_own_team', 'view_teams',
    'view_all_projects', 'create_projects',
    'assign_tasks', 'create_tasks', 'approve_tasks_senior', 'view_all_tasks', 'manage_own_tasks',
    'manage_groups', 'broadcast_messages',
    'schedule_meetings', 'view_recordings',
    'view_reports', 'export_reports',
    'manage_documents',
  ],
  'Team Lead': [
    'view_all_employees',
    'manage_own_team', 'view_teams',
    'view_all_projects',
    'assign_tasks', 'create_tasks', 'approve_tasks_senior', 'view_all_tasks', 'manage_own_tasks',
    'manage_groups',
    'schedule_meetings',
    'view_reports',
    'manage_documents',
  ],
  'Senior Employee': [
    'view_all_employees',
    'view_teams',
    'view_all_projects',
    'create_tasks', 'approve_tasks_senior', 'manage_own_tasks',
    'schedule_meetings',
    'manage_documents',
  ],
  'Employee': [
    'manage_own_tasks',
    'schedule_meetings',
  ],
  'Intern': [
    'manage_own_tasks',
  ],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return PERMISSIONS[role]?.includes(permission) ?? false;
};

export const getRoleLevel = (role: UserRole): number => {
  return ROLE_LEVEL[role] ?? 0;
};

export const isRoleAbove = (role: UserRole, targetRole: UserRole): boolean => {
  return getRoleLevel(role) > getRoleLevel(targetRole);
};

export const isRoleAtLeast = (role: UserRole, minRole: UserRole): boolean => {
  return getRoleLevel(role) >= getRoleLevel(minRole);
};

export const getRoleBadgeColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    'Super Admin': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Admin': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Department Head': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Team Lead': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'Senior Employee': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Employee': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Intern': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return colors[role] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

export const ALL_ROLES: UserRole[] = [
  'Super Admin', 'Admin', 'Department Head', 'Team Lead', 'Senior Employee', 'Employee', 'Intern'
];
