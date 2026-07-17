// Mock Database Service Layer for SyncOS Enterprise Platform
// Persists in localStorage on client-side with Supabase write-through sync
import { isSupabaseConfigured } from './supabaseClient';
import { pushRecordToSupabase, deleteRecordFromSupabase } from './supabaseSync';

// ─────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────

export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Department Head'
  | 'Team Lead'
  | 'Senior Employee'
  | 'Employee'
  | 'Intern';

export interface Profile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  departmentId: string | null;
  teamId: string | null;
  designation: string;
  mobile: string;
  role: UserRole;
  managerId: string | null;
  joiningDate: string;
  status: 'Pending Approval' | 'Active' | 'Suspended' | 'Blocked';
  avatarUrl: string;
  skills: string[];
  documents: { name: string; url: string; uploadedAt: string }[];
  onlineStatus: 'online' | 'offline' | 'busy' | 'away';
  lastActive: string;
  device?: string;
  location?: string;
  performanceScore?: number;
  weeklyCapacityHours?: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  headId: string | null;
  color: string;
  icon: string;
  employeeCount: number;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  teamLeadId: string | null;
  memberIds: string[];
  isArchived?: boolean;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  departmentId: string | null;
  teamIds: string[];
  status: 'Planning' | 'Active' | 'Paused' | 'Completed' | 'Archived';
  progress: number;
  deadline: string;
  createdBy: string;
  createdAt: string;
  isDeleted?: boolean;
}

export type TaskStatus =
  | 'Created'
  | 'Assigned'
  | 'Accepted'
  | 'Working'
  | 'Review Requested'
  | 'Senior Review'
  | 'QA Review'
  | 'Admin Verification'
  | 'Completed'
  | 'Archived'
  | 'Blocked'
  | 'On Hold'
  | 'Cancelled'
  | 'Rejected'
  | 'Reopened';

export interface Task {
  id: string;
  projectId: string | null;
  name: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: TaskStatus;
  departmentId: string | null;
  teamId: string | null;
  assigneeIds: string[];
  seniorId: string | null;
  qaReviewerId: string | null;
  requiresQA: boolean;
  rejectionReason: string | null;
  submissionNotes: string | null;
  dependencyTaskId: string | null;
  startDate: string;
  deadline: string;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
  subtasks: { id: string; name: string; isCompleted: boolean }[];
  checklist: { id: string; item: string; isChecked: boolean }[];
  comments: { id: string; profileId: string; content: string; createdAt: string; isEdited?: boolean }[];
  attachments: { id: string; name: string; url: string; size: string; type: string; uploadedBy: string; uploadedAt: string }[];
  timeline: { id: string; action: string; profileId: string; timestamp: string; previousStatus?: string; newStatus?: string }[];
  isDeleted?: boolean;
  deletedAt?: string;
  completedAt?: string;
}

export interface GroupPermissions {
  canSendMessages: UserRole[];
  canReply: UserRole[];
  canUploadFiles: UserRole[];
  canRenameGroup: UserRole[];
  canInviteMembers: UserRole[];
  canRemoveMembers: UserRole[];
  canPinMessages: UserRole[];
  canArchiveGroup: UserRole[];
}

