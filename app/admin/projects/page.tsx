'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addAuditLog, Project, Department, Profile } from '@/lib/database/mockDb';
import { Layers, Plus, Calendar, Star, TrendingUp } from 'lucide-react';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCreatedBy, setNewCreatedBy] = useState('');

  useEffect(() => {
    const db = getDb();
    setProjects(db.projects);
    setDepartments(db.departments);
    setProfiles(db.profiles);
  }, []);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const db = getDb();
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: newName,
      description: newDesc,
      departmentId: newDept || null,
      status: 'Planning',
      progress: 0,
      deadline: newDeadline,
      createdBy: newCreatedBy || 'emp-001',
      createdAt: new Date().toISOString().split('T')[0],
      teamIds: []
    };

    db.projects.push(newProj);
    addAuditLog(newCreatedBy || 'system', 'Create Project', 'projects', newProj.id, `Created new project: ${newProj.name}`);
    saveDb(db);

    setProjects([...db.projects]);
    setNewName('');
    setNewDesc('');
    setNewDept('');
    setNewDeadline('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Projects Registry Console</h2>
        <p className="text-xs text-slate-400 mt-1">Supervise target goals, sprint pipelines, milestones, and active work progress.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Project */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-2xl shadow-sm h-fit">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" />
            Provision Project Board
          </h3>
          <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Project Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. SyncOS Migration"
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Core objectives and details..."
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500 h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Owning Department</label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="">Select Department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Deadline Date</label>
              <input
                type="date"
                required
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Project Owner</label>
              <select
                value={newCreatedBy}
                onChange={(e) => setNewCreatedBy(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="">Select Employee...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-all"
            >
              Add Project Board
            </button>
          </form>
        </div>

        {/* Projects List */}
        <div className="lg:col-span-8 space-y-4">
          {projects.length === 0 ? (
            <div className="bg-card border border-border p-8 rounded-2xl text-center text-slate-500">
              No projects created yet. Start by defining a project board.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(proj => {
                const dept = departments.find(d => d.id === proj.departmentId);
                const owner = profiles.find(p => p.id === proj.createdBy);
                return (
                  <div key={proj.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 hover:border-violet-500/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-extrabold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {dept ? dept.name : 'Global'}
                        </span>
                        <h4 className="font-bold text-foreground mt-1.5">{proj.name}</h4>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-350 px-2 py-0.5 rounded border border-border">
                        {proj.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{proj.description || 'No description provided.'}</p>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Progress</span>
                        <span>{proj.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5">
                        <div className="bg-violet-600 h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Due {proj.deadline}
                      </span>
                      <span>Owner: {owner ? owner.name : 'System'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
