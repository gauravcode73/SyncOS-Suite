'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../DashboardContext';
import { getDb, Profile, Task, Department } from '@/lib/database/mockDb';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HardDrive,
  MessageSquare,
  Loader2
} from 'lucide-react';

export default function AnalyticsReports() {
  const { user, dbVersion } = useDashboard();
  const [db, setDb] = useState(getDb());
  const [isMounted, setIsMounted] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setDb(getDb());
  }, [dbVersion]);

  if (!user) return null;

  // 1. DATA PREPARATION FOR CHARTS
  
  // Chart A: Task Completion rate by Department
  const deptTaskData = db.departments.map(d => {
    const total = db.tasks.filter(t => t.departmentId === d.id).length;
    const completed = db.tasks.filter(t => t.departmentId === d.id && t.status === 'Completed').length;
    const pending = total - completed;
    return {
      name: d.name,
      Completed: completed,
      Pending: pending
    };
  });

  // Chart B: Chat Activity messaging volume trend (weekly days)
  const chatVolumeData = [
    { day: 'Mon', Messages: 145, DMs: 45 },
    { day: 'Tue', Messages: 198, DMs: 65 },
    { day: 'Wed', Messages: 240, DMs: 78 },
    { day: 'Thu', Messages: 289, DMs: 90 },
    { day: 'Fri', Messages: 210, DMs: 55 },
    { day: 'Sat', Messages: 85, DMs: 20 },
    { day: 'Sun', Messages: 30, DMs: 10 }
  ];

  // Chart C: Cloud Storage Space allocations division by Type
  const storageDist = [
    { name: 'SOP Policies', value: 120, color: '#ec4899' },
    { name: 'Design Assets', value: 340, color: '#8b5cf6' },
    { name: 'Engineering', value: 210, color: '#6366f1' },
    { name: 'User Uploads', value: 90, color: '#06b6d4' }
  ];

  // Export report simulation handlers
  const handleExportPDF = () => {
    setIsExportingPdf(true);
    setTimeout(() => {
      setIsExportingPdf(false);
      alert('PDF Report generated successfully! "SyncOS_Q3_Productivity_Audit.pdf" downloaded to local file disk.');
    }, 1500);
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    setTimeout(() => {
      setIsExportingExcel(false);
      alert('Excel Spreadsheet exported successfully! "SyncOS_Performance_Stats_2026.xlsx" downloaded.');
    }, 1500);
  };

  // Metrics summary computations
  const totalTasks = db.tasks.length;
  const completedTasks = db.tasks.filter(t => t.status === 'Completed').length;
  const lateTasks = db.tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline).getTime() < Date.now()).length;
  
  // Calculate average check-in time rate (present days / 7 days)
  const presentDaysCount = db.attendance.filter(a => a.status === 'Present').length;
  const totalDaysRecord = db.attendance.length;
  const attendanceRate = totalDaysRecord > 0 ? Math.round((presentDaysCount / totalDaysRecord) * 100) : 92;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* OPERATIONS HEADER CARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5.5 h-5.5 text-violet-400" /> Analytics & Productivity Audits
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track department deliverables completion, weekly chat activity index, and export corporate summaries.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 bg-violet-650 hover:bg-violet-550 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Export PDF Report
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-205 border border-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-450" />}
            Export Excel Stats
          </button>
        </div>
      </div>

      {/* DYNAMIC PRODUCTIVITY COUNTERS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Task Completion Rate */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-450 font-bold text-sm">
            {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 60}%
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Task Completion Rate</p>
            <h3 className="text-lg font-bold text-white mt-0.5">{completedTasks}/{totalTasks} Tasks</h3>
          </div>
        </div>

        {/* Late Tasks Alert */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Late Deadline Alerts</p>
            <h3 className="text-lg font-bold text-white mt-0.5">{lateTasks} Pending</h3>
          </div>
        </div>

        {/* Chat Messages Count */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Chat volume</p>
            <h3 className="text-lg font-bold text-white mt-0.5">1.2K Messages</h3>
          </div>
        </div>

        {/* Avg Check-in punctuality */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Punctual Entry rate</p>
            <h3 className="text-lg font-bold text-white mt-0.5">{attendanceRate}% Present</h3>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID */}
      {isMounted ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chart A: Department productivity bar chart - 8 cols */}
          <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Task Allocation status by Department</h3>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptTaskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#cbd5e1', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart C: Cloud Storage Space allocations distribution - 4 cols */}
          <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Disk Space usage by Section</h3>
            
            <div className="h-56 w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storageDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {storageDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#cbd5e1' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legends detail list */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/40 text-[10px]">
              {storageDist.map(item => (
                <div key={item.name} className="flex justify-between items-center text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-200">{item.value} MB</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart B: Chat activity messages area chart - 12 cols full width */}
          <div className="lg:col-span-12 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Weekly Chat Communications Volume</h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chatVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDMs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#cbd5e1' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Messages" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMsg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="DMs" stroke="#06b6d4" fillOpacity={1} fill="url(#colorDMs)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      ) : (
        <div className="h-96 flex items-center justify-center text-slate-550 text-xs">
          Loading metrics dynamic engine...
        </div>
      )}

    </div>
  );
}
