import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  Profile,
  Department,
  Team,
  Project,
  Task,
  ChatRoom,
  Message,
  MeetingRoom,
  Attendance,
  LeaveRequest,
  DocumentFile,
  Announcement,
  AuditLog,
  ActivityLog,
  DB
} from './mockDb';

// ====================================================
// 🔄 CONVERTER LAYERS (camelCase ⇆ snake_case)
// ====================================================

const parseJsonArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
    } catch (e) {
      if (val.trim()) return [val.trim()];
    }
  }
  return [];
};

// 1. Profile
const mapProfileFromDb = (p: any): Profile => ({
  id: p.id,
  employeeId: p.employee_id || '',
  name: p.name || '',
  email: p.email || '',
  departmentId: p.department_id || null,
  teamId: p.team_id || null,
  designation: p.designation || '',
  mobile: p.mobile || '',
  role: p.role || 'Employee',
  managerId: p.manager_id || null,
  joiningDate: p.joining_date || '',
  status: p.status || 'Pending Approval',
  avatarUrl: p.avatar_url || '',
  skills: Array.isArray(p.skills) ? p.skills : [],
  documents: Array.isArray(p.documents) ? p.documents : [],
  onlineStatus: p.online_status || 'offline',
  lastActive: p.last_active || '',
  device: p.device || '',
  location: p.location || ''
});

const mapProfileToDb = (p: Profile): any => ({
  id: p.id,
  employee_id: p.employeeId,
  name: p.name,
  email: p.email,
  department_id: p.departmentId,
  team_id: p.teamId,
  designation: p.designation,
  mobile: p.mobile,
  role: p.role,
  manager_id: p.managerId,
  joining_date: p.joiningDate,
  status: p.status,
  avatar_url: p.avatarUrl,
  skills: p.skills,
  documents: p.documents,
  online_status: p.onlineStatus,
  last_active: p.lastActive,
  device: p.device,
  location: p.location
});

// 2. Department
const mapDepartmentFromDb = (d: any): Department => ({
  id: d.id,
  name: d.name,
  description: d.description || '',
  headId: d.head_id || null,
  color: d.color || '#3b82f6',
  icon: d.icon || 'Laptop',
  employeeCount: d.employee_count || 0
});

const mapDepartmentToDb = (d: Department): any => ({
  id: d.id,
  name: d.name,
  description: d.description,
  head_id: d.headId,
  color: d.color,
  icon: d.icon,
  employee_count: d.employeeCount
});

// 3. Team
const mapTeamFromDb = (t: any): Team => ({
  id: t.id,
  name: t.name,
  departmentId: t.department_id || '',
  teamLeadId: t.team_lead_id || null,
  memberIds: Array.isArray(t.member_ids) ? t.member_ids : [],
  description: t.description || ''
});

const mapTeamToDb = (t: Team): any => ({
  id: t.id,
  name: t.name,
  department_id: t.departmentId,
  team_lead_id: t.teamLeadId,
  member_ids: t.memberIds,
  description: t.description
});

// 4. Project
const mapProjectFromDb = (p: any): Project => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  departmentId: p.department_id || null,
  status: p.status || 'Planning',
  progress: p.progress || 0,
  deadline: p.deadline || '',
  createdBy: p.created_by || '',
  createdAt: p.created_at || '',
  teamIds: Array.isArray(p.team_ids) ? p.team_ids : []
});

const mapProjectToDb = (p: Project): any => ({
  id: p.id,
  name: p.name,
  description: p.description,
  department_id: p.departmentId,
  status: p.status,
  progress: p.progress,
  deadline: p.deadline,
  created_by: p.createdBy,
  created_at: p.createdAt,
  team_ids: p.teamIds
});

