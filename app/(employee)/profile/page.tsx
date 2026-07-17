'use client';
import React, { useState, useRef, useEffect } from 'react';
import { User, Camera, Save, Plus, X, Shield, Bell, FileText, Lock, CheckCircle, Edit3 } from 'lucide-react';
import { getDb, saveDb, getCurrentUser, setCurrentUser, Profile } from '@/lib/database/mockDb';
import { getRoleBadgeColor } from '@/lib/rbac';
import { useDashboard } from '@/app/dashboard/DashboardContext';

export default function ProfilePage() {
  const { setUser } = useDashboard();
  const [profile, setProfile] = useState<Profile | null>(() => getCurrentUser());
  const [tab, setTab] = useState<'info' | 'skills' | 'notifications' | 'security'>('info');
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: profile?.name || '',
    designation: profile?.designation || '',
    mobile: profile?.mobile || '',
    location: profile?.location || '',
    device: profile?.device || '',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    critical: true, high: true, normal: true, silent: false,
    department: true, project: true, personal: true, broadcast: true,
    dailyDigest: false, weeklyDigest: true,
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!profile) return;
    const freshDb = getDb();
    const idx = freshDb.profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      freshDb.profiles[idx] = {
        ...freshDb.profiles[idx],
        ...form,
        avatarUrl: avatarPreview || freshDb.profiles[idx].avatarUrl,
      };
      saveDb(freshDb);
      const updatedUser = freshDb.profiles[idx];
      setCurrentUser(updatedUser);
      setUser(updatedUser);
      setProfile(updatedUser);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim() || !profile) return;
    const freshDb = getDb();
    const idx = freshDb.profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1 && !freshDb.profiles[idx].skills.includes(newSkill.trim())) {
      freshDb.profiles[idx].skills.push(newSkill.trim());
      saveDb(freshDb);
      setProfile(freshDb.profiles[idx]);
      setCurrentUser(freshDb.profiles[idx]);
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    if (!profile) return;
    const freshDb = getDb();
    const idx = freshDb.profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      freshDb.profiles[idx].skills = freshDb.profiles[idx].skills.filter(s => s !== skill);
      saveDb(freshDb);
      setProfile(freshDb.profiles[idx]);
    }
  };

  if (!profile) return <div className="text-center py-20 text-slate-500">Loading profile...</div>;

  const tabs = [
    { key: 'info', label: 'Personal Info', icon: User },
    { key: 'skills', label: 'Skills', icon: Edit3 },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Lock },
  ] as const;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={avatarPreview || profile.avatarUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-border"
            />
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center hover:bg-violet-700 transition-colors shadow-lg">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl font-black text-foreground">{profile.name}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{profile.designation}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getRoleBadgeColor(profile.role)}`}>{profile.role}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${profile.onlineStatus === 'online' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-500/10'}`}>
                ● {profile.onlineStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Employee ID: #{profile.employeeId} · Joined {new Date(profile.joiningDate).toLocaleDateString()}</p>
          </div>

          <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shrink-0 ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'}`}>
            {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'info' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Designation</label>
              <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mobile Number</label>
              <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. New Delhi, India" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
              <div className="w-full px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm text-slate-500">{profile.email} <span className="text-[10px] text-slate-600">(contact admin to change)</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-4">Skills & Expertise</h2>
          <div className="flex gap-2 mb-4">
            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill()} placeholder="Add a skill (press Enter)..." className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            <button onClick={handleAddSkill} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold text-white transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(skill => (
              <span key={skill} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs font-semibold text-violet-400">
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {profile.skills.length === 0 && <p className="text-sm text-slate-500">No skills added yet. Add your expertise above.</p>}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-4">Notification Preferences</h2>
          <div className="space-y-3">
            {[
              { key: 'critical', label: 'Critical Alerts', desc: 'Urgent system and security alerts' },
              { key: 'high', label: 'High Priority', desc: 'Important task and deadline notifications' },
              { key: 'normal', label: 'Normal Updates', desc: 'Standard task and project updates' },
              { key: 'department', label: 'Department Notifications', desc: 'Updates from your department' },
              { key: 'project', label: 'Project Updates', desc: 'Activity in your projects' },
              { key: 'personal', label: 'Personal Mentions', desc: 'When someone mentions you' },
              { key: 'broadcast', label: 'Company Broadcasts', desc: 'Company-wide announcements' },
              { key: 'dailyDigest', label: 'Daily Digest', desc: 'Daily summary of your activities' },
              { key: 'weeklyDigest', label: 'Weekly Report', desc: 'Weekly performance summary' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <button onClick={() => setNotifPrefs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(notifPrefs as any)[item.key] ? 'bg-violet-600' : 'bg-border'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(notifPrefs as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Security Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Current Password</label>
              <input type="password" placeholder="Enter current password" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Password</label>
              <input type="password" placeholder="Enter new password" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm New Password</label>
              <input type="password" placeholder="Confirm new password" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
            </div>
            <button className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-violet-600/20">Update Password</button>
          </div>
          <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400 font-semibold">🔒 Account Security</p>
            <p className="text-xs text-slate-400 mt-1">Your account security is managed by your organization administrator. Contact admin for MFA setup.</p>
          </div>
        </div>
      )}
    </div>
  );
}
