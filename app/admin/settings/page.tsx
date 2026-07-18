'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Building, Clock, Globe, Bell, Shield, Database, Palette, Save, CheckCircle, Sun, Moon, Trash2, Wifi, WifiOff } from 'lucide-react';
import { getDb, saveDb, getCurrentUser, DEFAULT_COMPANY_SETTINGS, CompanySettings } from '@/lib/database/mockDb';
import { ALL_ROLES, ROLE_LEVEL } from '@/lib/rbac';
import { useTheme } from '@/app/ThemeContext';

export default function AdminSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const user = getCurrentUser();
  const [saved, setSaved] = useState(false);
  const [notifCleared, setNotifCleared] = useState(false);

  const [company, setCompany] = useState<CompanySettings>(() => {
    const db = getDb();
    return db.companySettings || DEFAULT_COMPANY_SETTINGS;
  });

  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    browserEnabled: true,
    taskAssigned: true,
    taskOverdue: true,
    leaveApproval: true,
    meetingInvite: true,
    announcements: true,
  });

  const [notifCount, setNotifCount] = useState(0);
  useEffect(() => {
    const db = getDb();
    setNotifCount(db.notifications.length);
  }, []);

  const handleSave = () => {
    const db = getDb();
    db.companySettings = company;
    saveDb(db);
    // Broadcast so all open tabs/layouts re-read the DB
    window.dispatchEvent(new StorageEvent('storage', { key: 'enterprise_os_db_v6' }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClearNotifications = () => {
    if (!user) return;
    const db = getDb();
    // Clear all notifications for ALL users (admin action)
    db.notifications = [];
    saveDb(db);
    window.dispatchEvent(new StorageEvent('storage', { key: 'enterprise_os_db_v6' }));
    setNotifCount(0);
    setNotifCleared(true);
    setTimeout(() => setNotifCleared(false), 2500);
  };

  const supabaseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : '';
  const supabaseKey = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') : '';
  const isConfigured = !!(supabaseUrl && supabaseKey);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Settings className="w-5 h-5 text-violet-500" /> System Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure your {company.name} enterprise platform</p>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </div>

      {/* Company Settings */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-foreground">Company Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Company Name</label>
            <input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Website</label>
            <input value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Timezone</label>
            <select value={company.timezone} onChange={e => setCompany(c => ({ ...c, timezone: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500">
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Annual Leave Days</label>
            <input type="number" value={company.annualLeaves} onChange={e => setCompany(c => ({ ...c, annualLeaves: +e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-foreground">Working Hours</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Work Start Time</label>
            <input type="time" value={company.workStartTime} onChange={e => setCompany(c => ({ ...c, workStartTime: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Work End Time</label>
            <input type="time" value={company.workEndTime} onChange={e => setCompany(c => ({ ...c, workEndTime: e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Late Grace (minutes)</label>
            <input type="number" value={company.graceMinutes} onChange={e => setCompany(c => ({ ...c, graceMinutes: +e.target.value }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500" />
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-bold text-foreground">Appearance</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'}`}>
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">Light Mode</span>
          </button>
          <button onClick={toggleTheme} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'}`}>
            <Moon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-foreground">Dark Mode</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">Notification Settings</h2>
          </div>
          <button
            onClick={handleClearNotifications}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              notifCleared
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            {notifCleared ? (
              <><CheckCircle className="w-3.5 h-3.5" /> Cleared!</>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /> Clear All Notifications {notifCount > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1">{notifCount}</span>}</>
            )}
          </button>
        </div>
        <div className="space-y-3">
          {[
            { key: 'emailEnabled', label: 'Email Notifications', desc: 'Send notifications via email' },
            { key: 'browserEnabled', label: 'Browser Notifications', desc: 'Push notifications in browser' },
            { key: 'taskAssigned', label: 'Task Assignment Alerts', desc: 'Notify when tasks are assigned' },
            { key: 'taskOverdue', label: 'Overdue Task Alerts', desc: 'Alert when tasks pass deadline' },
            { key: 'leaveApproval', label: 'Leave Request Updates', desc: 'Notify on leave status changes' },
            { key: 'meetingInvite', label: 'Meeting Invitations', desc: 'Notify when invited to meetings' },
            { key: 'announcements', label: 'Company Announcements', desc: 'Broadcast company-wide messages' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(notifications as any)[item.key] ? 'bg-violet-600' : 'bg-border'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(notifications as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Role Hierarchy Viewer */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-bold text-foreground">Role Hierarchy</h2>
        </div>
        <div className="space-y-2">
          {ALL_ROLES.map(role => (
            <div key={role} className="flex items-center gap-3 p-2.5 rounded-xl bg-background border border-border/50">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                {ROLE_LEVEL[role]}
              </div>
              <span className="text-sm font-semibold text-foreground">{role}</span>
              <div className="ml-auto flex items-center gap-1">
                {[...Array(ROLE_LEVEL[role])].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-500" />
                ))}
                {[...Array(7 - ROLE_LEVEL[role])].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-border" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database Integration — redesigned */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Database className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-foreground">Database Integration</h2>
          <span className={`ml-auto flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            isConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isConfigured ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConfigured ? 'Supabase Connected' : 'Local Storage Mode'}
          </span>
        </div>

        {isConfigured ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Supabase URL</p>
                <p className="text-[11px] text-emerald-400 font-mono truncate">{supabaseUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Anon Key</p>
                <p className="text-[11px] text-emerald-400 font-mono">{supabaseKey.substring(0, 24)}••••••••</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Running in offline / local mode</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All data is stored in your browser's localStorage. To enable cloud sync and multi-device support, add your Supabase credentials to the <code className="text-violet-400 bg-violet-500/10 px-1 rounded">.env</code> file.
                </p>
              </div>
            </div>
            <div className="bg-background border border-border rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Required .env variables</p>
              {[
                { key: 'NEXT_PUBLIC_SUPABASE_URL', hint: 'your-project.supabase.co' },
                { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hint: 'eyJhbGciOiJ...' },
              ].map(v => (
                <div key={v.key} className="flex items-center gap-2">
                  <code className="text-[11px] font-mono text-violet-400">{v.key}</code>
                  <span className="text-slate-600 text-xs">=</span>
                  <code className="text-[11px] font-mono text-slate-500">{v.hint}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
