'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  CheckCircle,
  Clock,
  HardDrive,
  MessageSquare,
  Video,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Activity,
  CheckSquare
} from 'lucide-react';
import { getDb, saveDb, addActivityLog, addAuditLog, DB } from '@/lib/database/mockDb';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

export default function AdminDashboardPage() {
  const [db, setDb] = useState<DB | null>(null);

  // Admin task review states
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [rejectionComments, setRejectionComments] = useState('');

  const handleVerifyComplete = (taskId: string) => {
    const freshDb = getDb();
    const idx = freshDb.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = freshDb.tasks[idx];
      task.status = 'Completed';
      task.progress = 100;
      task.timeline.push({
        id: `tl-${Date.now()}`,
        action: 'Completed and Verified by Admin',
        profileId: 'admin',
        timestamp: new Date().toISOString()
      });
      saveDb(freshDb);
      addActivityLog('admin', 'Verify Task Complete', `Admin verified task as completed: ${task.name}`);
      setDb(freshDb);
    }
  };

  const handleReturnToSenior = (taskId: string) => {
    const freshDb = getDb();
    const idx = freshDb.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = freshDb.tasks[idx];
      task.status = 'Rejected';
      task.rejectionReason = rejectionComments || 'Returned by Admin for details adjustments.';
      task.timeline.push({
        id: `tl-${Date.now()}`,
        action: 'Changes Requested by Admin',
        profileId: 'admin',
        timestamp: new Date().toISOString()
      });
      saveDb(freshDb);
      addActivityLog('admin', 'Return Task Revision', `Admin returned task for revisions: ${task.name}`);
      setRejectionComments('');
      setDb(freshDb);
    }
  };

  useEffect(() => {
    setDb(getDb());
    const interval = setInterval(() => {
      setDb(getDb());
    }, 5000); // Reload every 5s for real-time simulation
    return () => clearInterval(interval);
  }, []);

  if (!db) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  // Calculate metrics
  const totalEmployees = db.profiles.length;
  const activeEmployees = db.profiles.filter(p => p.status === 'Active').length;
  const onlineEmployees = db.profiles.filter(p => p.onlineStatus === 'online').length;
  const totalDepts = db.departments.length;
  const totalTeams = db.teams.length;
  const totalProjects = db.projects.length;
  const activeProjects = db.projects.filter(p => p.status === 'Active').length;
  
  const totalTasks = db.tasks.length;
  const pendingTasks = db.tasks.filter(t => t.status === 'Assigned' || t.status === 'Accepted').length;
  const inProgressTasks = db.tasks.filter(t => t.status === 'Working' || t.status === 'Review Requested' || t.status === 'Senior Review' || t.status === 'Admin Verification').length;
  const completedTasks = db.tasks.filter(t => t.status === 'Completed').length;
  const pendingAdminVerifications = db.tasks.filter(t => t.status === 'Admin Verification' || t.status === 'Senior Review');
  const pendingAdminCount = pendingAdminVerifications.length;
  
  const totalMeetings = db.meetingRooms.length;
  const todayDateStr = new Date().toISOString().split('T')[0];
  
  const todayMeetings = db.meetingRooms.filter(m => m.scheduledAt && m.scheduledAt.startsWith(todayDateStr)).length;
  const totalFiles = db.documents.filter(d => !d.isFolder).length;
  const leavesToday = db.leaveRequests.filter(l => l.status === 'Approved' && todayDateStr >= l.startDate && todayDateStr <= l.endDate).length;
  const presentToday = db.attendance.filter(a => a.date === todayDateStr && a.status === 'Present').length;

  // Mock activity timelines if database lists are empty
  const activityTimeline = db.activityLogs.slice(0, 8);
  const auditTimeline = db.auditLogs.slice(0, 8);

  // Chart Data preparation
  const employeeGrowthData = [
    { name: 'Jan', count: 1 },
    { name: 'Feb', count: 2 },
    { name: 'Mar', count: 3 },
    { name: 'Apr', count: 5 },
    { name: 'May', count: 7 },
    { name: 'Jun', count: 8 },
    { name: 'Jul', count: totalEmployees }
  ];

  // Department distribution
  const deptData = db.departments.map(d => {
    const count = db.profiles.filter(p => p.departmentId === d.id).length;
    return { name: d.name, value: count || 1 };
  });

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#06b6d4', '#6b7280'];

  // Task trends
  const taskTrendData = [
    { day: 'Mon', completed: 4, assigned: 6 },
    { day: 'Tue', completed: 5, assigned: 8 },
    { day: 'Wed', completed: 8, assigned: 9 },
    { day: 'Thu', completed: 6, assigned: 7 },
    { day: 'Fri', completed: totalTasks > 0 ? completedTasks : 7, assigned: totalTasks > 0 ? totalTasks : 10 },
  ];

  // Productivity metrics
  const productivityData = [
    { week: 'Week 1', rate: 78 },
    { week: 'Week 2', rate: 82 },
    { week: 'Week 3', rate: 85 },
    { week: 'Week 4', rate: 91 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Performance & Control Console</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time indicators, operational charts, and service audit logs.</p>
        </div>
      </div>

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        
        {/* Card 1 */}
        <Link href="/admin/analytics-drilldown?type=employees" className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Headcount</span>
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold">{totalEmployees}</h3>
            <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-0.5">
              <span>{onlineEmployees} Online Now</span>
            </p>
          </div>
        </Link>

        {/* Card 2 */}
        <Link href="/admin/analytics-drilldown?type=departments" className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Departments</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold">{totalDepts}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">{totalTeams} Teams Configured</p>
          </div>
        </Link>

        {/* Card 3 */}
        <Link href="/admin/analytics-drilldown?type=projects" className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Projects</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold">{activeProjects} / {totalProjects}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Total Sprint Deadlines</p>
          </div>
        </Link>

        {/* Card 4 */}
        <Link href="/admin/analytics-drilldown?type=tasks" className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Tasks</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold">{pendingTasks + inProgressTasks}</h3>
            <p className="text-[9px] text-emerald-500 font-bold mt-0.5">{completedTasks} Tasks Completed</p>
          </div>
        </Link>

        {/* Card 5 */}
        <Link href="/admin/analytics-drilldown?type=meetings" className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today Meetings</span>
            <Video className="w-4 h-4 text-pink-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold">{todayMeetings}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">{totalMeetings} Total Meetings</p>
          </div>
        </Link>

        {/* Card 6 */}
        <Link href="/admin/analytics-drilldown?type=storage" className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Storage Files</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold">{totalFiles}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">4.2 GB Storage Committed</p>
          </div>
        </Link>

        {/* Card 7 - Admin Approvals */}
        <button
          onClick={() => { if (pendingAdminCount > 0) setAdminModalOpen(true); }}
          className={`p-4 rounded-2xl flex flex-col justify-between shadow-sm border transition-all cursor-pointer text-left ${
            pendingAdminCount > 0 
              ? 'bg-amber-500/10 border-amber-500/35 hover:shadow-md' 
              : 'bg-card border-border hover:border-violet-500/40 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider">Admin Approvals</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold flex items-center gap-2">
              {pendingAdminCount}
              {pendingAdminCount > 0 && <span className="animate-ping w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Click to verify submissions</p>
          </div>
        </button>
      </div>

      {/* CHARTS CONTAINER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Employee Growth Area Chart */}
        <div className="lg:col-span-8 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Headcount growth curve</h4>
            <span className="text-[10px] bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full font-semibold">Real-time</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={employeeGrowthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department-wise Distribution Pie Chart */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Department distribution</h4>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-[10px] text-slate-400">
            {deptData.map((d, index) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* SECOND CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Task Completion Trends - Bar Chart */}
        <div className="lg:col-span-6 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Task completion trend</h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
                <Bar dataKey="assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Productivity - Line Chart */}
        <div className="lg:col-span-6 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Weekly productivity metrics (%)</h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="week" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[50, 100]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
                <Line type="monotone" dataKey="rate" stroke="#ec4899" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SYSTEM LOGS & FEEDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Live Activity Timeline */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <Activity className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-bold">Live Activity Feed</h4>
          </div>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {activityTimeline.length === 0 ? (
              <p className="text-xs text-slate-500">No activity registered recently.</p>
            ) : (
              activityTimeline.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-background shrink-0 mt-1" />
                    <span className="w-0.5 flex-1 bg-border/60" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold text-slate-300">Action: {log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Admin Audit Logs */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-bold">Admin Console Audit Registry</h4>
          </div>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {auditTimeline.length === 0 ? (
              <p className="text-xs text-slate-500">No auditing logs registered.</p>
            ) : (
              auditTimeline.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background shrink-0 mt-1" />
                    <span className="w-0.5 flex-1 bg-border/60" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold text-slate-350">Admin: {log.adminId}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{log.changes}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Admin Verification Approvals Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl text-xs space-y-4 text-foreground flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                <span className="p-1 rounded bg-amber-500/10 text-amber-500 font-extrabold text-[10px]">🛠</span>
                Pending Admin Task Verifications
              </h3>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="text-slate-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingAdminVerifications.map(t => {
                const assignee = db.profiles.find(p => p.id === t.assigneeIds[0]);
                const project = db.projects.find(p => p.id === t.projectId);
                const senior = db.profiles.find(p => p.id === t.seniorId);
                return (
                  <div key={t.id} className="p-4 border border-border rounded-xl bg-background/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{t.name}</h4>
                        <p className="text-[10px] text-slate-450 mt-0.5">
                          Project: <span className="font-bold text-foreground">{project?.name || 'Workspace'}</span> • 
                          Assignee: <span className="font-bold text-violet-500">{assignee?.name || 'Staff'}</span> • 
                          Senior reviewer: <span className="font-bold text-indigo-400">{senior?.name || 'Reviewer'}</span>
                        </p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                        t.priority === 'High' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-355'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    {t.description && (
                      <div className="bg-slate-100/50 dark:bg-slate-900/30 p-2.5 rounded text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed border border-border/50">
                        <span className="font-bold block text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Task description:</span>
                        {t.description}
                      </div>
                    )}

                    {t.submissionNotes && (
                      <div className="bg-violet-500/5 dark:bg-violet-950/20 p-2.5 rounded text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed border border-violet-500/15">
                        <span className="font-bold block text-violet-500 text-[9px] uppercase tracking-wider mb-0.5">Submitted Notes / Files Links:</span>
                        {t.submissionNotes}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Remarks / Rejection details (required only for returning changes)..."
                        onChange={(e) => setRejectionComments(e.target.value)}
                        className="flex-1 bg-slate-100 dark:bg-slate-900 border border-border rounded px-3 py-1.5 outline-none text-foreground"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleReturnToSenior(t.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg font-bold cursor-pointer text-[10px]"
                        >
                          Request Senior Revisions
                        </button>
                        <button
                          onClick={() => handleVerifyComplete(t.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-bold cursor-pointer text-[10px]"
                        >
                          Verify & Complete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {pendingAdminVerifications.length === 0 && (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <p className="font-bold text-sm">All verification tasks cleared! 🎉</p>
                  <p className="text-xs">No pending admin task approvals at this time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
