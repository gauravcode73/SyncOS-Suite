-- ====================================================
-- Corporate OS Suite - Supabase Database Schema Setup
-- ====================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  head_id TEXT,
  color TEXT,
  icon TEXT,
  employee_count INTEGER DEFAULT 0
);

-- 2. Profiles Table (RBAC / Onboarding)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  designation TEXT,
  mobile TEXT,
  role TEXT NOT NULL DEFAULT 'Employee',
  manager_id TEXT,
  joining_date TEXT,
  status TEXT NOT NULL DEFAULT 'Pending Approval',
  avatar_url TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  online_status TEXT DEFAULT 'offline',
  last_active TEXT,
  device TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Set department manager foreign key back to profiles
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_head;
ALTER TABLE departments ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  team_lead_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  member_ids JSONB DEFAULT '[]'::jsonb,
  description TEXT
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Planning',
  progress INTEGER DEFAULT 0,
  deadline TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT,
  team_ids JSONB DEFAULT '[]'::jsonb
);

-- 5. Tasks Table (Checklist / Timeline)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'To Do',
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  assignee_ids JSONB DEFAULT '[]'::jsonb,
  start_date TEXT,
  deadline TEXT,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  progress INTEGER DEFAULT 0,
  subtasks JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb
);

-- 6. Chat Rooms Table (Slack channels / DMs)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  member_ids JSONB DEFAULT '[]'::jsonb,
  muted_ids JSONB DEFAULT '[]'::jsonb,
  starred_ids JSONB DEFAULT '[]'::jsonb,
  archived_ids JSONB DEFAULT '[]'::jsonb
);

-- 7. Messages Table (Real-time feed)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  reply_to_id TEXT,
  reactions JSONB DEFAULT '[]'::jsonb,
  read_by JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TEXT,
  updated_at TEXT
);

-- 8. Meeting Rooms Table (WebRTC calls metadata)
CREATE TABLE IF NOT EXISTS meeting_rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  host_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TEXT,
  duration INTEGER DEFAULT 0,
  recording_url TEXT,
  notes TEXT,
  is_muted_all BOOLEAN DEFAULT FALSE,
  is_camera_locked BOOLEAN DEFAULT FALSE,
  waiting_room_ids JSONB DEFAULT '[]'::jsonb,
  participant_ids JSONB DEFAULT '[]'::jsonb,
  active_speakers JSONB DEFAULT '[]'::jsonb,
  chat JSONB DEFAULT '[]'::jsonb,
  raised_hands JSONB DEFAULT '[]'::jsonb
);

-- 9. Attendance Table (Timesheet logs)
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  breaks JSONB DEFAULT '[]'::jsonb,
  working_hours NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Absent',
  late_reason TEXT
);

-- 10. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  approved_by TEXT,
  created_at TEXT
);

-- 11. Documents Table (Cloud Drive / SOP handbook)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT,
  folder_id TEXT,
  is_folder BOOLEAN DEFAULT FALSE,
  size TEXT,
  mime_type TEXT,
  owner_id TEXT,
  is_kb_sop BOOLEAN DEFAULT FALSE,
  kb_category TEXT,
  version INTEGER DEFAULT 1,
  content TEXT,
  shared_with_ids JSONB DEFAULT '[]'::jsonb,
  created_at TEXT,
  updated_at TEXT
);

-- 12. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  acknowledgements JSONB DEFAULT '[]'::jsonb,
  created_at TEXT
);

-- 13. Audit Logs Table (Admin Panel)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  target_user_id TEXT,
  table_name TEXT,
  row_id TEXT,
  changes TEXT,
  timestamp TEXT
);

-- 14. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  device TEXT,
  timestamp TEXT
);

-- ====================================================
-- 📦 SEED DEFAULT WORKSPACE SCHEMA
-- ====================================================

