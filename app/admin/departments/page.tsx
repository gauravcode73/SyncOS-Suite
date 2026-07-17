'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addAuditLog, Department, Profile } from '@/lib/database/mockDb';
import { Building, Plus, User, FileText, Check } from 'lucide-react';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptIcon, setNewDeptIcon] = useState('Building');

  useEffect(() => {
    const db = getDb();
    setDepartments(db.departments);
    setProfiles(db.profiles);
  }, []);

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;

    const db = getDb();
    const newDept: Department = {
      id: `dept-${newDeptName.toLowerCase().replace(/\s+/g, '-')}`,
      name: newDeptName,
      description: newDeptDesc,
      headId: newDeptHead || null,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      icon: newDeptIcon,
      employeeCount: 0
    };

    db.departments.push(newDept);
    addAuditLog('system', 'Create Department', 'departments', newDept.id, `Created new department: ${newDept.name}`);
    saveDb(db);

    setDepartments([...db.departments]);
    setNewDeptName('');
    setNewDeptDesc('');
    setNewDeptHead('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Departments Control Board</h2>
        <p className="text-xs text-slate-400 mt-1">Configure company organization chart structures and coordinate department heads.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Department Form */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-2xl shadow-sm h-fit">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" />
            Provision New Department
          </h3>
          <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Department Name</label>
              <input
                type="text"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Quality Assurance"
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Description</label>
              <textarea
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Brief summary of department operations..."
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500 h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Department Head</label>
              <select
                value={newDeptHead}
                onChange={(e) => setNewDeptHead(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="">Select a Manager/Lead...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-all"
            >
              Add Department Structure
            </button>
          </form>
        </div>

        {/* Departments List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map(d => {
              const head = profiles.find(p => p.id === d.headId);
              const count = profiles.filter(p => p.departmentId === d.id).length;
              return (
                <div key={d.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-violet-500/30 transition-all">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-border">
                        <Building className="w-4 h-4" style={{ color: d.color }} />
                      </span>
                      <h4 className="font-bold text-foreground">{d.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{d.description || 'No description set.'}</p>
                  </div>
                  
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {head ? head.name : 'No Head Assigned'}
                    </span>
                    <span className="font-semibold bg-slate-100 dark:bg-slate-800 text-muted-foreground px-2 py-0.5 rounded-full">
                      {count} Employees
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
