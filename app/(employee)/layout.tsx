'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Video,
  Calendar,
  HardDrive,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  User,
  Trash2
} from 'lucide-react';
import { canAccessAdminPortal } from '@/lib/rbac';
import { DashboardProvider, useDashboard } from '../dashboard/DashboardContext';
import { getCurrentUser, setCurrentUser, addActivityLog, Profile, getDb, saveDb, Notification } from '@/lib/database/mockDb';
import { useTheme } from '@/app/ThemeContext';
import CopilotDrawer from '@/app/components/CopilotDrawer';

function EmployeeDashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useDashboard();
  const { theme, toggleTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [companyName, setCompanyName] = useState('SyncOS Suite');

  const refreshNotifications = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const db = getDb();
    const filtered = db.notifications.filter((n: Notification) => n.profileId === currentUser.id).slice(0, 6);
    setNotifications(filtered);
    setUnreadNotifs(filtered.filter(n => !n.isRead).length);
    setCompanyName(db.companySettings?.name || 'SyncOS Suite');
  };

  useEffect(() => {
    setIsMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }
    
    // Redirect admins to their portal if they try to access employee layout
    if (canAccessAdminPortal(currentUser.role)) {
      router.push('/admin/dashboard');
      return;
    }

    refreshNotifications();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => refreshNotifications(), 2500);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'enterprise_os_db_v6') refreshNotifications();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  const handleLogout = () => {
    if (user) {
      addActivityLog(user.id, 'User Logout', 'Sign out from workspace.');
    }
    setCurrentUser(null);
    setUser(null);
    router.push('/');
  };

  const handleClearNotifications = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const db = getDb();
    db.notifications = db.notifications.filter(n => n.profileId !== currentUser.id);
    saveDb(db);
    setNotifications([]);
    setUnreadNotifs(0);
    window.dispatchEvent(new StorageEvent('storage', { key: 'enterprise_os_db_v6' }));
  };

  const handleMarkAllRead = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const db = getDb();
    db.notifications = db.notifications.map(n =>
      n.profileId === currentUser.id ? { ...n, isRead: true } : n
    );
    saveDb(db);
    refreshNotifications();
  };

  const navItems = [
    { name: 'Workspace Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Tasks Board', icon: CheckSquare, path: '/my-tasks' },
    { name: 'Communications', icon: MessageSquare, path: '/chat' },
    { name: 'Sync Calendar', icon: Calendar, path: '/calendar' },
    { name: 'Online Meetings', icon: Video, path: '/meetings' },
    { name: 'Corporate Files', icon: HardDrive, path: '/files' },
    { name: 'My Profile', icon: User, path: '/profile' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  if (!isMounted || !user) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 items-center justify-center text-slate-500 font-mono text-xs">
        SyncOS workspace loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-all duration-300">
      
      {/* MOBILE SIDEBAR DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-72 max-w-xs bg-sidebar border-r border-border p-6 z-50">
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-bold text-white tracking-wider">{companyName}</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-850 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl text-sm font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card p-6 shrink-0 transition-all duration-300">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-lg font-extrabold text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-indigo-500">{companyName}</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-slate-500 hover:bg-border/60 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-border mt-auto space-y-3">
          <div className="flex items-center gap-3 px-2">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-border object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.designation}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 transition-all duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-border/60 lg:hidden text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block text-sm font-semibold text-muted-foreground">
              {pathname === '/dashboard' && 'Daily Workspace'}
              {pathname === '/my-tasks' && 'My Tasks Board'}
              {pathname === '/chat' && 'Sync Communications'}
              {pathname === '/calendar' && 'Personal Calendar'}
              {pathname === '/meetings' && 'Meeting Rooms'}
              {pathname === '/files' && 'Corporate Drive'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-border/60 text-foreground transition-all"
              aria-label="Toggle Theme"
            >
              {isMounted && (theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />)}
            </button>

            {/* Notification tray */}
            <div className="relative">
              <button onClick={() => setNotificationsOpen(v => !v)} className="p-2 rounded-lg hover:bg-border/60 text-foreground relative">
                <Bell className="w-5 h-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-72 rounded-xl border border-border bg-card shadow-2xl p-2 z-50">
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notifications</span>
                    {notifications.length > 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[9px] font-bold text-violet-400 hover:text-violet-300 transition-colors px-1.5 py-0.5 rounded hover:bg-violet-500/10"
                        >
                          Mark read
                        </button>
                        <button
                          onClick={handleClearNotifications}
                          className="text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5 rounded hover:bg-red-500/10 flex items-center gap-0.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Clear
                        </button>
                      </div>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500">No new updates</div>
                  ) : notifications.map(item => (
                    <div key={item.id} className={`rounded-lg border px-2.5 py-2.5 mb-1.5 ${item.isRead ? 'border-border/40 bg-background/40' : 'border-border/60 bg-background/70'}`}>
                      {!item.isRead && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block mr-1.5 mb-0.5" />}
                      <div className="text-[11px] font-semibold text-foreground inline">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background transition-all duration-300">
          {children}
        </main>
      </div>
      <CopilotDrawer />
    </div>
  );
}

export default function EmployeeDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <EmployeeDashboardLayoutContent>{children}</EmployeeDashboardLayoutContent>
    </DashboardProvider>
  );
}
