'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Building, FolderKanban, CheckSquare, MessageSquare,
  Video, LogOut, Menu, X, Sun, Moon, Shield, Bell, Settings, ListTodo,
  UsersRound, BarChart3, ClipboardList, Zap, FileSearch, ChevronRight, Dot
} from 'lucide-react';
import { getDb, setCurrentUser, getCurrentUser, Profile, saveDb } from '@/lib/database/mockDb';
import { canAccessAdminPortal, getRoleBadgeColor } from '@/lib/rbac';
import { useTheme } from '@/app/ThemeContext';
import { isSupabaseConfigured } from '@/lib/database/supabaseClient';
import { pullFromSupabase, pushAllToSupabase } from '@/lib/database/supabaseSync';

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const refreshNotifications = (currentUser: Profile | null) => {
    if (!currentUser) return;
    const db = getDb();
    const filtered = db.notifications.filter(n => n.profileId === currentUser.id).slice(0, 6);
    setNotifications(filtered);
    setUnreadNotifs(filtered.filter(n => !n.isRead).length);
  };

  useEffect(() => {
    setIsMounted(true);
    if (pathname === '/admin/login') return;

    const currentUser = getCurrentUser();
    if (!currentUser) { router.push('/admin/login'); return; }
    if (!canAccessAdminPortal(currentUser.role)) { router.push('/admin/login'); return; }

    setUser(currentUser);
    refreshNotifications(currentUser);
  }, [router, pathname]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      pullFromSupabase().then(async (pulled) => {
        if (pulled) {
          const currentLocal = getDb();
          if (!pulled.profiles || pulled.profiles.length === 0) {
            await pushAllToSupabase(currentLocal);
          } else {
            const merged = {
              ...pulled,
              notifications: currentLocal.notifications || []
            };
            saveDb(merged as any);
            const currentUser = getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              refreshNotifications(currentUser);
            }
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => refreshNotifications(user), 2500);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'enterprise_os_db_v6') {
        refreshNotifications(user);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
    router.push('/admin/login');
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Command Center',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      ]
    },
    {
      label: 'Organization',
      items: [
        { name: 'Employees', icon: Users, path: '/admin/employees' },
        { name: 'Departments', icon: Building, path: '/admin/departments' },
        { name: 'Teams', icon: UsersRound, path: '/admin/teams' },
        { name: 'Projects', icon: FolderKanban, path: '/admin/projects' },
      ]
    },
    {
      label: 'Work Management',
      items: [
        { name: 'Task Control', icon: CheckSquare, path: '/admin/tasks' },
        { name: 'Meetings', icon: Video, path: '/admin/meetings' },
      ]
    },
    {
      label: 'Communication',
      items: [
        { name: 'Chat Monitor', icon: MessageSquare, path: '/admin/chat-monitor' },
        { name: 'Group Manager', icon: UsersRound, path: '/admin/group-manager' },
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Reports', icon: BarChart3, path: '/admin/reports' },
        { name: 'Audit Logs', icon: FileSearch, path: '/admin/audit-logs' },
        { name: 'Automation', icon: Zap, path: '/admin/automation' },
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', icon: Settings, path: '/admin/settings' },
      ]
    }
  ];

  if (pathname === '/admin/login') return <>{children}</>;

  if (!isMounted || !user) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-mono text-xs">SyncOS Admin Console loading...</span>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-foreground tracking-tight">SyncOS</p>
          <p className="text-[10px] text-slate-500 font-medium">Admin Console</p>
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = pathname === item.path || (item.path !== '/admin/dashboard' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                        : 'text-slate-400 hover:bg-border/50 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.name}</span>
                    {item.badge ? (
                      <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    ) : null}
                    {!isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 bg-card border-r border-border z-50">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-border text-slate-400">
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card shrink-0">
        <SidebarContent />
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-border/60 lg:hidden text-foreground">
              <Menu className="w-4 h-4" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5" />
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-foreground capitalize">
                {pathname.replace('/admin/', '').replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-border/60 text-foreground transition-all"
              aria-label="Toggle Theme"
            >
              {isMounted && (theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />)}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotificationsOpen(v => !v)} className="p-2 rounded-lg hover:bg-border/60 text-foreground relative">
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-11 w-72 rounded-xl border border-border bg-card shadow-2xl p-2 z-50">
                  <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500">No new updates</div>
                  ) : notifications.map(item => (
                    <div key={item.id} className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2.5 mb-1.5">
                      <div className="text-[11px] font-semibold text-foreground">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User avatar */}
            <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border border-border object-cover" />
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          {children}
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav className="lg:hidden border-t border-border bg-card flex items-center justify-around h-14 px-2 shrink-0">
          {[
            { icon: LayoutDashboard, path: '/admin/dashboard', label: 'Console' },
            { icon: CheckSquare, path: '/admin/tasks', label: 'Tasks' },
            { icon: MessageSquare, path: '/admin/chat-monitor', label: 'Chat' },
            { icon: BarChart3, path: '/admin/reports', label: 'Reports' },
            { icon: Settings, path: '/admin/settings', label: 'Settings' },
          ].map(item => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${isActive ? 'text-violet-500' : 'text-slate-500'}`}>
                <item.icon className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
