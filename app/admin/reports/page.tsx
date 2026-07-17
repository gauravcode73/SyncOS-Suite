'use client';
import React, { useState } from 'react';
import { BarChart3, Download, Filter, Calendar, Users, Building, CheckSquare, FileText, Clock, TrendingUp, Printer, Plus, X } from 'lucide-react';
import { getDb, saveDb, getCurrentUser, Report } from '@/lib/database/mockDb';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';

const REPORT_TYPES = [
  { key: 'employees', label: 'Employee Report', icon: Users, color: '#6366f1' },
  { key: 'departments', label: 'Department Report', icon: Building, color: '#f59e0b' },
  { key: 'tasks', label: 'Task Report', icon: CheckSquare, color: '#10b981' },
  { key: 'projects', label: 'Project Report', icon: FileText, color: '#3b82f6' },
  { key: 'attendance', label: 'Attendance Report', icon: Clock, color: '#ec4899' },
  { key: 'productivity', label: 'Productivity Report', icon: TrendingUp, color: '#8b5cf6' },
  { key: 'leaves', label: 'Leave Management', icon: Calendar, color: '#14b8a6' },
] as const;

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#06b6d4'];

export default function AdminReportsPage() {
  const [db] = useState(() => getDb());
  const [selectedType, setSelectedType] = useState<string>('tasks');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [savedReports, setSavedReports] = useState(() => getDb().reports);
  const user = getCurrentUser();

  // ── Chart Data Generators ──────────────────────
  const tasksByStatus = (() => {
    const counts: Record<string, number> = {};
    db.tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const tasksByPriority = [
    { name: 'Low', value: db.tasks.filter(t => t.priority === 'Low').length },
    { name: 'Medium', value: db.tasks.filter(t => t.priority === 'Medium').length },
    { name: 'High', value: db.tasks.filter(t => t.priority === 'High').length },
    { name: 'Urgent', value: db.tasks.filter(t => t.priority === 'Urgent').length },
  ].filter(d => d.value > 0);

  const employeesByDept = db.departments.map(d => ({
    name: d.name.substring(0, 8),
    count: db.profiles.filter(p => p.departmentId === d.id && p.status === 'Active').length
  })).filter(d => d.count > 0);

  const projectProgress = db.projects.map(p => ({ name: p.name.substring(0, 12), progress: p.progress }));

  const attendanceData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => ({
    day,
    present: Math.floor(Math.random() * 5) + (db.profiles.length - 2),
    absent: Math.floor(Math.random() * 2),
    late: Math.floor(Math.random() * 2),
  }));

  const productivityData = db.departments.map(d => ({
    name: d.name.substring(0, 10),
    score: 65 + Math.floor(Math.random() * 30),
  }));

  const leaveData = ['Casual', 'Sick', 'Annual', 'Unpaid'].map(type => ({
    name: type,
    value: db.leaveRequests.filter(l => l.type === type).length || Math.floor(Math.random() * 5),
  }));

  const renderChart = () => {
    switch (selectedType) {
      case 'tasks':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4">Tasks by Status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tasksByStatus}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4">Tasks by Priority</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={tasksByPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {tasksByPriority.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'employees':
        return (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Employees per Department</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={employeesByDept}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'projects':
        return (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Project Progress</h3>
            {projectProgress.length === 0 ? <p className="text-center text-slate-500 py-8">No projects yet</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projectProgress} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="progress" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      case 'attendance':
        return (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Weekly Attendance</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'productivity':
        return (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Department Productivity Scores</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productivityData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'leaves':
        return (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Leave Distribution by Type</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={leaveData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {leaveData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      default:
        return (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Department Overview</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={employeesByDept}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
    }
  };

  const exportCSV = () => {
    const rows: string[] = [];
    if (selectedType === 'tasks') {
      rows.push(['ID', 'Name', 'Status', 'Priority', 'Deadline', 'Progress'].join(','));
      db.tasks.forEach(t => rows.push([t.id, `"${t.name}"`, t.status, t.priority, t.deadline, t.progress + '%'].join(',')));
    } else if (selectedType === 'employees') {
      rows.push(['ID', 'Name', 'Email', 'Role', 'Department', 'Status'].join(','));
      db.profiles.forEach(p => {
        const dept = db.departments.find(d => d.id === p.departmentId)?.name || '';
        rows.push([p.employeeId, `"${p.name}"`, p.email, p.role, dept, p.status].join(','));
      });
    } else {
      rows.push(['Type', 'Count'].join(','));
      rows.push([`${selectedType} report`, 'N/A'].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `syncOS_${selectedType}_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const saveReport = () => {
    const freshDb = getDb();
    const report: Report = {
      id: `report-${Date.now()}`,
      name: `${REPORT_TYPES.find(r => r.key === selectedType)?.label || selectedType} — ${new Date().toLocaleDateString()}`,
      type: selectedType as any,
      filters: { startDate, endDate, departmentId: deptFilter === 'all' ? undefined : deptFilter },
      createdBy: user?.id || 'emp-001',
      createdAt: new Date().toISOString(),
      isScheduled: false,
    };
    freshDb.reports.push(report);
    saveDb(freshDb);
    setSavedReports(freshDb.reports);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-500" /> Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate, filter, and export enterprise reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-card border border-border hover:border-violet-500/40 rounded-xl text-xs font-semibold text-foreground transition-all">
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-card border border-border hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-foreground transition-all">
            <Download className="w-3.5 h-3.5 text-emerald-400" /> CSV
          </button>
          <button onClick={saveReport} className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition-all">
            <Plus className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {REPORT_TYPES.map(rt => (
          <button key={rt.key} onClick={() => setSelectedType(rt.key)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${selectedType === rt.key ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-border bg-card text-slate-500 hover:border-border/80 hover:text-foreground'}`}>
            <rt.icon className="w-4 h-4" style={{ color: selectedType === rt.key ? rt.color : undefined }} />
            <span className="text-center leading-tight">{rt.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-semibold">From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-semibold">To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500">
          <option value="all">All Departments</option>
          {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Chart */}
      {renderChart()}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Saved Reports</h2>
          <div className="space-y-2">
            {savedReports.slice(-5).reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{r.name}</p>
                  <p className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={exportCSV} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
