'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Key, Mail, Eye, EyeOff, Loader2, Smartphone, Award, ShieldAlert } from 'lucide-react';
import { getDb, saveDb, setCurrentUser, addActivityLog, Profile } from '@/lib/database/mockDb';
import { isSupabaseConfigured, supabase } from '@/lib/database/supabaseClient';
import { pullFromSupabase, pushAllToSupabase, pushRecordToSupabase, mapProfileFromDb } from '@/lib/database/supabaseSync';
import { useTheme } from '@/app/ThemeContext';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmpId, setRegEmpId] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Company branding — reflects admin settings
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window === 'undefined') return 'SyncOS Workspace';
    return getDb().companySettings?.name || 'SyncOS Workspace';
  });

  const formatDisplayName = (enteredEmail: string): string => {
    const localPart = (enteredEmail || '').trim().split('@')[0] || 'Employee';
    return localPart
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Employee';
  };

  const ensureFallbackEmployee = (currentDb: ReturnType<typeof getDb>, enteredEmail: string): Profile | null => {
    const normalizedEmail = (enteredEmail || '').trim().toLowerCase();
    if (!normalizedEmail.includes('@')) return null;

    const existing = currentDb.profiles.find((profile) => profile.email.toLowerCase() === normalizedEmail);
    if (existing) return existing;

    if (normalizedEmail === 'gaurav.bellework@gmail.com') return null;

    const stableId = 'emp-' + normalizedEmail.replace(/[^a-z0-9]/g, '-');

    const existingById = currentDb.profiles.find((profile) => profile.id === stableId);
    if (existingById) return existingById;

    const fallbackProfile: Profile = {
      id: stableId,
      employeeId: `EMP-${Date.now().toString().slice(-4)}`,
      name: formatDisplayName(normalizedEmail),
      email: normalizedEmail,
      password: password || 'employee123',
      departmentId: 'dept-development',
      teamId: null,
      designation: 'Software Engineer',
      mobile: '9999999999',
      role: 'Employee',
      managerId: 'emp-001',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      skills: ['TypeScript'],
      documents: [],
      onlineStatus: 'offline',
      lastActive: new Date().toISOString(),
      performanceScore: 85,
      weeklyCapacityHours: 40
    };

    currentDb.profiles.push(fallbackProfile);
    saveDb(currentDb);
    return fallbackProfile;
  };

  useEffect(() => {
    // Check if user is already logged in
    const user = typeof window !== 'undefined' ? localStorage.getItem('enterprise_os_current_user') : null;
    if (user) {
      try {
        const u = JSON.parse(user) as Profile;
        if (u.status === 'Active' && !['Super Admin', 'HR Admin'].includes(u.role)) {
          router.push('/dashboard');
        }
      } catch (e) {}
    }

    // Pull database updates
    if (isSupabaseConfigured) {
      pullFromSupabase().then(async (pulled) => {
        if (pulled) {
          const currentLocal = getDb();
          if (!pulled.profiles || pulled.profiles.length === 0) {
            // Only seed Supabase if local actually has real admin data
            const hasAdmin = currentLocal.profiles.some(p => ['Super Admin', 'HR Admin'].includes(p.role));
            if (hasAdmin) await pushAllToSupabase(currentLocal);
          } else {
            const merged = {
              ...pulled,
              notifications: currentLocal.notifications || []
            };
            saveDb(merged as any, true);
          }
          // Refresh company name after pull
          setCompanyName(getDb().companySettings?.name || 'SyncOS Workspace');
        }
      });
    }

    // Keep company name in sync with localStorage changes (e.g. admin saves settings in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'enterprise_os_db_v6') {
        setCompanyName(getDb().companySettings?.name || 'SyncOS Workspace');
      }
    };
    window.addEventListener('storage', handleStorage);

    // Retrieve remembered email
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('employee_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }

    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const currentDb = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    let user: Profile | undefined = currentDb.profiles.find(p => p.email.toLowerCase() === normalizedEmail);

    if (!user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (data && !error) {
          const cloudProfile = mapProfileFromDb(data);
          const existingIdx = currentDb.profiles.findIndex(p => p.id === cloudProfile.id);
          if (existingIdx !== -1) {
            currentDb.profiles[existingIdx] = cloudProfile;
          } else {
            currentDb.profiles.push(cloudProfile);
          }
          saveDb(currentDb, true);
          user = cloudProfile;
        }
      } catch (err) {
        console.error('Failed to query Supabase for profile:', err);
      }
    }

    if (!user) {
      const fallbackUser = ensureFallbackEmployee(currentDb, email);
      if (fallbackUser) {
        user = fallbackUser;
      }
    }

    setTimeout(() => {

      if (!user) {
        setError('No employee account found with this email.');
        setIsLoading(false);
        return;
      }

      if (['Super Admin', 'HR Admin'].includes(user.role)) {
        setError('Administrators must log in through the secure admin console at /admin/login.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Pending Approval') {
        setError('Your employee registration is pending manager or HR validation.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Suspended' || user.status === 'Blocked') {
        setError('Your workspace profile has been suspended. Contact the IT support desk.');
        setIsLoading(false);
        return;
      }

      // Remember Me persistence
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('employee_remembered_email', email);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('employee_remembered_email');
      }

      setCurrentUser(user);
      addActivityLog(user.id, 'Employee Login', 'Authenticated successfully on portal.');

      // Update online status
      const userIdx = currentDb.profiles.findIndex(p => p.id === user.id);
      if (userIdx !== -1) {
        currentDb.profiles[userIdx].onlineStatus = 'online';
        currentDb.profiles[userIdx].lastActive = new Date().toISOString();
        saveDb(currentDb);
      }

      setSuccess('Successfully authenticated. Opening dashboard...');
      setIsLoading(false);
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    }, 1000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regName || !regEmail || !regEmpId || !regDesignation || !regMobile || !regPassword) {
      setError('Please fill in all registration fields.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const currentDb = getDb();
      const emailExists = currentDb.profiles.some(p => p.email.toLowerCase() === regEmail.toLowerCase());
      const empIdExists = currentDb.profiles.some(p => p.employeeId.toLowerCase() === regEmpId.toLowerCase());

      if (emailExists) {
        setError('An account with this email already exists.');
        setIsLoading(false);
        return;
      }

      if (empIdExists) {
        setError('This Employee ID is already registered in our system.');
        setIsLoading(false);
        return;
      }

      const newProfile: Profile = {
        id: `emp-${Date.now()}`,
        employeeId: regEmpId.toUpperCase(),
        name: regName,
        email: regEmail,
        password: regPassword,
        departmentId: null,
        teamId: null,
        designation: regDesignation,
        mobile: regMobile,
        role: 'Employee',
        managerId: null,
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'Pending Approval',
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150`,
        skills: [],
        documents: [],
        onlineStatus: 'offline',
        lastActive: new Date().toISOString(),
        device: typeof window !== 'undefined' ? navigator.userAgent : 'Desktop Web',
        location: 'Remote IP'
      };

      currentDb.profiles = [currentDb.profiles.find(p => p.id === 'emp-001')!, ...currentDb.profiles.filter(p => p.id !== 'emp-001')];
      currentDb.profiles.push(newProfile);

      // Log activity & audit
      currentDb.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        adminId: 'system',
        action: 'Account Registration Request',
        targetUserId: newProfile.id,
        tableName: 'profiles',
        rowId: newProfile.id,
        changes: `Registration request from ${newProfile.name} (${newProfile.employeeId}). Pending HR approval.`,
        timestamp: new Date().toISOString()
      });

      saveDb(currentDb);
      // Immediately push new registration to Supabase so admins on other devices see it right away
      if (isSupabaseConfigured) {
        pushRecordToSupabase('profiles', newProfile);
      }

      setSuccess('Account created successfully. Your request is pending admin approval.');
      setIsLoading(false);

      // Clear fields
      const emailToPrefill = regEmail;
      setRegName('');
      setRegEmail('');
      setRegEmpId('');
      setRegDesignation('');
      setRegMobile('');
      setRegPassword('');

      setTimeout(() => {
        setActiveTab('signin');
        setEmail(emailToPrefill);
        setSuccess('');
      }, 3000);
    }, 1200);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSubmitted(true);
    setTimeout(() => {
      setForgotPasswordOpen(false);
      setResetSubmitted(false);
      setResetEmail('');
      setSuccess('A password recovery email has been sent to your inbox.');
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-background text-foreground p-6">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-indigo-500">
          {companyName}
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          Collaborate on tasks, documents, chat, and online calls.
        </p>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl z-10">
        
        {/* Tab Selector */}
        <div className="flex border-b border-border/60 mb-6">
          <button
            onClick={() => { setActiveTab('signin'); setError(''); setSuccess(''); }}
            className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center ${activeTab === 'signin' ? 'border-violet-500 text-foreground' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center ${activeTab === 'register' ? 'border-violet-500 text-foreground' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Request Access
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {success}
          </div>
        )}

        {activeTab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@enterprise.com"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border hover:border-violet-500/50 focus:border-violet-500 text-foreground placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-[10px] font-bold text-violet-500 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border hover:border-violet-500/50 focus:border-violet-500 text-foreground placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-violet-600 focus:ring-violet-500 bg-slate-900"
                />
                <span className="text-xs text-slate-400">Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-lg shadow-violet-600/15 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-650 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Corporate Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="john@enterprise.com"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-650 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee ID</label>
              <div className="relative">
                <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={regEmpId}
                  onChange={(e) => setRegEmpId(e.target.value)}
                  placeholder="EMP-1024"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-650 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mobile Number</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  required
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="+1 555-0100"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-650 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
              <div className="relative flex items-center px-3 py-2 border border-border rounded-lg bg-slate-900/10 dark:bg-slate-950/60">
                <span className="text-xs text-slate-500 italic">Assigned by admin after approval</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</label>
              <div className="relative">
                <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value)}
                  placeholder="UI Engineer"
                  className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-650 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-650 rounded-lg py-2 pl-3 pr-3 text-xs outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2.5 font-semibold text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting request...
                  </>
                ) : (
                  'Request Access Code'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold mb-2">Password Recovery</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your corporate email address.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="employee@enterprise.com"
                className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border focus:border-violet-500 text-foreground placeholder-slate-500 rounded-xl py-2 pl-3 pr-3 text-sm outline-none transition-all"
              />
              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitted}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs flex items-center gap-1.5"
                >
                  {resetSubmitted ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Recover Access'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