// 5. Task
const mapTaskFromDb = (t: any): Task => ({
  id: t.id,
  projectId: t.project_id || null,
  name: t.name,
  description: t.description || '',
  priority: t.priority || 'Medium',
  status: t.status || 'Assigned',
  departmentId: t.department_id || null,
  teamId: t.team_id || null,
  assigneeIds: parseJsonArray(t.assignee_ids),
  seniorId: t.senior_id || null,
  qaReviewerId: t.qa_reviewer_id || null,
  requiresQA: t.requires_qa || false,
  rejectionReason: t.rejection_reason || null,
  submissionNotes: t.submission_notes || null,
  dependencyTaskId: t.dependency_task_id || null,
  startDate: t.start_date || '',
  deadline: t.deadline || '',
  estimatedHours: Number(t.estimated_hours || 0),
  actualHours: Number(t.actual_hours || 0),
  progress: t.progress || 0,
  tags: parseJsonArray(t.tags),
  subtasks: parseJsonArray(t.subtasks),
  checklist: parseJsonArray(t.checklist),
  comments: parseJsonArray(t.comments),
  attachments: parseJsonArray(t.attachments),
  timeline: parseJsonArray(t.timeline),
  isDeleted: t.is_deleted || false,
  deletedAt: t.deleted_at || undefined,
  completedAt: t.completed_at || undefined,
});

const mapTaskToDb = (t: Task): any => ({
  id: t.id,
  project_id: t.projectId,
  name: t.name,
  description: t.description,
  priority: t.priority,
  status: t.status,
  department_id: t.departmentId,
  team_id: t.teamId,
  assignee_ids: t.assigneeIds,
  senior_id: t.seniorId,
  qa_reviewer_id: t.qaReviewerId,
  requires_qa: t.requiresQA,
  rejection_reason: t.rejectionReason,
  submission_notes: t.submissionNotes,
  start_date: t.startDate,
  deadline: t.deadline,
  estimated_hours: t.estimatedHours,
  actual_hours: t.actualHours,
  progress: t.progress,
  tags: t.tags,
  subtasks: t.subtasks,
  checklist: t.checklist,
  comments: t.comments,
  attachments: t.attachments,
  timeline: t.timeline,
  is_deleted: t.isDeleted,
  deleted_at: t.deletedAt,
  completed_at: t.completedAt,
  // dependency_task_id stored in JSONB as part of metadata
});

// 6. ChatRoom
const mapChatRoomFromDb = (c: any): ChatRoom => ({
  id: c.id,
  name: c.name || null,
  type: c.type || 'direct',
  departmentId: c.department_id || undefined,
  teamId: c.team_id || undefined,
  projectId: c.project_id || undefined,
  memberIds: Array.isArray(c.member_ids) ? c.member_ids : [],
  mutedIds: Array.isArray(c.muted_ids) ? c.muted_ids : [],
  starredIds: Array.isArray(c.starred_ids) ? c.starred_ids : [],
  archivedIds: Array.isArray(c.archived_ids) ? c.archived_ids : []
});

const mapChatRoomToDb = (c: ChatRoom): any => ({
  id: c.id,
  name: c.name,
  type: c.type,
  department_id: c.departmentId,
  team_id: c.teamId,
  project_id: c.projectId,
  member_ids: c.memberIds,
  muted_ids: c.mutedIds,
  starred_ids: c.starredIds,
  archived_ids: c.archivedIds
});

// 7. Message
const mapMessageFromDb = (m: any): Message => ({
  id: m.id,
  roomId: m.room_id,
  senderId: m.sender_id,
  content: m.content,
  type: m.type || 'text',
  fileUrl: m.file_url || undefined,
  fileName: m.file_name || undefined,
  fileSize: m.file_size || undefined,
  replyToId: m.reply_to_id || null,
  reactions: Array.isArray(m.reactions) ? m.reactions : [],
  readBy: Array.isArray(m.read_by) ? m.read_by : [],
  isEdited: m.is_edited || false,
  isDeleted: m.is_deleted || false,
  createdAt: m.created_at || '',
  updatedAt: m.updated_at || ''
});

