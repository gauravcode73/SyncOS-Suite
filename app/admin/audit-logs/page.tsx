'use client';
import React, { useState } from 'react';
import { FileSearch, Search, Filter, Download, RefreshCw, Shield, User, Building, CheckSquare, MessageSquare, Video, HardDrive, Settings, ChevronDown } from 'lucide-react';
import { getDb, AuditLog } from '@/lib/database/mockDb';

const MODULE_ICONS: Record<string, React.ElementType> = {
  Tasks: CheckSquare, Employees: User, Departments: Building,
  Chat: MessageSquare, Meetings: Video, Documents: HardDrive,
  Settings: Settings, System: Shield,
};

const ACTION_COLORS: Record<string, string> = {
  'Create': 'text-emerald-400 bg-emerald-500/10',
  'Update': 'text-blue-400 bg-blue-500/10',
  'Delete': 'text-red-400 bg-red-500/10',
  'Verify': 'text-violet-400 bg-violet-500/10',
  'Approve': 'text-amber-400 bg-amber-500/10',
  'Reject': 'text-red-400 bg-red-500/10',
  'Login': 'text-emerald-400 bg-emerald-500/10',
  'Logout': 'text-slate-400 bg-slate-500/10',
  'Schedule': 'text-blue-400 bg-blue-500/10',
  'Archive': 'text-amber-400 bg-amber-500/10',
};

const getActionColor = (action: string) => {
  const key = Object.keys(ACTION_COLORS).find(k => action.startsWith(k));
  return key ? ACTION_COLORS[key] : 'text-slate-400 bg-slate-500/10';
};

export default function AdminAuditLogsPage() {
  const [db] = useState(() => getDb());
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [empFilter, setEmpFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const filtered = db.auditLogs.filter(log => {
    const admin = db.profiles.find(p => p.id === log.adminId);
    if (search && ![log.action, log.tableName, log.changes, admin?.name || ''].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (actionFilter !== 'all' && !log.action.startsWith(actionFilter)) return false;
    if (empFilter !== 'all' && log.adminId !== empFilter) return false;
    if (startDate && log.timestamp < startDate) return false;
    if (endDate && log.timestamp > endDate + 'T23:59:59') return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const modules = [...new Set(db.auditLogs.map(l => l.module).filter(Boolean))];
  const actionTypes = ['Create', 'Update', 'Delete', 'Verify', 'Approve', 'Reject', 'Schedule', 'Archive', 'Login'];
  const admins = db.profiles.filter(p => ['Super Admin', 'Admin', 'Department Head', 'Team Lead'].includes(p.role));

  const exportCSV = () => {
    const rows = ['Timestamp,Action,Module,Table,Admin,Target,Changes,IP,Browser'].concat(
      filtered.map(l => {
        const admin = db.profiles.find(p => p.id === l.adminId)?.name || l.adminId;
        return [l.timestamp, `"${l.action}"`, l.module || '', l.tableName, admin, l.targetUserId || '', `"${l.changes}"`, l.ipAddress || '', l.browser || ''].join(',');
      })
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><FileSearch className="w-5 h-5 text-violet-500" /> Enterprise Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">{db.auditLogs.length} total audit entries — complete action history</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-card border border-border hover:border-violet-500/40 rounded-xl text-sm font-semibold text-foreground transition-all">
          <Download className="w-4 h-4 text-emerald-400" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..." className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-slate-500 focus:outline-none focus:border-violet-500" />
          </div>
          <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500">
            <option value="all">All Modules</option>
            {modules.map(m => <option key={m} value={m!}>{m}</option>)}
          </select>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500">
            <option value="all">All Actions</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={empFilter} onChange={e => { setEmpFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500">
            <option value="all">All Admins</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-violet-500" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Entries', value: db.auditLogs.length, color: 'text-violet-400' },
          { label: 'Today', value: db.auditLogs.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0])).length, color: 'text-blue-400' },
          { label: 'Create Actions', value: db.auditLogs.filter(l => l.action.startsWith('Create')).length, color: 'text-emerald-400' },
          { label: 'Delete Actions', value: db.auditLogs.filter(l => l.action.startsWith('Delete')).length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Log Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Timestamp</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Action</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Module</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Admin</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Changes</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">IP / Device</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <FileSearch className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No audit logs found</p>
                    <p className="text-[10px] mt-1">Actions performed in the admin portal will appear here</p>
                  </td>
                </tr>
              ) : paginated.map(log => {
                const admin = db.profiles.find(p => p.id === log.adminId);
                const isExpanded = expanded === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr className={`border-b border-border/50 hover:bg-background/40 transition-colors ${isExpanded ? 'bg-background/40' : ''}`}>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getActionColor(log.action)}`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{log.module || log.tableName}</td>
                      <td className="px-4 py-3">
                        {admin ? (
                          <div className="flex items-center gap-2">
                            <img src={admin.avatarUrl} alt={admin.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-foreground font-medium">{admin.name}</span>
                          </div>
                        ) : <span className="text-slate-500">{log.adminId}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-48 truncate">{log.changes}</td>
                      <td className="px-4 py-3 text-slate-500">
                        <div>{log.ipAddress}</div>
                        <div className="text-[10px]">{log.browser}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(isExpanded ? null : log.id)} className="p-1 rounded-lg hover:bg-border text-slate-500 transition-colors">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border/50 bg-background/30">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {log.previousValue && <div><p className="text-slate-500 mb-0.5">Previous Value</p><p className="text-foreground font-mono bg-red-500/5 rounded px-2 py-1 border border-red-500/10">{log.previousValue}</p></div>}
                            {log.newValue && <div><p className="text-slate-500 mb-0.5">New Value</p><p className="text-foreground font-mono bg-emerald-500/5 rounded px-2 py-1 border border-emerald-500/10">{log.newValue}</p></div>}
                            {log.sessionId && <div><p className="text-slate-500 mb-0.5">Session ID</p><p className="text-foreground font-mono">{log.sessionId}</p></div>}
                            {log.reason && <div><p className="text-slate-500 mb-0.5">Reason</p><p className="text-foreground">{log.reason}</p></div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-slate-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground bg-card border border-border hover:bg-border disabled:opacity-40 transition-all">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground bg-card border border-border hover:bg-border disabled:opacity-40 transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
