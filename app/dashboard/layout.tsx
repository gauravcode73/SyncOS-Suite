'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Video,
  CalendarRange,
  HardDrive,
  BookOpen,
  Lock,
  Search,
  LogOut,
  Coffee,
  Clock,
  ShieldCheck,
  Menu,
  X,
  UserCheck,
  Activity,
  FileText,
  User
} from 'lucide-react';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { getDb, saveDb, setCurrentUser, addActivityLog, Profile } from '@/lib/database/mockDb';
import { isSupabaseConfigured } from '@/lib/database/supabaseClient';
import { pullFromSupabase } from '@/lib/database/supabaseSync';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    setUser,
    isClockedIn,
    isOnBreak,
    clockInTime,
    workingHours,
    triggerClockIn,
    triggerClockOut,
    triggerBreak,
    refreshDbState,
    dbVersion
  } = useDashboard();

  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    profiles: Profile[];
    tasks: any[];
    messages: any[];
    documents: any[];
  }>({ profiles: [], tasks: [], messages: [], documents: [] });

  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [db, setDb] = useState(getDb());

  useEffect(() => {
    setIsMounted(true);
    setDb(getDb());
  }, [dbVersion]);

  // One-time pull from Supabase on initial mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      pullFromSupabase().then(pulled => {
        if (pulled) {
          const currentLocal = getDb();
          const merged = {
            ...pulled,
            notifications: currentLocal.notifications || []
          };
          saveDb(merged as any);
          refreshDbState();
        }
      });
    }
  }, []);

  // Clock timer state
  const [clockTimer, setClockTimer] = useState('00:00:00');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && clockInTime && !isOnBreak) {
      interval = setInterval(() => {
        const checkInDate = new Date(clockInTime).getTime();
        const now = new Date().getTime();
        
        // Find total break time for today
        const today = new Date().toISOString().split('T')[0];
        const record = db.attendance.find(a => a.profileId === user?.id && a.date === today);
        let totalBreakMs = 0;
        if (record) {
          record.breaks.forEach(b => {
            const start = new Date(b.start).getTime();
            const end = b.end ? new Date(b.end).getTime() : new Date().getTime();
            totalBreakMs += end - start;
          });
        }

        const diff = now - checkInDate - totalBreakMs;
        if (diff > 0) {
          const hrs = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setClockTimer(
            `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          );
        }
      }, 1000);
    } else if (isOnBreak) {
      setClockTimer('ON BREAK');
    } else {
      setClockTimer('00:00:00');
    }

    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime, isOnBreak, db, user]);

  // Global search implementation
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ profiles: [], tasks: [], messages: [], documents: [] });
      return;
    }

    const currentDb = getDb();
    const q = query.toLowerCase();

    // Profiles search
    const matchingProfiles = currentDb.profiles.filter(
      p => p.name.toLowerCase().includes(q) || p.designation.toLowerCase().includes(q)
    );

    // Tasks search
    const matchingTasks = currentDb.tasks.filter(
      t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );

    // Messages search
    const matchingMessages = currentDb.messages
      .filter(m => m.content.toLowerCase().includes(q) && !m.isDeleted)
      .map(m => {
        const sender = currentDb.profiles.find(p => p.id === m.senderId);
        const room = currentDb.chatRooms.find(r => r.id === m.roomId);
        return { ...m, senderName: sender?.name || 'Unknown', roomName: room?.name || 'Private Chat' };
      });

    // Documents search
    const matchingDocs = currentDb.documents.filter(
      d => d.name.toLowerCase().includes(q) || (d.content && d.content.toLowerCase().includes(q))
    );

    setSearchResults({
      profiles: matchingProfiles.slice(0, 5),
      tasks: matchingTasks.slice(0, 5),
      messages: matchingMessages.slice(0, 5),
      documents: matchingDocs.slice(0, 5)
    });
  };

  const handleQuickSwitchUser = (selectedUser: Profile) => {
    // Switch logged in identity
    setCurrentUser(selectedUser);
    setUser(selectedUser);
    setRoleSwitcherOpen(false);
    addActivityLog(selectedUser.id, 'Identity Switch', `Swapped session role to ${selectedUser.role} via development panel.`);
    refreshDbState();
    
    // Close mobile sidebars
    setSidebarOpen(false);
    router.refresh();
  };

  const handleLogout = () => {
    if (user) {
      const currentDb = getDb();
      const userIdx = currentDb.profiles.findIndex(p => p.id === user.id);
      if (userIdx !== -1) {
        currentDb.profiles[userIdx].onlineStatus = 'offline';
        saveDb(currentDb);
      }
      addActivityLog(user.id, 'User Logout', 'User manual sign out.');
    }
    setCurrentUser(null);
    setUser(null);
    router.push('/');
  };

  const menuItems = [
    { name: 'Dashboard Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Workspace Chat', icon: MessageSquare, path: '/dashboard/chat' },
    { name: 'Projects & Tasks', icon: CheckSquare, path: '/dashboard/tasks' },
    { name: 'Video Meetings', icon: Video, path: '/dashboard/meetings' },
    { name: 'HRMS & Leaves', icon: CalendarRange, path: '/dashboard/hrms' },
    { name: 'Cloud Drive Storage', icon: HardDrive, path: '/dashboard/storage' },
    { name: 'Knowledge SOP Base', icon: BookOpen, path: '/dashboard/knowledge' },
    { name: 'Analytics Reports', icon: Activity, path: '/dashboard/analytics' }
  ];

  // Show Admin Panel menu item only if user is Super Admin or HR Admin
  const showAdminMenu = user?.role === 'Super Admin' || user?.role === 'HR Admin';

  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 items-center justify-center text-slate-500 font-mono text-xs">
        SyncOS loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* MOBILE SIDEBAR PANEL DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-72 max-w-xs bg-slate-900 border-r border-slate-800 p-6 z-50 animate-slide-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white tracking-wider">SyncOS</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/15' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}

              {showAdminMenu && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all mt-4 border border-violet-500/20 ${
                    pathname === '/dashboard/admin' ? 'bg-violet-900/40 text-violet-200' : 'text-violet-400 hover:bg-violet-950/40'
                  }`}
                >
                  <Lock className="w-4 h-4 text-violet-400" />
                  Admin Control Panel
                </Link>
              )}
            </nav>

            {/* Logout button */}
            <div className="pt-4 border-t border-slate-850 mt-auto">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800/80 p-5 shrink-0">
        <div className="flex items-center gap-3.5 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
            S
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">SyncOS Suite</h2>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Enterprise Hub</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}

          {showAdminMenu && (
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all mt-6 border border-violet-500/10 ${
                pathname === '/dashboard/admin' ? 'bg-violet-900/40 text-violet-200 border-violet-500/30' : 'text-violet-400 hover:bg-violet-950/40'
              }`}
            >
              <Lock className="w-4 h-4 text-violet-400 animate-pulse" />
              Admin Control Panel
            </Link>
          )}
        </nav>

        {/* User Card info & Logout */}
        <div className="pt-4 border-t border-slate-800 mt-auto space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <img
              src={user?.avatarUrl}
              alt={user?.name}
              className="w-9 h-9 rounded-full border border-slate-800 object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.designation}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* CORE VIEW LAYOUT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        
        {/* HEADER */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
          
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
              <Menu className="w-5.5 h-5.5" />
            </button>

            {/* Global search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 w-64 text-left px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-400 text-xs hover:border-slate-700 transition-all outline-none"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search platform...</span>
              <kbd className="ml-auto bg-slate-900 border border-slate-850 px-1.5 py-0.2 rounded text-[10px] font-semibold text-slate-500">Ctrl+K</kbd>
            </button>
          </div>

          {/* DYNAMIC HEADER INTERACTIVE WIDGETS */}
          <div className="flex items-center gap-4">
            
            {/* SEARCH BUTTON FOR SMALL SCREEN */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <Search className="w-5 h-5" />
            </button>



            {/* 🛠 DEVELOPMENT ENVIRONMENT ROLE QUICK SWITCHER */}
            <div className="relative">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/20 bg-violet-950/20 text-xs font-semibold text-violet-300 hover:bg-violet-950/40 hover:border-violet-500/40 transition-all"
              >
                <UserCheck className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Role: {user?.role}</span>
                <span className="sm:hidden font-mono uppercase tracking-wider text-[10px]">{user?.role[0]}</span>
              </button>

              {roleSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-fade-in text-slate-300">
                  <div className="text-[10px] font-bold text-slate-500 px-3 py-1.5 uppercase tracking-wider border-b border-slate-850">
                    Developer Quick Switcher
                  </div>
                  <div className="space-y-0.5 mt-1.5 max-h-[300px] overflow-y-auto">
                    {db.profiles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleQuickSwitchUser(p)}
                        className={`flex items-center gap-2.5 w-full text-left p-2 rounded-lg hover:bg-slate-950 transition-all ${
                          user?.id === p.id ? 'bg-violet-900/30 border border-violet-500/20' : ''
                        }`}
                      >
                        <img src={p.avatarUrl} alt={p.name} className="w-6.5 h-6.5 rounded-full object-cover" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                          <p className="text-[9px] text-slate-400 truncate leading-none">{p.role} • {p.designation}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* CONTENT PAGE CONTAINER */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 🔍 GLOBAL SEARCH OVERLAY MODAL */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search anything (tasks, SOP policies, messages, team members)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="text-slate-450 hover:text-white p-1 rounded hover:bg-slate-800 text-xs shrink-0"
              >
                ESC
              </button>
            </div>

            {/* RESULTS VIEW */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {!searchQuery ? (
                <div className="text-center py-10 text-slate-500 space-y-1">
                  <p className="text-sm font-semibold">Type your query above</p>
                  <p className="text-xs">Instantly scan tasks, circulars, chats, files, and users</p>
                </div>
              ) : (
                <>
                  {/* Profiles Results */}
                  {searchResults.profiles.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-violet-400" /> Employees ({searchResults.profiles.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {searchResults.profiles.map(p => (
                          <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 text-xs">
                            <img src={p.avatarUrl} alt={p.name} className="w-7 h-7 rounded-full object-cover" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-200">{p.name}</p>
                              <p className="text-[10px] text-slate-400">{p.designation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks Results */}
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> Action Items & Tasks ({searchResults.tasks.length})
                      </h3>
                      <div className="space-y-1.5">
                        {searchResults.tasks.map(t => (
                          <div key={t.id} className="p-2.5 rounded-lg bg-slate-950/30 border border-slate-850 flex items-center justify-between text-xs hover:border-slate-800">
                            <div>
                              <p className="font-semibold text-slate-200">{t.name}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Results */}
                  {searchResults.messages.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-pink-400" /> Communications & Chats ({searchResults.messages.length})
                      </h3>
                      <div className="space-y-2">
                        {searchResults.messages.map(m => (
                          <div key={m.id} className="p-2.5 rounded-lg bg-slate-950/20 border border-slate-850 text-xs">
                            <div className="flex items-center justify-between text-slate-550 mb-1 text-[10px]">
                              <span className="font-semibold text-slate-300">{m.senderName}</span>
                              <span>In: {m.roomName}</span>
                            </div>
                            <p className="text-slate-400 italic line-clamp-2">"{m.content}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents & SOP Results */}
                  {searchResults.documents.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" /> SOP Wikis & File Drive ({searchResults.documents.length})
                      </h3>
                      <div className="space-y-1.5">
                        {searchResults.documents.map(d => (
                          <div key={d.id} className="p-2.5 rounded-lg bg-slate-950/30 border border-slate-850 hover:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{d.isFolder ? '📁' : '📄'}</span>
                              <div>
                                <p className="font-semibold text-slate-200">{d.name}</p>
                                <p className="text-[9px] text-slate-400">{d.isKbSop ? `Category: ${d.kbCategory}` : `Size: ${d.size}`}</p>
                              </div>
                            </div>
                            {d.isKbSop && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded text-[9px] font-medium">SOP Wiki</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty search results fallback */}
                  {searchResults.profiles.length === 0 &&
                    searchResults.tasks.length === 0 &&
                    searchResults.messages.length === 0 &&
                    searchResults.documents.length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-xs">
                        No platform records matching "{searchQuery}" could be found.
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}