const mapMessageToDb = (m: Message): any => ({
  id: m.id,
  room_id: m.roomId,
  sender_id: m.senderId,
  content: m.content,
  type: m.type,
  file_url: m.fileUrl,
  file_name: m.fileName,
  file_size: m.fileSize,
  reply_to_id: m.replyToId,
  reactions: m.reactions,
  read_by: m.readBy,
  is_edited: m.isEdited,
  is_deleted: m.isDeleted,
  created_at: m.createdAt,
  updated_at: m.updatedAt
});

// 8. MeetingRoom
const mapMeetingRoomFromDb = (m: any): MeetingRoom => ({
  id: m.id,
  title: m.title,
  hostId: m.host_id || '',
  status: m.status || 'scheduled',
  scheduledAt: m.scheduled_at || '',
  duration: m.duration || 0,
  recordingUrl: m.recording_url || undefined,
  notes: m.notes || undefined,
  isMutedAll: m.is_muted_all || false,
  isCameraLocked: m.is_camera_locked || false,
  waitingRoomIds: Array.isArray(m.waiting_room_ids) ? m.waiting_room_ids : [],
  participantIds: Array.isArray(m.participant_ids) ? m.participant_ids : [],
  activeSpeakers: Array.isArray(m.active_speakers) ? m.active_speakers : [],
  chat: Array.isArray(m.chat) ? m.chat : [],
  raisedHands: Array.isArray(m.raised_hands) ? m.raised_hands : []
});

const mapMeetingRoomToDb = (m: MeetingRoom): any => ({
  id: m.id,
  title: m.title,
  host_id: m.hostId,
  status: m.status,
  scheduled_at: m.scheduledAt,
  duration: m.duration,
  recording_url: m.recordingUrl,
  notes: m.notes,
  is_muted_all: m.isMutedAll,
  is_camera_locked: m.isCameraLocked,
  waiting_room_ids: m.waitingRoomIds,
  participant_ids: m.participantIds,
  active_speakers: m.activeSpeakers,
  chat: m.chat,
  raised_hands: m.raisedHands
});

// 9. Attendance
const mapAttendanceFromDb = (a: any): Attendance => ({
  id: a.id,
  profileId: a.profile_id,
  date: a.date,
  checkIn: a.check_in || null,
  checkOut: a.check_out || null,
  breaks: Array.isArray(a.breaks) ? a.breaks : [],
  workingHours: Number(a.working_hours || 0),
  status: a.status || 'Absent',
  lateReason: a.late_reason || undefined
});

const mapAttendanceToDb = (a: Attendance): any => ({
  id: a.id,
  profile_id: a.profileId,
  date: a.date,
  check_in: a.checkIn,
  check_out: a.checkOut,
  breaks: a.breaks,
  working_hours: a.workingHours,
  status: a.status,
  late_reason: a.lateReason
});

// 10. LeaveRequest
const mapLeaveRequestFromDb = (l: any): LeaveRequest => ({
  id: l.id,
  profileId: l.profile_id,
  type: l.type || 'Casual',
  startDate: l.start_date || '',
  endDate: l.end_date || '',
  reason: l.reason || '',
  status: l.status || 'Pending',
  approvedBy: l.approved_by || null,
  createdAt: l.created_at || ''
});

const mapLeaveRequestToDb = (l: LeaveRequest): any => ({
  id: l.id,
  profile_id: l.profileId,
  type: l.type,
  start_date: l.startDate,
  end_date: l.endDate,
  reason: l.reason,
  status: l.status,
  approved_by: l.approvedBy,
  created_at: l.createdAt
});

// 11. DocumentFile
const mapDocumentFromDb = (d: any): DocumentFile => ({
  id: d.id,
  name: d.name,
  filePath: d.file_path || null,
  folderId: d.folder_id || null,
  isFolder: d.is_folder || false,
  size: d.size || '--',
  mimeType: d.mime_type || undefined,
  ownerId: d.owner_id || 'system',
  isKbSop: d.is_kb_sop || false,
  kbCategory: d.kb_category || undefined,
  version: d.version || 1,
  content: d.content || undefined,
  sharedWithIds: Array.isArray(d.shared_with_ids) ? d.shared_with_ids : [],
  createdAt: d.created_at || '',
  updatedAt: d.updated_at || ''
});