-- Seed Departments
INSERT INTO departments (id, name, description, head_id, color, icon, employee_count) VALUES
('dept-hr', 'HR', 'People operations, recruiting and benefits', NULL, '#ec4899', 'HeartHandshake', 0),
('dept-marketing', 'Marketing', 'Social outreach, campaigns and branding', NULL, '#f59e0b', 'Megaphone', 0),
('dept-sales', 'Sales', 'Enterprise sales and customer accounts', NULL, '#10b981', 'Coins', 0),
('dept-it', 'IT Support', 'System administration, security and software access', NULL, '#3b82f6', 'Laptop', 0),
('dept-development', 'Development', 'Core product engineering and architecture', NULL, '#6366f1', 'Code', 0),
('dept-design', 'Design', 'UI/UX layout, graphics and branding', NULL, '#8b5cf6', 'Palette', 0),
('dept-accounts', 'Accounts', 'Payroll, bookkeeping and billing', NULL, '#14b8a6', 'Calculator', 0),
('dept-logistics', 'Logistics', 'Supply chain management and procurement', NULL, '#6b7280', 'Truck', 0),
('dept-customer', 'Customer Support', 'Customer tickets, chats and documentation', NULL, '#06b6d4', 'Headphones', 0)
ON CONFLICT (id) DO NOTHING;

-- Seed Chat Channels
INSERT INTO chat_rooms (id, name, type, department_id, team_id, project_id, member_ids, muted_ids, starred_ids, archived_ids) VALUES
('room-general', '📢 General Announcement', 'announcement', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
('room-random', '☕ Watercooler Chat', 'department', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
('room-announcements', '📣 Corporate Circulars', 'announcement', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
('room-it', '🛠 IT & Tech Support', 'department', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed SOP Documents
INSERT INTO documents (id, name, file_path, folder_id, is_folder, size, mime_type, owner_id, is_kb_sop, kb_category, version, content, shared_with_ids, created_at, updated_at) VALUES
('fld-root-sop', '📖 Company SOP & Policies', NULL, NULL, TRUE, '--', NULL, 'system', TRUE, NULL, 1, NULL, '[]'::jsonb, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('sop-hr-policy', 'Employee Work Ethics & Leave Policy.md', '/storage/Employee-Ethics-Leave-Policy.md', 'fld-root-sop', FALSE, '15 KB', 'text/markdown', 'system', TRUE, 'HR Policy', 3, '# Company Leave and Working Hour Policies\n\nWelcome to our Company Operating System. Our core work policy requires professional collaboration.\n\n### 1. Working Hours\n- Standard work hours are **9:00 AM to 6:00 PM** local time.\n- Grace period for late entry is **15 minutes**. Check-ins after 9:15 AM are classified as "Late Entry".\n\n### 2. Leaves Allocation\n- Employees receive **18 Paid Leaves** annually (allocated as 1.5 leaves per month).\n- Casual Leaves: Maximum of 2 consecutive days.\n- Sick Leave requests must include a medical note if exceeding 2 consecutive days.\n\n### 3. Collaboration Standard\n- All work chats, file storage, and task assignments MUST occur within this platform.\n- Administrators monitor public channels and audit system tables for compliance.', '[]'::jsonb, '2026-01-10T10:00:00.000Z', '2026-07-05T14:00:00.000Z'),
('sop-it-vpn', 'IT Network VPN & System Setup.md', '/storage/IT-VPN-Setup-SOP.md', 'fld-root-sop', FALSE, '12 KB', 'text/markdown', 'system', TRUE, 'IT SOP', 1, '# IT VPN Access & Security Guidelines\n\nAll employees accessing database nodes, deployment clusters, or testing sandboxes must connect via the corporate VPN.\n\n### Access Prerequisites\n1. Install the OpenVPN client profile downloaded from the IT Support portal.\n2. Enable Multi-Factor Authentication via Authenticator app.\n3. Never share server credentials in private message channels.\n\nFor support, raise a ticket inside the IT Department chat channel or contact Vikram Malhotra.', '[]'::jsonb, '2026-04-12T11:00:00.000Z', '2026-04-12T11:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- 🔒 ROW LEVEL SECURITY (RLS) SETTINGS
-- ====================================================
-- Disable RLS on all tables to allow client-side offline-first sync engine to function cleanly.
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

