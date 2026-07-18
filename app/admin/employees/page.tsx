'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getDb, saveDb, addAuditLog, Profile } from '@/lib/database/mockDb';
import { isSupabaseConfigured } from '@/lib/database/supabaseClient';
import { pushRecordToSupabase, pullFromSupabase, deleteRecordFromSupabase } from '@/lib/database/supabaseSync';
import { UserCheck, UserMinus, Edit2, Check, X, Search, CheckCircle, Trash2, Building, RefreshCw } from 'lucide-react';

export default function AdminEmployeesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{id:string; name:string}[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState<any>('Employee');
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshProfiles = useCallback(() => {
    const db = getDb();
    const latest = db.profiles.map(p => ({ ...p }));
    setProfiles(latest);
    setDepartments(db.departments.map(d => ({ id: d.id, name: d.name })));
  }, []);

  // Pull fresh data directly from Supabase and save to local cache
  const syncFromCloud = useCallback(async (showSpinner = false) => {
    if (!isSupabaseConfigured) return;
    if (showSpinner) setIsSyncing(true);
    try {
      const pulled = await pullFromSupabase();
      if (pulled && pulled.profiles && pulled.profiles.length > 0) {
        const db = getDb();
        const merged = { ...pulled, notifications: db.notifications || [] };
        saveDb(merged as any, true);
        refreshProfiles();
      }
    } finally {
      if (showSpinner) setIsSyncing(false);
    }
  }, [refreshProfiles]);

  useEffect(() => {
    // Initial load: first pull from cloud, then keep local in sync
    syncFromCloud(true).then(() => refreshProfiles());

    // Fast local poll (picks up changes from admin layout's 5s cloud sync)
    const localInterval = window.setInterval(() => refreshProfiles(), 1500);

    // Direct cloud poll every 8 seconds — catches data from other devices
    const cloudInterval = window.setInterval(() => syncFromCloud(false), 8000);

    const handleFocus = () => { syncFromCloud(false); refreshProfiles(); };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'enterprise_os_db_v6') refreshProfiles();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(localInterval);
      window.clearInterval(cloudInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncFromCloud, refreshProfiles]);

  const handleApprove = (id: string) => {
    const db = getDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      db.profiles[idx].status = 'Active';
      addAuditLog('system', 'Approve Employee Onboarding', 'profiles', id, `Approved access request for employee: ${db.profiles[idx].name}`);
      saveDb(db);
      // Immediately push approved profile to Supabase for cross-device sync
      if (isSupabaseConfigured) {
        pushRecordToSupabase('profiles', db.profiles[idx]);
      }
      setProfiles([...db.profiles]);
    }
  };

  const handleSuspend = (id: string, action: 'Suspend' | 'Activate') => {
    const db = getDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      db.profiles[idx].status = action === 'Suspend' ? 'Suspended' : 'Active';
      addAuditLog('system', `${action} Employee Account`, 'profiles', id, `Updated account status to ${db.profiles[idx].status} for: ${db.profiles[idx].name}`);
      saveDb(db);
      setProfiles([...db.profiles]);
    }
  };

  const handleDelete = (id: string) => {
    if (id === 'emp-001') {
      alert("Cannot delete the root super admin account.");
      return;
    }
    if (confirm("Are you sure you want to permanently delete this employee account? This action cannot be undone.")) {
      const db = getDb();
      const idx = db.profiles.findIndex(p => p.id === id);
      if (idx !== -1) {
        const name = db.profiles[idx].name;
        db.profiles.splice(idx, 1);
        addAuditLog('system', 'Delete Employee Account', 'profiles', id, `Permanently deleted employee account for: ${name}`);
        saveDb(db);
        if (isSupabaseConfigured) {
          deleteRecordFromSupabase('profiles', id);
        }
        setProfiles([...db.profiles]);
      }
    }
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditDesignation(p.designation);
    setEditRole(p.role);
    setEditDeptId(p.departmentId);
  };

  const saveEdit = (id: string) => {
    const db = getDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = db.profiles[idx];
      const oldDeptName = departments.find(d => d.id === p.departmentId)?.name || 'Unassigned';
      const newDeptName = departments.find(d => d.id === editDeptId)?.name || 'Unassigned';
      const oldDetails = `Designation: ${p.designation}, Role: ${p.role}, Department: ${oldDeptName}`;
      p.designation = editDesignation;
      p.role = editRole;
      p.departmentId = editDeptId;
      addAuditLog('system', 'Edit Employee Profile', 'profiles', id, `Changed profile from [${oldDetails}] to [Designation: ${editDesignation}, Role: ${editRole}, Department: ${newDeptName}]`);
      saveDb(db);
      // Immediately push updated profile to Supabase for cross-device sync
      if (isSupabaseConfigured) {
        pushRecordToSupabase('profiles', db.profiles[idx]);
      }
      setProfiles([...db.profiles]);
      setEditingId(null);
    }
  };

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    p.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Employee Directory & Access Control</h2>
        <p className="text-xs text-slate-400 mt-1">Manage corporate accounts, roles, access permissions, and onboarding requests.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl flex-1 max-w-md shadow-sm">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, designation..."
            className="bg-transparent border-none text-sm outline-none w-full text-foreground placeholder-slate-500"
          />
        </div>
        <button
          onClick={() => syncFromCloud(true)}
          disabled={isSyncing}
          title="Refresh from cloud database"
          className="flex items-center gap-1.5 bg-card border border-border hover:border-violet-500/50 text-slate-400 hover:text-violet-400 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/10 border-b border-border/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">Employee ID / Name</th>
                <th className="p-4">Contact & Designation</th>
                <th className="p-4">Department</th>
                <th className="p-4">System Role</th>
                <th className="p-4">Security Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-slate-500">ID: {p.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-slate-300">{p.email}</p>
                      {editingId === p.id ? (
                        <input
                          type="text"
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                          className="bg-slate-900 border border-border rounded text-[10px] px-1 py-0.5 mt-1 outline-none focus:border-violet-500 text-white"
                        />
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium">{p.designation}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <select
                          value={editDeptId || ''}
                          onChange={(e) => setEditDeptId(e.target.value || null)}
                          className="bg-slate-900 border border-border rounded text-[10px] px-1 py-0.5 outline-none focus:border-violet-500 text-white max-w-[140px]"
                        >
                          <option value="">Unassigned</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {departments.find(d => d.id === p.departmentId)?.name || <span className="text-amber-500 italic">Unassigned</span>}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {editingId === p.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="bg-slate-900 border border-border rounded text-[10px] px-1 py-0.5 outline-none focus:border-violet-500 text-white"
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="HR Admin">HR Admin</option>
                        <option value="Department Admin">Department Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="Employee">Employee</option>
                        <option value="Guest">Guest</option>
                      </select>
                    ) : (
                      <span className="bg-slate-500/10 border border-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                        {p.role}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      p.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500' :
                      p.status === 'Pending Approval' ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' :
                      'bg-red-500/10 border-red-500/25 text-red-500'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {p.status === 'Pending Approval' && (
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px] transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}

                      {editingId === p.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(p.id)}
                            className="bg-violet-600 hover:bg-violet-500 text-white font-bold p-1 rounded transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold p-1 rounded transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(p)}
                          className="border border-border text-slate-400 hover:text-white p-1 rounded transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {p.status === 'Active' ? (
                        <button
                          onClick={() => handleSuspend(p.id, 'Suspend')}
                          className="border border-red-500/20 text-red-400 hover:bg-red-500/10 p-1 rounded transition-all"
                          title="Suspend User Account"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      ) : p.status === 'Suspended' ? (
                        <button
                          onClick={() => handleSuspend(p.id, 'Activate')}
                          className="border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 p-1 rounded transition-all"
                          title="Unsuspend User Account"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      ) : null}

                      {p.id !== 'emp-001' && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:text-red-400 p-1 rounded transition-all"
                          title="Delete Employee Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