const mapDocumentToDb = (d: DocumentFile): any => ({
  id: d.id,
  name: d.name,
  file_path: d.filePath,
  folder_id: d.folderId,
  is_folder: d.isFolder,
  size: d.size,
  mime_type: d.mimeType,
  owner_id: d.ownerId,
  is_kb_sop: d.isKbSop,
  kb_category: d.kbCategory,
  version: d.version,
  content: d.content,
  shared_with_ids: d.sharedWithIds,
  created_at: d.createdAt,
  updated_at: d.updatedAt
});

// 12. Announcement
const mapAnnouncementFromDb = (a: any): Announcement => ({
  id: a.id,
  title: a.title,
  content: a.content,
  type: a.type || 'circular',
  pinned: a.pinned || false,
  createdBy: a.created_by || 'system',
  acknowledgements: Array.isArray(a.acknowledgements) ? a.acknowledgements : [],
  createdAt: a.created_at || ''
});

const mapAnnouncementToDb = (a: Announcement): any => ({
  id: a.id,
  title: a.title,
  content: a.content,
  type: a.type,
  pinned: a.pinned,
  created_by: a.createdBy,
  acknowledgements: a.acknowledgements,
  created_at: a.createdAt
});

// 13. AuditLog
const mapAuditLogFromDb = (a: any): AuditLog => ({
  id: a.id,
  adminId: a.admin_id || '',
  action: a.action,
  targetUserId: a.target_user_id || undefined,
  tableName: a.table_name || '',
  rowId: a.row_id || '',
  changes: a.changes || '',
  timestamp: a.timestamp || ''
});

const mapAuditLogToDb = (a: AuditLog): any => ({
  id: a.id,
  admin_id: a.adminId,
  action: a.action,
  target_user_id: a.targetUserId,
  table_name: a.tableName,
  row_id: a.rowId,
  changes: a.changes,
  timestamp: a.timestamp
});

// 14. ActivityLog
const mapActivityLogFromDb = (a: any): ActivityLog => ({
  id: a.id,
  profileId: a.profile_id || '',
  action: a.action,
  details: a.details || '',
  ipAddress: a.ip_address || '',
  device: a.device || '',
  timestamp: a.timestamp || ''
});

const mapActivityLogToDb = (a: ActivityLog): any => ({
  id: a.id,
  profile_id: a.profileId,
  action: a.action,
  details: a.details,
  ip_address: a.ipAddress,
  device: a.device,
  timestamp: a.timestamp
});

// ====================================================
// 🚀 BACKGROUND SYNC ENGINE
// ====================================================

const safeSelect = async (tableName: string): Promise<any[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      console.warn(`[Supabase Sync] Failed to select from table ${tableName}:`, error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`[Supabase Sync] Error selecting from table ${tableName}:`, e);
    return [];
  }
};

