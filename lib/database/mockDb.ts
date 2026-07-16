// Mock Database Service Layer for Enterprise Platform (Slack + ClickUp + Teams + Meet + HRMS)
// Persists in localStorage on the client side
import { isSupabaseConfigured } from './supabaseClient';
import { pushRecordToSupabase, deleteRecordFromSupabase } from './supabaseSync';

export interface Profile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  departmentId: string | null;
  designation: string;
  mobile: string;
  role: 'Super Admin' | 'HR Admin' | 'Department Admin' | 'Manager' | 'Team Lead' | 'Employee' | 'Guest';
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
}

export interface Department {
  id: string;
  name: string;
  description: string;
  headId: string | null;
  color: string; // HEX or Tailwind color class
  icon: string; // Lucide icon name
  employeeCount: number;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  teamLeadId: string | null;
  memberIds: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  departmentId: string | null;
  status: 'Planning' | 'Active' | 'Paused' | 'Completed' | 'Archived';
  progress: number; // percentage
  deadline: string;
  createdBy: string;
  createdAt: string;
  teamIds: string[];
}

export interface Task {
  id: string;
  projectId: string | null;
  name: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  departmentId: string | null;
  assigneeIds: string[];
  startDate: string;
  deadline: string;
  estimatedHours: number;
  actualHours: number;
  progress: number; // 0 to 100
  subtasks: { id: string; name: string; isCompleted: boolean }[];
  checklist: { id: string; item: string; isChecked: boolean }[];
  comments: { id: string; profileId: string; content: string; createdAt: string }[];
  attachments: { id: string; name: string; url: string; size: string; type: string; uploadedBy: string; uploadedAt: string }[];
  timeline: { id: string; action: string; profileId: string; timestamp: string }[];
}

export interface ChatRoom {
  id: string;
  name: string | null; // null for direct messages
  type: 'direct' | 'department' | 'team' | 'project' | 'announcement';
  departmentId?: string;
  teamId?: string;
  projectId?: string;
  memberIds: string[];
  mutedIds?: string[];
  starredIds?: string[];
  archivedIds?: string[];
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  replyToId?: string | null;
  reactions: { emoji: string; profileIds: string[] }[];
  readBy: { profileId: string; timestamp: string }[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRoom {
  id: string;
  title: string;
  hostId: string;
  status: 'scheduled' | 'active' | 'completed';
  scheduledAt: string;
  duration: number; // minutes
  recordingUrl?: string;
  notes?: string;
  isMutedAll?: boolean;
  isCameraLocked?: boolean;
  waitingRoomIds: string[];
  participantIds: string[];
  activeSpeakers?: string[];
  chat: { id: string; profileId: string; content: string; createdAt: string }[];
  raisedHands: string[]; // profileIds
}

export interface Attendance {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // ISO Timestamp
  checkOut: string | null; // ISO Timestamp
  breaks: { start: string; end: string | null }[];
  workingHours: number; // decimal hours
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
  startTime: string; // ISO
  endTime: string; // ISO
  type: 'meeting' | 'leave' | 'birthday' | 'holiday' | 'event' | 'task_deadline';
  createdBy: string;
  departmentId?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  filePath: string | null; // null if folder
  folderId: string | null; // recursive parent
  isFolder: boolean;
  size: string;
  mimeType?: string;
  ownerId: string;
  isKbSop: boolean;
  kbCategory?: 'HR Policy' | 'IT SOP' | 'Design Guideline' | 'Sales Manual' | 'Security';
  version: number;
  content?: string; // markdown content for SOP or files
  history?: { version: number; updatedAt: string; updatedBy: string; description: string }[];
  sharedWithIds: string[]; // empty means private to owner, or globally visible if isKbSop
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'circular' | 'event' | 'poll';
  pollOptions?: { id: string; text: string }[];
  pollVotes?: { [optionId: string]: string[] }; // optionId -> list of userIds
  pinned: boolean;
  createdBy: string;
  acknowledgements: string[]; // profileIds
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
  timestamp: string;
}

export interface Notification {
  id: string;
  profileId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  referenceId?: string;
  createdAt: string;
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
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
}

// ----------------------------------------------------
// INITIAL SEED DATA
// ----------------------------------------------------
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
    lastActive: new Date().toISOString()
  }
];


const seedTeams: Team[] = [];

const seedProjects: Project[] = [];

const seedTasks: Task[] = [];

const seedChatRooms: ChatRoom[] = [
  { id: 'room-general', name: '📢 General Announcement', type: 'announcement', memberIds: [], mutedIds: [] },
  { id: 'room-random', name: '☕ Watercooler Chat', type: 'department', memberIds: [], mutedIds: [] },
  { id: 'room-announcements', name: '📣 Corporate Circulars', type: 'announcement', memberIds: [], mutedIds: [] },
  { id: 'room-it', name: '🛠 IT & Tech Support', type: 'department', memberIds: [], mutedIds: [] }
];

const seedMessages: Message[] = [];

const seedMeetingRooms: MeetingRoom[] = [];

