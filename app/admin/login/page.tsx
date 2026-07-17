'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Mail, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { getDb, setCurrentUser, addActivityLog, Profile } from '@/lib/database/mockDb';
import { useTheme } from '@/app/ThemeContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
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

  useEffect(() => {
    // Check if user is already logged in
    const user = typeof window !== 'undefined' ? localStorage.getItem('enterprise_os_current_user') : null;
    if (user) {
      try {
        const u = JSON.parse(user) as Profile;
        if (u.status === 'Active' && ['Super Admin', 'HR Admin', 'Department Admin', 'Manager', 'Team Lead'].includes(u.role)) {
          router.push('/admin/dashboard');
        }
      } catch (e) {}
    }
  }, [router]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    setTimeout(() => {
      const currentDb = getDb();
      const user = currentDb.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        setError('No administrator account found with this email.');
        setIsLoading(false);
        return;
      }

      if (!['Super Admin', 'HR Admin', 'Department Admin', 'Manager', 'Team Lead'].includes(user.role)) {
        setError('Access denied. This portal is reserved for administrators and managers only.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Pending Approval') {
        setError('Your administrator access request is pending verification.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Suspended' || user.status === 'Blocked') {
        setError('Your administrator account is suspended. Contact IT Security Desk.');
        setIsLoading(false);
        return;
      }

      // Simulation of remember me behavior
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('admin_remembered_email', email);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_remembered_email');
      }

      setCurrentUser(user);
      addActivityLog(user.id, 'Admin Portal Login', 'Authenticated successfully on secure admin panel.');
      setSuccess('Access verified. Redirecting to Enterprise Console...');
      setIsLoading(false);

      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1000);
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
      setSuccess('A secure password reset link has been dispatched to your corporate email.');
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-background text-foreground p-6">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl z-10 transition-all duration-300">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-2xl mb-4 border border-violet-500/20">
            <Shield className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            SyncOS Admin Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Enterprise Governance Console & System Control Panel
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {success}
          </div>
        )}

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
                placeholder="admin@enterprise.com"
                className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border hover:border-violet-500/50 focus:border-violet-500 text-foreground placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Security Password
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
                className="w-full bg-slate-900/10 dark:bg-slate-950/60 border border-border hover:border-violet-500/50 focus:border-violet-500 text-foreground placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none transition-all"
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
                className="w-4 h-4 rounded border-border text-violet-600 bg-slate-900 focus:ring-violet-500 focus:ring-offset-slate-950"
              />
              <span className="text-xs text-slate-400">Remember session context</span>
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
                Authorizing Console Access...
              </>
            ) : (
              'Access Admin Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/40 text-[10px] text-slate-500 text-center leading-relaxed">
          🔒 <strong>Secure Access Only:</strong> Authorized Super Admins and HR Managers may authenticate. Unauthorized entry attempts are audited and reported.
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold mb-2">Request Password Reset</h3>
            <p className="text-xs text-slate-400 mb-4">
              Specify your corporate email address to receive authorization credentials.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="admin@enterprise.com"
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
                    'Send Instructions'
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