// 1. PULL ENTIRE CLOUD DATABASE
export const pullFromSupabase = async (): Promise<Partial<DB> | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const [
      profiles,
      departments,
      teams,
      projects,
      tasks,
      rooms,
      messages,
      meetings,
      attendance,
      leaves,
      docs,
      announcements,
      audit,
      activity
    ] = await Promise.all([
      safeSelect('profiles'),
      safeSelect('departments'),
      safeSelect('teams'),
      safeSelect('projects'),
      safeSelect('tasks'),
      safeSelect('chat_rooms'),
      safeSelect('messages'),
      safeSelect('meeting_rooms'),
      safeSelect('attendance'),
      safeSelect('leave_requests'),
      safeSelect('documents'),
      safeSelect('announcements'),
      safeSelect('audit_logs'),
      safeSelect('activity_logs')
    ]);

    return {
      profiles: profiles.map(mapProfileFromDb),
      departments: departments.map(mapDepartmentFromDb),
      teams: teams.map(mapTeamFromDb),
      projects: projects.map(mapProjectFromDb),
      tasks: tasks.map(mapTaskFromDb),
      chatRooms: rooms.map(mapChatRoomFromDb),
      messages: messages.map(mapMessageFromDb),
      meetingRooms: meetings.map(mapMeetingRoomFromDb),
      attendance: attendance.map(mapAttendanceFromDb),
      leaveRequests: leaves.map(mapLeaveRequestFromDb),
      documents: docs.map(mapDocumentFromDb),
      announcements: announcements.map(mapAnnouncementFromDb),
      notifications: [], // notifications handled client-only
      activityLogs: activity.map(mapActivityLogFromDb),
      auditLogs: audit.map(mapAuditLogFromDb)
    };
  } catch (e) {
    console.error('[Supabase Sync] Pull query execution failed:', e);
    return null;
  }
};

// 2. PUSH RECORD CHANGES (UPSERT)
export const pushRecordToSupabase = async (tableName: string, data: any): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    let mapped = data;
    if (tableName === 'profiles') mapped = mapProfileToDb(data);
    else if (tableName === 'departments') mapped = mapDepartmentToDb(data);
    else if (tableName === 'teams') mapped = mapTeamToDb(data);
    else if (tableName === 'projects') mapped = mapProjectToDb(data);
    else if (tableName === 'tasks') mapped = mapTaskToDb(data);
    else if (tableName === 'chat_rooms') mapped = mapChatRoomToDb(data);
    else if (tableName === 'messages') mapped = mapMessageToDb(data);
    else if (tableName === 'meeting_rooms') mapped = mapMeetingRoomToDb(data);
    else if (tableName === 'attendance') mapped = mapAttendanceToDb(data);
    else if (tableName === 'leave_requests') mapped = mapLeaveRequestToDb(data);
    else if (tableName === 'documents') mapped = mapDocumentToDb(data);
    else if (tableName === 'announcements') mapped = mapAnnouncementToDb(data);
    else if (tableName === 'audit_logs') mapped = mapAuditLogToDb(data);
    else if (tableName === 'activity_logs') mapped = mapActivityLogToDb(data);

    const { error } = await supabase.from(tableName).upsert(mapped);
    if (error) {
      const message = error?.message || '';
      const isMissingTable = message.includes('does not exist') || message.includes('schema cache') || message.includes('Could not find the table');
      const isMissingColumn = message.includes('Could not find the') && message.includes('column');
      if (!isMissingTable && !isMissingColumn) {
        console.error(`[Supabase Sync] Upsert to ${tableName} failed:`, message, error);
      }
    }
  } catch (err) {
    console.error(`[Supabase Sync] Error during upsert task to ${tableName}:`, err);
  }
};

// 3. DELETE RECORD FROM CLOUD
export const deleteRecordFromSupabase = async (tableName: string, id: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      const message = error?.message || '';
      const isMissingTable = message.includes('does not exist') || message.includes('schema cache') || message.includes('Could not find the table');
      if (!isMissingTable) {
        console.error(`[Supabase Sync] Deletion from ${tableName} failed:`, message, error);
      }
    }
  } catch (err) {
    console.error(`[Supabase Sync] Error during deletion task from ${tableName}:`, err);
  }
};

// 4. PUSH ALL LOCAL DATA TO CLOUD (INITIAL SEED)
export const pushAllToSupabase = async (db: DB): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;

  console.log('[Supabase Sync] Starting cloud database initialization with local data...');

  const tables = [
    { key: 'departments', dbTable: 'departments' },
    { key: 'profiles', dbTable: 'profiles' },
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
    const list = (db as any)[t.key] || [];
    for (const item of list) {
      await pushRecordToSupabase(t.dbTable, item);
    }
  }

  console.log('[Supabase Sync] Cloud database initialization complete.');
};