export interface ChatRoom {
  id: string;
  name: string | null;
  type: 'direct' | 'department' | 'team' | 'project' | 'announcement' | 'temporary' | 'private' | 'cross-department' | 'support';
  departmentId?: string;
  teamId?: string;
  projectId?: string;
  memberIds: string[];
  mutedIds?: string[];
  starredIds?: string[];
  archivedIds?: string[];
  pinnedMessageIds?: string[];
  ownerId?: string;
  coverImage?: string;
  icon?: string;
  isArchived?: boolean;
  isDeleted?: boolean;
  permissions?: GroupPermissions;
  createdAt?: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system' | 'poll';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  replyToId?: string | null;
  threadReplies?: string[];
  reactions: { emoji: string; profileIds: string[] }[];
  readBy: { profileId: string; timestamp: string }[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned?: boolean;
  pollData?: { question: string; options: { id: string; text: string; votes: string[] }[] };
  scheduledAt?: string;
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingAgendaItem {
  id: string;
  title: string;
  duration: number;
  presenterId?: string;
  isCompleted: boolean;
}

export interface MeetingActionItem {
  id: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  isCompleted: boolean;
  linkedTaskId?: string;
}

export interface MeetingRoom {
  id: string;
  title: string;
  hostId: string;
  status: 'scheduled' | 'active' | 'completed';
  scheduledAt: string;
  duration: number;
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  recordingUrl?: string;
  notes?: string;
  agenda?: MeetingAgendaItem[];
  actionItems?: MeetingActionItem[];
  aiSummary?: string;
  decisions?: string[];
  isMutedAll?: boolean;
  isCameraLocked?: boolean;
  waitingRoomIds: string[];
  participantIds: string[];
  activeSpeakers?: string[];
  chat: { id: string; profileId: string; content: string; createdAt: string }[];
  raisedHands: string[];
  attendanceLog?: { profileId: string; joinedAt: string; leftAt?: string }[];
}

export interface Attendance {
  id: string;
  profileId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breaks: { start: string; end: string | null }[];
  workingHours: number;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  lateReason?: string;
}

export interface LeaveRequest {
  id: string;
  profileId: string;
  type: 'Casual' | 'Sick' | 'Annual' | 'Unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy: string | null;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'leave' | 'birthday' | 'holiday' | 'event' | 'task_deadline';
  createdBy: string;
  departmentId?: string;
  profileIds?: string[];
}

export interface DocumentFile {
  id: string;
  name: string;
  filePath: string | null;
  folderId: string | null;
  isFolder: boolean;
  size: string;
  mimeType?: string;
  ownerId: string;
  isKbSop: boolean;
  kbCategory?: 'HR Policy' | 'IT SOP' | 'Design Guideline' | 'Sales Manual' | 'Security';
  version: number;
  content?: string;
  history?: { version: number; updatedAt: string; updatedBy: string; description: string }[];
  sharedWithIds: string[];
  tags?: string[];
  category?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  downloadHistory?: { profileId: string; downloadedAt: string }[];
  comments?: { id: string; profileId: string; content: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'circular' | 'event' | 'poll';
  pollOptions?: { id: string; text: string }[];
  pollVotes?: { [optionId: string]: string[] };
  pinned: boolean;
  createdBy: string;
  acknowledgements: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  profileId: string;
  action: string;
  details: string;
  ipAddress: string;
  device: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  tableName: string;
  rowId: string;
  changes: string;
  previousValue?: string;
  newValue?: string;
  module?: string;
  reason?: string;
  sessionId?: string;
  ipAddress?: string;
  browser?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  profileId: string;
  title: string;
  body: string;
  type: 'critical' | 'high' | 'normal' | 'silent' | 'department' | 'project' | 'personal' | 'broadcast' | 'announcement' | 'leave';
  isRead: boolean;
  referenceId?: string;
  referenceType?: 'task' | 'meeting' | 'chat' | 'document' | 'project';
  snoozedUntil?: string;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  profileId: string;
  critical: boolean;
  high: boolean;
  normal: boolean;
  silent: boolean;
  department: boolean;
  project: boolean;
  personal: boolean;
  broadcast: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
}

export type AutomationTrigger =
  | 'task_submitted' | 'task_overdue' | 'task_completed' | 'task_assigned'
  | 'senior_approved' | 'admin_approved' | 'meeting_ended' | 'employee_joined'
  | 'leave_approved' | 'project_completed' | 'file_uploaded'
  | 'deadline_changed' | 'department_created';

export type AutomationConditionField = 'department' | 'team' | 'priority' | 'role' | 'project' | 'status';

export interface AutomationCondition {
  field: AutomationConditionField;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
}

export type AutomationActionType =
  | 'notify_employee' | 'notify_senior' | 'notify_admin' | 'notify_department'
  | 'create_task' | 'update_task_status' | 'add_to_group'
  | 'generate_summary' | 'archive_project' | 'create_calendar_event';

export interface AutomationAction {
  type: AutomationActionType;
  params: Record<string, string>;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  trigger: AutomationTrigger;
  contextSnapshot: string;
  status: 'success' | 'error';
  message: string;
  executedAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
  priority: number;
  executionLogs: AutomationExecutionLog[];
  createdBy: string;
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

export interface WorkloadSnapshot {
  id: string;
  profileId: string;
  activeTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
  avgCompletionHours: number;
  productivityScore: number;
  weeklyCapacityHours: number;
  usedCapacityHours: number;
  estimatedFreeHours: number;
  isOverloaded: boolean;
  calculatedAt: string;
}

export interface Report {
  id: string;
  name: string;
  type: 'employees' | 'departments' | 'tasks' | 'projects' | 'attendance' | 'meetings' | 'chat' | 'storage' | 'productivity' | 'performance' | 'leaves';
  filters: { startDate?: string; endDate?: string; departmentId?: string; profileId?: string; };
  createdBy: string;
  createdAt: string;
  scheduledAt?: string;
  isScheduled: boolean;
}

export interface DB {
  profiles: Profile[];
  departments: Department[];
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  chatRooms: ChatRoom[];
  messages: Message[];
  meetingRooms: MeetingRoom[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  calendarEvents: CalendarEvent[];
  documents: DocumentFile[];
  announcements: Announcement[];
  notifications: Notification[];
  notificationPreferences: NotificationPreference[];
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  automationRules: AutomationRule[];
  workloadSnapshots: WorkloadSnapshot[];
  reports: Report[];
}

// ─────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────

const seedDepartments: Department[] = [
  { id: 'dept-hr', name: 'HR', description: 'People operations, recruiting and benefits', headId: null, color: '#ec4899', icon: 'HeartHandshake', employeeCount: 0 },
  { id: 'dept-marketing', name: 'Marketing', description: 'Social outreach, campaigns and branding', headId: null, color: '#f59e0b', icon: 'Megaphone', employeeCount: 0 },
  { id: 'dept-sales', name: 'Sales', description: 'Enterprise sales and customer accounts', headId: null, color: '#10b981', icon: 'Coins', employeeCount: 0 },
  { id: 'dept-it', name: 'IT Support', description: 'System administration, security and software access', headId: null, color: '#3b82f6', icon: 'Laptop', employeeCount: 0 },
  { id: 'dept-development', name: 'Development', description: 'Core product engineering and architecture', headId: null, color: '#6366f1', icon: 'Code', employeeCount: 0 },
  { id: 'dept-design', name: 'Design', description: 'UI/UX layout, graphics and branding', headId: null, color: '#8b5cf6', icon: 'Palette', employeeCount: 0 },
  { id: 'dept-accounts', name: 'Accounts', description: 'Payroll, bookkeeping and billing', headId: null, color: '#14b8a6', icon: 'Calculator', employeeCount: 0 },
  { id: 'dept-logistics', name: 'Logistics', description: 'Supply chain management and procurement', headId: null, color: '#6b7280', icon: 'Truck', employeeCount: 0 },
  { id: 'dept-customer', name: 'Customer Support', description: 'Customer tickets, chats and documentation', headId: null, color: '#06b6d4', icon: 'Headphones', employeeCount: 0 }
];

const seedProfiles: Profile[] = [
  {
    id: 'emp-001',
    employeeId: '01',
    name: 'Gaurav Upadhyay',
    email: 'gaurav.bellework@gmail.com',
    departmentId: 'dept-development',
    teamId: null,
    designation: 'Technical Executive',
    mobile: '7303164526',
    role: 'Super Admin',
    managerId: null,
    joiningDate: '2026-07-17',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    skills: ['React', 'Next.js', 'Supabase', 'PostgreSQL', 'TypeScript', 'System Architecture'],
    documents: [],
    onlineStatus: 'online',
    lastActive: new Date().toISOString(),
    performanceScore: 98,
    weeklyCapacityHours: 40
  }
];

const seedChatRooms: ChatRoom[] = [
  { id: 'room-general', name: '📢 General Announcement', type: 'announcement', memberIds: [], mutedIds: [], pinnedMessageIds: [], createdAt: new Date().toISOString() },
  { id: 'room-announcements', name: '📣 Corporate Circulars', type: 'announcement', memberIds: [], mutedIds: [], pinnedMessageIds: [], createdAt: new Date().toISOString() },
  { id: 'room-it', name: '🛠 IT & Tech Support', type: 'department', departmentId: 'dept-it', memberIds: [], mutedIds: [], pinnedMessageIds: [], createdAt: new Date().toISOString() }
];

const seedDocuments: DocumentFile[] = [
  { id: 'fld-root-sop', name: '📖 Company SOP & Policies', filePath: null, folderId: null, isFolder: true, size: '--', ownerId: 'system', isKbSop: true, version: 1, sharedWithIds: [], tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  {
    id: 'sop-hr-policy',
    name: 'Employee Work Ethics & Leave Policy.md',
    filePath: '/storage/Employee-Ethics-Leave-Policy.md',
    folderId: 'fld-root-sop',
    isFolder: false,
    size: '15 KB',
    mimeType: 'text/markdown',
    ownerId: 'system',
    isKbSop: true,
    kbCategory: 'HR Policy',
    version: 3,
    tags: ['hr', 'policy', 'leave'],
    content: `# Company Leave and Working Hour Policies\n\nStandard work hours are **9:00 AM to 6:00 PM** local time.\nGrace period for late entry is **15 minutes**.\nEmployees receive **18 Paid Leaves** annually.`,
    sharedWithIds: [],
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-07-05T14:00:00.000Z'
  },
  {
    id: 'sop-it-vpn',
    name: 'IT Network VPN & System Setup.md',
    filePath: '/storage/IT-VPN-Setup-SOP.md',
    folderId: 'fld-root-sop',
    isFolder: false,
    size: '12 KB',
    mimeType: 'text/markdown',
    ownerId: 'system',
    isKbSop: true,
    kbCategory: 'IT SOP',
    version: 1,
    tags: ['it', 'vpn', 'security'],
    content: `# IT VPN Access & Security Guidelines\n\nAll employees accessing database nodes must connect via the corporate VPN.\nInstall the OpenVPN client profile from the IT Support portal.\nEnable Multi-Factor Authentication via Authenticator app.`,
    sharedWithIds: [],
    createdAt: '2026-04-12T11:00:00.000Z',
    updatedAt: '2026-04-12T11:00:00.000Z'
  }
];

const seedAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Platform System Migration Complete',
    content: 'We have fully migrated all internal services to this collaborative application dashboard. Please conduct all conversations, file sharing, and task progress reports here.',
    type: 'circular',
    pinned: true,
    createdBy: 'system',
    acknowledgements: [],
    createdAt: '2026-07-15T09:00:00.000Z'
  }
];

const seedAutomationRules: AutomationRule[] = [
  {
    id: 'auto-001',
    name: 'Notify Senior on Task Submission',
    description: 'When an employee submits work for review, automatically notify the assigned senior reviewer.',
    trigger: 'task_submitted',
    conditions: [],
    actions: [{ type: 'notify_senior', params: { message: 'A task has been submitted for your review.' } }],
    isEnabled: true,
    priority: 1,
    executionLogs: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    triggerCount: 0
  },
  {
    id: 'auto-002',
    name: 'Notify Admin on Senior Approval',
    description: 'When a senior approves a task, notify the admin for final verification.',
    trigger: 'senior_approved',
    conditions: [],
    actions: [{ type: 'notify_admin', params: { message: 'A task approved by senior is pending admin verification.' } }],
    isEnabled: true,
    priority: 2,
    executionLogs: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    triggerCount: 0
  },
  {
    id: 'auto-003',
    name: 'Alert on Overdue Tasks',
    description: 'When a task becomes overdue, notify both the assigned employee and their senior.',
    trigger: 'task_overdue',
    conditions: [],
    actions: [
      { type: 'notify_employee', params: { message: 'Your task is overdue. Please update or request an extension.' } },
      { type: 'notify_senior', params: { message: 'A task assigned to your team is overdue.' } }
    ],
    isEnabled: true,
    priority: 3,
    executionLogs: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    triggerCount: 0
  }
];

const initialDB: DB = {
  profiles: seedProfiles,
  departments: seedDepartments,
  teams: [],
  projects: [],
  tasks: [],
  chatRooms: seedChatRooms,
  messages: [],
  meetingRooms: [],
  attendance: [],
  leaveRequests: [],
  calendarEvents: [],
  documents: seedDocuments,
  announcements: seedAnnouncements,
  notifications: [],
  notificationPreferences: [],
  activityLogs: [],
  auditLogs: [],
  automationRules: seedAutomationRules,
  workloadSnapshots: [],
  reports: []
};

// ─────────────────────────────────────────────
// DATABASE SERVICE CORE
// ─────────────────────────────────────────────

const DB_KEY = 'enterprise_os_db_v6';
const USER_KEY = 'enterprise_os_current_user';

export const getDb = (): DB => {
  if (typeof window === 'undefined') return initialDB;
  const stored = localStorage.getItem(DB_KEY);
  if (!stored) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  try {
    const parsed = JSON.parse(stored) as DB;
    return {
      ...initialDB,
      ...parsed,
      automationRules: parsed.automationRules || seedAutomationRules,
      workloadSnapshots: parsed.workloadSnapshots || [],
      reports: parsed.reports || [],
      notificationPreferences: parsed.notificationPreferences || [],
    };
  } catch (e) {
    return initialDB;
  }
};

const syncDelta = async (oldDb: DB, newDb: DB) => {
  const tables = [
    { key: 'profiles', dbTable: 'profiles' },
    { key: 'departments', dbTable: 'departments' },
    { key: 'teams', dbTable: 'teams' },
    { key: 'projects', dbTable: 'projects' },
    { key: 'tasks', dbTable: 'tasks' },
    { key: 'chatRooms', dbTable: 'chat_rooms' },
    { key: 'messages', dbTable: 'messages' },
    { key: 'meetingRooms', dbTable: 'meeting_rooms' },
    { key: 'attendance', dbTable: 'attendance' },
    { key: 'leaveRequests', dbTable: 'leave_requests' },
    { key: 'documents', dbTable: 'documents' },
    { key: 'announcements', dbTable: 'announcements' },
    { key: 'auditLogs', dbTable: 'audit_logs' },
    { key: 'activityLogs', dbTable: 'activity_logs' },
    { key: 'automationRules', dbTable: 'automation_rules' },
    { key: 'reports', dbTable: 'reports' },
    { key: 'notificationPreferences', dbTable: 'notification_preferences' },
  ];

  for (const t of tables) {
    const oldList = (oldDb as any)[t.key] || [];
    const newList = (newDb as any)[t.key] || [];
    const oldMap = new Map(oldList.map((x: any) => [x.id, x]));
    const newMap = new Map(newList.map((x: any) => [x.id, x]));

    for (const newItem of newList) {
      const oldItem = oldMap.get(newItem.id);
      if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        pushRecordToSupabase(t.dbTable, newItem);
      }
    }

    for (const oldItem of oldList) {
      if (!newMap.has(oldItem.id)) {
        const isSeededId =
          oldItem.id.startsWith('dept-') ||
          oldItem.id.startsWith('room-') ||
          oldItem.id === 'emp-001' ||
          oldItem.id === 'fld-root-sop' ||
          oldItem.id === 'sop-hr-policy' ||
          oldItem.id === 'sop-it-vpn' ||
          oldItem.id === 'ann-1' ||
          oldItem.id.startsWith('auto-');
        if (!isSeededId) {
          deleteRecordFromSupabase(t.dbTable, oldItem.id);
        }
      }
    }
  }
};

export const saveDb = (db: DB): void => {
  if (typeof window === 'undefined') return;
  const oldStored = localStorage.getItem(DB_KEY);
  localStorage.setItem(DB_KEY, JSON.stringify(db));

  if (isSupabaseConfigured) {
    try {
      const oldDb: DB = oldStored ? JSON.parse(oldStored) : initialDB;
      syncDelta(oldDb, db);
    } catch (e) {
      console.error('[Supabase Sync] Sync delta failed:', e);
    }
  }
};

export const getCurrentUser = (): Profile | null => {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    const storedUser = JSON.parse(userJson) as Profile;
    const db = getDb();
    const current = db.profiles.find(p => p.id === storedUser.id) || null;
    if (current && JSON.stringify(current) !== userJson) {
      localStorage.setItem(USER_KEY, JSON.stringify(current));
    }
    return current;
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = (user: Profile | null): void => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

export const addActivityLog = (profileId: string, action: string, details: string) => {
  const db = getDb();
  const user = db.profiles.find(p => p.id === profileId);
  const log: ActivityLog = {
    id: `log-${Date.now()}`,
    profileId,
    action,
    details,
    ipAddress: '103.45.10.' + Math.floor(Math.random() * 255),
    device: user?.device || 'Desktop / Chrome',
    timestamp: new Date().toISOString()
  };
  db.activityLogs.unshift(log);
  saveDb(db);
};

export const addAuditLog = (
  adminId: string,
  action: string,
  tableName: string,
  rowId: string,
  changes: string,
  options?: {
    targetUserId?: string;
    previousValue?: string;
    newValue?: string;
    module?: string;
    reason?: string;
  }
) => {
  const db = getDb();
  const log: AuditLog = {
    id: `audit-${Date.now()}`,
    adminId,
    action,
    tableName,
    rowId,
    changes,
    targetUserId: options?.targetUserId,
    previousValue: options?.previousValue,
    newValue: options?.newValue,
    module: options?.module,
    reason: options?.reason,
    sessionId: `sess-${Math.random().toString(36).substr(2, 9)}`,
    ipAddress: '103.45.10.' + Math.floor(Math.random() * 255),
    browser: 'Chrome 125',
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  saveDb(db);
};

export const createNotification = (
  profileId: string,
  title: string,
  body: string,
  type: Notification['type'],
  referenceId?: string,
  referenceType?: Notification['referenceType']
) => {
  const db = getDb();
  const notif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    profileId,
    title,
    body,
    type,
    isRead: false,
    referenceId,
    referenceType,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notif);
  saveDb(db);
};