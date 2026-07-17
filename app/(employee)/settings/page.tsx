'use client';
import React, { useState } from 'react';
import { Settings, Bell, Palette, Layout, Globe, Moon, Sun, CheckCircle } from 'lucide-react';
import { useTheme } from '@/app/ThemeContext';

export default function EmployeeSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const [notifs, setNotifs] = useState({
    critical: true, high: true, normal: true, silent: false,
    department: true, project: true, personal: true, broadcast: true,
    dailyDigest: false, weeklyDigest: true,
    email: true, browser: false,
  });

  const [layout, setLayout] = useState({
    density: 'default' as 'compact' | 'default' | 'comfortable',
    sidebarLabels: true,
    animations: true,
  });

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const tabs = [
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'workspace', label: 'Workspace', icon: Layout },
  ] as const;
  const [tab, setTab] = useState<typeof tabs[number]['key']>('notifications');

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Settings className="w-5 h-5 text-violet-500" /> Workspace Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Personalize your SyncOS experience</p>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg ${saved ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : 'Save Settings'}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-card border border-border p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.key ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'notifications' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-5">Notification Categories</h2>
          <div className="space-y-3 mb-6">
            {[
              { key: 'critical', label: 'Critical Alerts', desc: 'System-level urgent alerts', color: 'text-red-400' },
              { key: 'high', label: 'High Priority', desc: 'Important task and project alerts', color: 'text-orange-400' },
              { key: 'normal', label: 'Normal Updates', desc: 'Routine status and progress updates', color: 'text-blue-400' },
              { key: 'department', label: 'Department Notices', desc: 'Department-wide announcements', color: 'text-violet-400' },
              { key: 'project', label: 'Project Updates', desc: 'Changes in your assigned projects', color: 'text-emerald-400' },
              { key: 'personal', label: 'Mentions & Tags', desc: 'Direct mentions and replies', color: 'text-amber-400' },
              { key: 'broadcast', label: 'Company Broadcasts', desc: 'Company-wide announcements', color: 'text-pink-400' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-black ${item.color}`}>●</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
                <button onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(notifs as any)[item.key] ? 'bg-violet-600' : 'bg-border'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(notifs as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-bold text-foreground mb-4">Delivery Methods</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'email', label: 'Email', icon: '📧' },
              { key: 'browser', label: 'Browser Push', icon: '🔔' },
              { key: 'dailyDigest', label: 'Daily Digest', icon: '📋' },
              { key: 'weeklyDigest', label: 'Weekly Report', icon: '📊' },
            ].map(item => (
              <button key={item.key} onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${(notifs as any)[item.key] ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'}`}>
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{(notifs as any)[item.key] ? 'Enabled' : 'Disabled'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-foreground mb-4">Theme</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'}`}>
                <Sun className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Light Mode</p>
                  <p className="text-xs text-slate-500">Clean white interface</p>
                </div>
                {theme === 'light' && <CheckCircle className="w-4 h-4 text-violet-500 ml-auto" />}
              </button>
              <button onClick={() => theme === 'light' && toggleTheme()}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'}`}>
                <Moon className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Dark Mode</p>
                  <p className="text-xs text-slate-500">Easy on the eyes</p>
                </div>
                {theme === 'dark' && <CheckCircle className="w-4 h-4 text-violet-500 ml-auto" />}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Animations</h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Enable animations</p>
                <p className="text-xs text-slate-500">Smooth transitions and micro-animations</p>
              </div>
              <button onClick={() => setLayout(l => ({ ...l, animations: !l.animations }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${layout.animations ? 'bg-violet-600' : 'bg-border'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${layout.animations ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'workspace' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Layout Density</h2>
            <div className="grid grid-cols-3 gap-3">
              {(['compact', 'default', 'comfortable'] as const).map(d => (
                <button key={d} onClick={() => setLayout(l => ({ ...l, density: d }))}
                  className={`p-3 rounded-xl border-2 text-xs font-bold capitalize text-center transition-all ${layout.density === d ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-border text-slate-500 hover:border-border/80 hover:text-foreground'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Sidebar labels</p>
              <p className="text-xs text-slate-500">Show text labels in navigation sidebar</p>
            </div>
            <button onClick={() => setLayout(l => ({ ...l, sidebarLabels: !l.sidebarLabels }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${layout.sidebarLabels ? 'bg-violet-600' : 'bg-border'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${layout.sidebarLabels ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="py-2 border-t border-border">
            <h2 className="text-sm font-bold text-foreground mb-2">Language</h2>
            <select className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-violet-500">
              <option>English (US)</option>
              <option>Hindi (हिंदी)</option>
              <option>English (UK)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1.5">Language changes take effect after save and refresh.</p>
          </div>
        </div>
      )}
    </div>
  );
}