const generateSeedAttendance = (): Attendance[] => {
  return [];
};

const seedAttendance = generateSeedAttendance();

const seedLeaveRequests: LeaveRequest[] = [];

const seedCalendarEvents: CalendarEvent[] = [];

const seedDocuments: DocumentFile[] = [
  { id: 'fld-root-sop', name: '📖 Company SOP & Policies', filePath: null, folderId: null, isFolder: true, size: '--', ownerId: 'system', isKbSop: true, version: 1, sharedWithIds: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
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
    content: `# Company Leave and Working Hour Policies\n\nWelcome to our Company Operating System. Our core work policy requires professional collaboration.\n\n### 1. Working Hours\n- Standard work hours are **9:00 AM to 6:00 PM** local time.\n- Grace period for late entry is **15 minutes**. Check-ins after 9:15 AM are classified as "Late Entry".\n\n### 2. Leaves Allocation\n- Employees receive **18 Paid Leaves** annually (allocated as 1.5 leaves per month).\n- Casual Leaves: Maximum of 2 consecutive days.\n- Sick Leave requests must include a medical note if exceeding 2 consecutive days.\n\n### 3. Collaboration Standard\n- All work chats, file storage, and task assignments MUST occur within this platform.\n- Administrators monitor public channels and audit system tables for compliance.`,
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
    content: `# IT VPN Access & Security Guidelines\n\nAll employees accessing database nodes, deployment clusters, or testing sandboxes must connect via the corporate VPN.\n\n### Access Prerequisites\n1. Install the OpenVPN client profile downloaded from the IT Support portal.\n2. Enable Multi-Factor Authentication via Authenticator app.\n3. Never share server credentials in private message channels.\n\nFor support, raise a ticket inside the IT Department chat channel or contact Vikram Malhotra.`,
    sharedWithIds: [],
    createdAt: '2026-04-12T11:00:00.000Z',
    updatedAt: '2026-04-12T11:00:00.000Z'
  }
];

const seedAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Platform System Migration Complete',
    content: 'We have fully migrated all internal services to this collaborative application dashboard. Please conduct all conversations, file sharing, and task progress reports here. Email and external chat groups are deprecated for internal communications.',
    type: 'circular',
    pinned: true,
    createdBy: 'system',
    acknowledgements: [],
    createdAt: '2026-07-15T09:00:00.000Z'
  }
];

const seedActivityLogs: ActivityLog[] = [];
const seedAuditLogs: AuditLog[] = [];

const initialDB: DB = {
  profiles: seedProfiles,
  departments: seedDepartments,
  teams: seedTeams,
  projects: seedProjects,
  tasks: seedTasks,
  chatRooms: seedChatRooms,
  messages: seedMessages,
  meetingRooms: seedMeetingRooms,
  attendance: seedAttendance,
  leaveRequests: seedLeaveRequests,
  calendarEvents: seedCalendarEvents,
  documents: seedDocuments,
  announcements: seedAnnouncements,
  notifications: [],
  activityLogs: seedActivityLogs,
  auditLogs: seedAuditLogs
};

// ----------------------------------------------------
// DATABASE SERVICE CORE
// ----------------------------------------------------
const DB_KEY = 'enterprise_os_db_v5';
const USER_KEY = 'enterprise_os_current_user';

export const getDb = (): DB => {
  if (typeof window === 'undefined') return initialDB;
  const stored = localStorage.getItem(DB_KEY);
  if (!stored) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  try {
    return JSON.parse(stored);
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
    { key: 'activityLogs', dbTable: 'activity_logs' }
  ];

  for (const t of tables) {
    const oldList = (oldDb as any)[t.key] || [];
    const newList = (newDb as any)[t.key] || [];

    const oldMap = new Map(oldList.map((x: any) => [x.id, x]));
    const newMap = new Map(newList.map((x: any) => [x.id, x]));

    // Find upserts
    for (const newItem of newList) {
      const oldItem = oldMap.get(newItem.id);
      if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        pushRecordToSupabase(t.dbTable, newItem);
      }
    }

    // Find deletes
    for (const oldItem of oldList) {
      if (!newMap.has(oldItem.id)) {
        deleteRecordFromSupabase(t.dbTable, oldItem.id);
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
  if (!userJson) {
    // Default logged-in user is Vikram (Super Admin) for easy first-glance testing
    const db = getDb();
    const defaultUser = db.profiles.find(p => p.id === 'emp-001') || null;
    if (defaultUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(defaultUser));
    }
    return defaultUser;
  }
  try {
    const storedUser = JSON.parse(userJson) as Profile;
    // Sync with DB in case of update
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

// Log activity wrapper
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

// Log audit wrapper (admin auditing changes)
export const addAuditLog = (adminId: string, action: string, tableName: string, rowId: string, changes: string, targetUserId?: string) => {
  const db = getDb();
  const log: AuditLog = {
    id: `audit-${Date.now()}`,
    adminId,
    action,
    targetUserId,
    tableName,
    rowId,
    changes,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  saveDb(db);
};
