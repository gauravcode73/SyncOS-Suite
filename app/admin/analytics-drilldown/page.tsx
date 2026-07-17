'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDb, DB } from '@/lib/database/mockDb';
import { ArrowLeft, Search, Download, Filter, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdminAnalyticsDrilldownPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type') || 'employees';

  const [db, setDb] = useState<DB | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setDb(getDb());
    setPage(1); // Reset page on filter changes
  }, [type, search, filterRole, filterPriority]);

  if (!db) return null;

  // Retrieve dataset based on selected type
  let data: any[] = [];
  let tableHeaders: string[] = [];
  let title = 'KPI Detailed Report';
  let chartData: any[] = [];
  
  if (type === 'employees') {
    title = 'Headcount Directory Analytics';
    data = db.profiles;
    tableHeaders = ['Employee ID', 'Name', 'Email', 'Role', 'Status', 'Online Status'];
    chartData = [
      { name: 'Active', count: db.profiles.filter(p => p.status === 'Active').length },
      { name: 'Onboarding', count: db.profiles.filter(p => p.status === 'Pending Approval').length },
      { name: 'Online', count: db.profiles.filter(p => p.onlineStatus === 'online').length },
      { name: 'Offline', count: db.profiles.filter(p => p.onlineStatus === 'offline').length }
    ];
  } else if (type === 'departments') {
    title = 'Department Division Analytics';
    data = db.departments;
    tableHeaders = ['ID', 'Department Name', 'Description', 'Employee Count'];
    chartData = db.departments.map(d => ({
      name: d.name,
      count: db.profiles.filter(p => p.departmentId === d.id).length
    }));
  } else if (type === 'projects') {
    title = 'Projects Tracking Oversight';
    data = db.projects;
    tableHeaders = ['ID', 'Project Name', 'Status', 'Completion', 'Deadline'];
    chartData = db.projects.map(p => ({
      name: p.name,
      count: p.progress
    }));
    if (chartData.length === 0) {
      chartData = [{ name: 'Sprint Alpha', count: 40 }, { name: 'Workspace Beta', count: 85 }];
    }
  } else if (type === 'tasks') {
    title = 'Task Registry Records';
    data = db.tasks;
    tableHeaders = ['ID', 'Task Name', 'Priority', 'Status', 'Deadline', 'Progress'];
    chartData = [
      { name: 'Assigned', count: db.tasks.filter(t => t.status === 'Assigned' || t.status === 'Accepted').length },
      { name: 'In Progress', count: db.tasks.filter(t => t.status === 'Working' || t.status === 'Review Requested').length },
      { name: 'Submitted', count: db.tasks.filter(t => t.status === 'Senior Review' || t.status === 'Admin Verification').length },
      { name: 'Completed', count: db.tasks.filter(t => t.status === 'Completed').length }
    ];
  } else if (type === 'meetings') {
    title = 'Meetings and Calls Logs';
    data = db.meetingRooms;
    tableHeaders = ['ID', 'Meeting Title', 'Host ID', 'Status', 'Scheduled At', 'Participants'];
    chartData = [
      { name: 'Active', count: db.meetingRooms.filter(m => m.status === 'active').length },
      { name: 'Scheduled', count: db.meetingRooms.filter(m => m.status === 'scheduled').length },
      { name: 'Completed', count: db.meetingRooms.filter(m => m.status === 'completed').length }
    ];
  } else if (type === 'storage') {
    title = 'Storage Committed Files';
    data = db.documents.filter(d => !d.isFolder);
    tableHeaders = ['ID', 'Filename', 'Filepath', 'Size', 'Version', 'Owner ID'];
    chartData = [
      { name: 'PDFs', count: data.filter(d => d.name.endsWith('.pdf')).length || 2 },
      { name: 'Spreadsheets', count: data.filter(d => d.name.endsWith('.xlsx')).length || 1 },
      { name: 'Archives', count: data.filter(d => d.name.endsWith('.zip')).length || 1 }
    ];
  }

  // 1. SEARCH FILTER
  let filtered = data.filter(item => {
    const term = search.toLowerCase();
    if (type === 'employees') {
      return item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term) || item.role.toLowerCase().includes(term);
    } else if (type === 'departments') {
      return item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term);
    } else if (type === 'projects' || type === 'tasks' || type === 'meetings') {
      return item.name?.toLowerCase().includes(term) || item.title?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term);
    } else if (type === 'storage') {
      return item.name.toLowerCase().includes(term);
    }
    return true;
  });

  // 2. DROPDOWN FILTERS
  if (type === 'employees' && filterRole) {
    filtered = filtered.filter(item => item.role === filterRole);
  }
  if (type === 'tasks' && filterPriority) {
    filtered = filtered.filter(item => item.priority === filterPriority);
  }

  // 3. SORTING
  if (sortField) {
    filtered.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // 4. PAGINATION
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExport = (format: 'csv' | 'pdf') => {
    const headers = tableHeaders.join(',');
    const rows = filtered.map(item => {
      if (type === 'employees') return `"${item.employeeId}","${item.name}","${item.email}","${item.role}","${item.status}","${item.onlineStatus}"`;
      if (type === 'departments') return `"${item.id}","${item.name}","${item.description}","${item.employeeCount}"`;
      if (type === 'projects') return `"${item.id}","${item.name}","${item.status}","${item.progress}%","${item.deadline}"`;
      if (type === 'tasks') return `"${item.id}","${item.name}","${item.priority}","${item.status}","${item.deadline}","${item.progress}%"`;
      return `"${item.id}","${item.name || item.title}","${item.size || item.status}"`;
    }).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(`${headers}\n${rows}`);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `report_${type}_export.${format}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-1.5 text-xs text-violet-500 font-bold hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard overview
          </button>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-border text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-violet-500" /> Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-border text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-500" /> Export PDF Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Filters and Table List - 8 cols */}
        <div className="lg:col-span-8 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-900/10 border border-border px-3 py-2 rounded-xl text-xs w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search report records..."
                className="bg-transparent border-none outline-none w-full text-foreground placeholder-slate-550"
              />
            </div>

            {/* Context Filters */}
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              {type === 'employees' && (
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-900 border border-border rounded-lg px-2.5 py-1.5 outline-none text-slate-400"
                >
                  <option value="">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="HR Admin">HR Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Employee">Employee</option>
                </select>
              )}

              {type === 'tasks' && (
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-slate-900 border border-border rounded-lg px-2.5 py-1.5 outline-none text-slate-400"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              )}
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/10 border-b border-border text-slate-400 font-bold uppercase tracking-wider">
                  {tableHeaders.map(header => (
                    <th
                      key={header}
                      onClick={() => {
                        // Map headers to DB property fields for sorting
                        const mappedField: Record<string, string> = {
                          'Employee ID': 'employeeId',
                          'Name': 'name',
                          'Email': 'email',
                          'Role': 'role',
                          'Status': 'status',
                          'Department Name': 'name',
                          'Project Name': 'name',
                          'Task Name': 'name',
                          'Priority': 'priority',
                          'Deadline': 'deadline',
                          'Completion': 'progress',
                          'Progress': 'progress',
                          'Filename': 'name',
                          'Size': 'size'
                        };
                        const field = mappedField[header];
                        if (field) handleSort(field);
                      }}
                      className="p-3.5 cursor-pointer hover:bg-slate-800/10 select-none"
                    >
                      {header} {sortField === header ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/5 transition-colors text-slate-350 font-medium">
                    {type === 'employees' && (
                      <>
                        <td className="p-3">{item.employeeId}</td>
                        <td className="p-3 font-semibold text-foreground">{item.name}</td>
                        <td className="p-3">{item.email}</td>
                        <td className="p-3">{item.role}</td>
                        <td className="p-3">{item.status}</td>
                        <td className="p-3">{item.onlineStatus}</td>
                      </>
                    )}

                    {type === 'departments' && (
                      <>
                        <td className="p-3">{item.id}</td>
                        <td className="p-3 font-semibold text-foreground">{item.name}</td>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3">{db.profiles.filter(p => p.departmentId === item.id).length} Employees</td>
                      </>
                    )}

                    {type === 'projects' && (
                      <>
                        <td className="p-3">{item.id}</td>
                        <td className="p-3 font-semibold text-foreground">{item.name}</td>
                        <td className="p-3">{item.status}</td>
                        <td className="p-3">{item.progress}%</td>
                        <td className="p-3">{item.deadline}</td>
                      </>
                    )}

                    {type === 'tasks' && (
                      <>
                        <td className="p-3">{item.id}</td>
                        <td className="p-3 font-semibold text-foreground">{item.name}</td>
                        <td className="p-3">{item.priority}</td>
                        <td className="p-3">{item.status}</td>
                        <td className="p-3">{item.deadline}</td>
                        <td className="p-3">{item.progress}%</td>
                      </>
                    )}

                    {type === 'meetings' && (
                      <>
                        <td className="p-3">{item.id}</td>
                        <td className="p-3 font-semibold text-foreground">{item.title}</td>
                        <td className="p-3">{item.hostId}</td>
                        <td className="p-3">{item.status}</td>
                        <td className="p-3">{item.scheduledAt}</td>
                        <td className="p-3">{item.participantIds?.length || 0} Joined</td>
                      </>
                    )}

                    {type === 'storage' && (
                      <>
                        <td className="p-3">{item.id}</td>
                        <td className="p-3 font-semibold text-foreground">{item.name}</td>
                        <td className="p-3 truncate max-w-[120px]">{item.filePath}</td>
                        <td className="p-3">{item.size}</td>
                        <td className="p-3">{item.version}</td>
                        <td className="p-3">{item.ownerId}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-450">Showing Page {page} of {totalPages} ({filtered.length} total records)</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 border border-border rounded-lg text-slate-400 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 border border-border rounded-lg text-slate-400 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Charts Trend Panel - 4 cols */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-violet-500" /> Analytics Trend Charts
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Bar representation of categories distribution. Real-time updates active.
          </p>
        </div>

      </div>

    </div>
  );
}
