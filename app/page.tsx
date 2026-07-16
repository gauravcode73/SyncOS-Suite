'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, User, Mail, Smartphone, Building, Award, Plus, Check, Loader2 } from 'lucide-react';
import { getDb, saveDb, setCurrentUser, getCurrentUser, addActivityLog, Profile } from '@/lib/database/mockDb';
import { isSupabaseConfigured } from '@/lib/database/supabaseClient';
import { pullFromSupabase } from '@/lib/database/supabaseSync';

export default function LoginPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmpId, setRegEmpId] = useState('');
  const [regDeptId, setRegDeptId] = useState('dept-development');
  const [regDesignation, setRegDesignation] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const db = getDb();
  const departments = db.departments;

  useEffect(() => {
    setIsMounted(true);
    // Check if user is already logged in
    const user = getCurrentUser();
    if (user && user.status === 'Active') {
      router.push('/dashboard');
    }

    // Pull latest profiles from Supabase to sync onboarding approvals
    if (isSupabaseConfigured) {
      pullFromSupabase().then(pulled => {
        if (pulled) {
          const currentLocal = getDb();
          const merged = {
            ...pulled,
            notifications: currentLocal.notifications || []
          };
          saveDb(merged as any);
        }
      });
    }
  }, [router]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const currentDb = getDb();
      const user = currentDb.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        setError('No employee account found with this email.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Pending Approval') {
        setError('Your account registration is pending HR / Admin approval.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Suspended' || user.status === 'Blocked') {
        setError('Your account is suspended. Please contact the IT support desk.');
        setIsLoading(false);
        return;
      }

      // Successful login simulation
      setCurrentUser(user);
      addActivityLog(user.id, 'User Login', 'Authenticated successfully on login interface.');
      
      // Update online status in db
      const userIdx = currentDb.profiles.findIndex(p => p.id === user.id);
      if (userIdx !== -1) {
        currentDb.profiles[userIdx].onlineStatus = 'online';
        currentDb.profiles[userIdx].lastActive = new Date().toISOString();
        saveDb(currentDb);
      }

      setIsLoading(false);
      router.push('/dashboard');
    }, 800);
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
      
      // Check if email or employee ID already exists
      const emailExists = currentDb.profiles.some(p => p.email.toLowerCase() === regEmail.toLowerCase());
      const empIdExists = currentDb.profiles.some(p => p.employeeId.toLowerCase() === regEmpId.toLowerCase());

      if (emailExists) {
        setError('An employee with this email is already registered.');
        setIsLoading(false);
        return;
      }

      if (empIdExists) {
        setError('This Employee ID is already registered in the system.');
        setIsLoading(false);
        return;
      }

      // Check if this is the first user registering in the system
      const isFirstUser = currentDb.profiles.length === 0;
      const firstSuperAdmin = currentDb.profiles.find(p => p.role === 'Super Admin');

      // Create new profile
      const newProfile: Profile = {
        id: `emp-${Date.now()}`,
        employeeId: regEmpId.toUpperCase(),
        name: regName,
        email: regEmail,
        departmentId: regDeptId,
        designation: regDesignation,
        mobile: regMobile,
        role: isFirstUser ? 'Super Admin' : 'Employee', // Promote first user to Super Admin
        managerId: isFirstUser ? null : (firstSuperAdmin ? firstSuperAdmin.id : null),
        joiningDate: new Date().toISOString().split('T')[0],
        status: isFirstUser ? 'Active' : 'Pending Approval', // Auto-approve first user
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150`,
        skills: [],
        documents: [],
        onlineStatus: 'offline',
        lastActive: new Date().toISOString(),
        device: typeof window !== 'undefined' ? navigator.userAgent : 'Desktop Web',
        location: 'Remote IP'
      };

      currentDb.profiles.push(newProfile);
      
      // Log audit
      const auditLog = {
        id: `audit-${Date.now()}`,
        adminId: isFirstUser ? newProfile.id : 'system',
        action: isFirstUser ? 'System Bootstrap Admin Activated' : 'Account Registration Request',
        targetUserId: newProfile.id,
        tableName: 'profiles',
        rowId: newProfile.id,
        changes: isFirstUser 
          ? `First employee registered. System automatically activated and promoted ${newProfile.name} to Super Admin.` 
          : `New registration request from ${newProfile.name} (${newProfile.employeeId}). Pending admin approval.`,
        timestamp: new Date().toISOString()
      };
      currentDb.auditLogs.unshift(auditLog);

      // Create a notification for admins
      if (!isFirstUser) {
        const superAdmins = currentDb.profiles.filter(p => p.role === 'Super Admin');
        superAdmins.forEach(admin => {
          currentDb.notifications.unshift({
            id: `notif-${Date.now()}-${admin.id}`,
            profileId: admin.id,
            title: 'New Account Pending Approval',
            body: `${newProfile.name} (${newProfile.designation}) has requested access. Approve in the Admin Panel.`,
            type: 'announcement',
            isRead: false,
            referenceId: newProfile.id,
            createdAt: new Date().toISOString()
          });
        });
      }

      saveDb(currentDb);

      if (isFirstUser) {
        setSuccess('System Bootstrapped! You are the first registrant and have been activated as Super Admin. You can sign in immediately.');
      } else {
        setSuccess('Registration requested successfully! Access will be granted once an administrator approves your profile.');
      }
      setIsLoading(false);
      
      // Clear fields
      setRegName('');
      setRegEmail('');
      setRegEmpId('');
      setRegDesignation('');
      setRegMobile('');
      setRegPassword('');
      
      // Toggle back to login after 3 seconds
      setTimeout(() => {
        setActiveTab('signin');
        setEmail(regEmail);
        setSuccess('');
      }, 3500);
    }, 1200);
  };

  const triggerQuickLogin = (user: Profile) => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      const currentDb = getDb();
      // Sync status
      const userIdx = currentDb.profiles.findIndex(p => p.id === user.id);
      if (userIdx !== -1) {
        currentDb.profiles[userIdx].onlineStatus = 'online';
        currentDb.profiles[userIdx].lastActive = new Date().toISOString();
        saveDb(currentDb);
      }
      
      setCurrentUser(user);
      addActivityLog(user.id, 'User Login (Quick Demo)', `Logged in as role: ${user.role} via shortcut.`);
      setIsLoading(false);
      router.push('/dashboard');
    }, 500);
  };

  if (!isMounted) {
    return (
      <div className="flex min-h-screen w-screen bg-slate-950 items-center justify-center text-slate-500 font-mono text-xs">
        SyncOS loading...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-slate-950 font-sans p-6 text-slate-200">
      
      {/* Decorative gradient glowing balls */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Brand logo header */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-slate-800 bg-slate-900/50 backdrop-blur-md text-sm text-violet-400 font-medium mb-3">
          <Shield className="w-4 h-4 text-violet-400" />
          Enterprise OS • Collaboration Suite
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
          SyncOS
        </h1>
        <p className="text-sm md:text-base text-slate-400 mt-2 max-w-sm">
          A unified operations panel replacing Slack, Teams, ClickUp & HRMS.
        </p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Quick Login Helper Panel - Left Column */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-lg shadow-2xl space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-violet-400" />
              Quick Demo Login Shortcuts
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any role profile below to instantly log in and test specific interface permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {db.profiles.map((p) => {
              const roleColors: Record<string, string> = {
                'Super Admin': 'bg-red-500/10 text-red-400 border-red-500/25',
                'HR Admin': 'bg-pink-500/10 text-pink-400 border-pink-500/25',
                'Manager': 'bg-amber-500/10 text-amber-400 border-amber-500/25',
                'Team Lead': 'bg-purple-500/10 text-purple-400 border-purple-500/25',
                'Employee': 'bg-blue-500/10 text-blue-400 border-blue-500/25',
              };

              const deptColor = departments.find(d => d.id === p.departmentId)?.color || '#94a3b8';

              return (
                <button
                  key={p.id}
                  onClick={() => triggerQuickLogin(p)}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/60 bg-slate-950/40 hover:bg-slate-900/80 hover:border-slate-700 text-left transition-all group disabled:opacity-50"
                >
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-10 h-10 rounded-full border border-slate-800 bg-slate-800 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">{p.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleColors[p.role] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {p.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.designation}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deptColor }} />
                      <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{p.departmentId ? p.departmentId.replace('dept-', '') : 'Global'}</span>
                      {p.status !== 'Active' && (
                        <span className="text-[8px] bg-red-500/20 text-red-300 px-1 py-0.2 rounded border border-red-500/30">
                          {p.status}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form Wrapper - Right Column */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-lg shadow-2xl">
          
          {/* Tab Selection */}
          <div className="flex border-b border-slate-800/80 mb-6">
            <button
              onClick={() => { setActiveTab('signin'); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center ${activeTab === 'signin' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Sign In to Account
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center ${activeTab === 'register' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Request Access (Register)
            </button>
          </div>

          {/* Messages alerts */}
          {error && (
            <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {success}
            </div>
          )}

          {activeTab === 'signin' ? (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Corporate Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@enterprise.com"
                    className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-violet-500 text-white placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-violet-500 text-white placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/15 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  'Login to Suite'
                )}
              </button>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Employee Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="john@enterprise.com"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Employee ID</label>
                <div className="relative">
                  <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regEmpId}
                    onChange={(e) => setRegEmpId(e.target.value)}
                    placeholder="EMP-123"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <select
                    value={regDeptId}
                    onChange={(e) => setRegDeptId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all appearance-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-slate-950 text-white">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Designation</label>
                <div className="relative">
                  <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    placeholder="Software Engineer"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Access Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2 mt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg py-2.5 font-semibold text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting Registration Request...
                    </>
                  ) : (
                    'Request Account Approval'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Monitored disclaimer */}
          <div className="mt-8 pt-4 border-t border-slate-800/40 text-[10px] text-slate-500 text-center leading-relaxed">
            ⚠️ <strong>Security Disclaimer:</strong> This system is the property of the organization. All communications, text messages, file transfers, and task comments are monitored by corporate administrators.
          </div>
        </div>

      </div>
    </div>
  );
}
