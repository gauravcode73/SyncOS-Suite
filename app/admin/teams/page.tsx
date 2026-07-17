'use client';
import React, { useState, useEffect } from 'react';
import { UsersRound, Plus, Search, Archive, UserCheck, MoreVertical, Building, ChevronRight, Users, Edit2, Trash2, X } from 'lucide-react';
import { getDb, saveDb, getCurrentUser, Team, Profile, addAuditLog } from '@/lib/database/mockDb';
import { calculateWorkload } from '@/lib/workload';

export default function AdminTeamsPage() {
  const [db, setDb] = useState(() => getDb());
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: '', description: '', departmentId: '', teamLeadId: '' });
  const user = getCurrentUser();

  const refreshDb = () => setDb(getDb());

  const filtered = db.teams.filter(t => {
    if (t.isArchived) return false;
    if (deptFilter !== 'all' && t.departmentId !== deptFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditingTeam(null);
    setForm({ name: '', description: '', departmentId: '', teamLeadId: '' });
    setShowModal(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setForm({ name: team.name, description: team.description, departmentId: team.departmentId, teamLeadId: team.teamLeadId || '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.departmentId) return;
    const freshDb = getDb();
    if (editingTeam) {
      const idx = freshDb.teams.findIndex(t => t.id === editingTeam.id);
      if (idx !== -1) {
        freshDb.teams[idx] = { ...freshDb.teams[idx], ...form, teamLeadId: form.teamLeadId || null };
        if (user) addAuditLog(user.id, 'Update Team', 'teams', editingTeam.id, `Updated team: ${form.name}`, { module: 'Teams' });
      }
    } else {
      const team: Team = {
        id: `team-${Date.now()}`,
        name: form.name,
        description: form.description,
        departmentId: form.departmentId,
        teamLeadId: form.teamLeadId || null,
        memberIds: [],
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      freshDb.teams.push(team);
      if (user) addAuditLog(user.id, 'Create Team', 'teams', team.id, `Created team: ${team.name}`, { module: 'Teams' });
    }
    saveDb(freshDb);
    refreshDb();
    setShowModal(false);
  };

  const handleArchive = (teamId: string) => {
    const freshDb = getDb();
    const idx = freshDb.teams.findIndex(t => t.id === teamId);
    if (idx !== -1) {
      freshDb.teams[idx].isArchived = true;
      saveDb(freshDb);
      refreshDb();
    }
  };

  const getDeptName = (id: string) => db.departments.find(d => d.id === id)?.name || 'Unknown';
  const getLeadName = (id: string | null) => id ? (db.profiles.find(p => p.id === id)?.name || 'Unassigned') : 'Unassigned';
  const getMemberCount = (team: Team) => team.memberIds.length;

  const eligibleLeads = (deptId: string) => db.profiles.filter(p =>
    p.departmentId === deptId && p.status === 'Active' && ['Team Lead', 'Senior Employee', 'Department Head'].includes(p.role)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-violet-500" /> Team Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{db.teams.filter(t => !t.isArchived).length} active teams across {db.departments.length} departments</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-600/20">
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:border-violet-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500">
          <option value="all">All Departments</option>
          {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-500">
            <UsersRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No teams found</p>
            <p className="text-xs mt-1">Create a team to get started</p>
          </div>
        ) : filtered.map(team => {
          const members = db.profiles.filter(p => team.memberIds.includes(p.id));
          const dept = db.departments.find(d => d.id === team.departmentId);
          return (
            <div key={team.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/40 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                    style={{ backgroundColor: dept?.color || '#6366f1' }}>
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{team.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Building className="w-3 h-3" /> {getDeptName(team.departmentId)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(team)} className="p-1.5 rounded-lg hover:bg-border text-slate-400 hover:text-violet-500 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleArchive(team.id)} className="p-1.5 rounded-lg hover:bg-border text-slate-400 hover:text-red-400 transition-all">
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{team.description || 'No description'}</p>

              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> Lead: <span className="font-semibold text-foreground">{getLeadName(team.teamLeadId)}</span></span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {members.length} members</span>
              </div>

              {/* Member Avatars */}
              <div className="flex items-center gap-1">
                {members.slice(0, 5).map(m => (
                  <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="w-6 h-6 rounded-full border-2 border-card object-cover" />
                ))}
                {members.length > 5 && (
                  <span className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-[9px] font-bold text-slate-500">
                    +{members.length - 5}
                  </span>
                )}
                {members.length === 0 && <span className="text-xs text-slate-600">No members assigned</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-foreground">{editingTeam ? 'Edit Team' : 'Create New Team'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-border text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Team Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" placeholder="e.g. Frontend Engineers" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Department *</label>
                <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value, teamLeadId: '' }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500">
                  <option value="">Select Department</option>
                  {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Team Lead</label>
                <select value={form.teamLeadId} onChange={e => setForm(f => ({ ...f, teamLeadId: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500">
                  <option value="">No Lead Assigned</option>
                  {eligibleLeads(form.departmentId).map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500 resize-none" placeholder="What does this team do?" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-border/50 hover:bg-border rounded-xl text-sm font-semibold text-foreground transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-violet-600/20">
                {editingTeam ? 'Save Changes' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
