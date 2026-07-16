'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../DashboardContext';
import {
  getDb,
  saveDb,
  addActivityLog,
  addAuditLog,
  Profile,
  AuditLog,
  ActivityLog,
  ChatRoom
} from '@/lib/database/mockDb';
import {
  Lock,
  UserCheck,
  ShieldAlert,
  Search,
  Check,
  X,
  UserX,
  RefreshCw,
  LogOut,
  FileText,
  Activity,
  MessageSquare,
  AlertTriangle,
  Download,
  Info
} from 'lucide-react';

export default function AdminControlPanel() {
  const { user, refreshDbState, dbVersion } = useDashboard();
  const [db, setDb] = useState(getDb());
  
  // Sub-tabs
  const [adminTab, setAdminTab] = useState<'users' | 'logs' | 'chats'>('users');
  
  // Search parameters
  const [userSearch, setUserSearch] = useState('');
  
  // Chat Auditing states
  const [auditRoomId, setAuditRoomId] = useState<string>('room-announcements');

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  // Protect path: render warning if user doesn't have clearances
  if (!user || (user.role !== 'Super Admin' && user.role !== 'HR Admin')) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
        <h2 className="text-lg font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          You do not have administrative clearances to access the corporate audit control console. Access attempts are logged.
        </p>
      </div>
    );
  }

  // 1. APPROVE USER
  const handleApproveUser = (profileId: string) => {
    const currentDb = getDb();
    const idx = currentDb.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      currentDb.profiles[idx].status = 'Active';
      
      addAuditLog(
        user.id,
        'Approve Account',
        'profiles',
        profileId,
        `Approved registration request for ${currentDb.profiles[idx].name} (${currentDb.profiles[idx].employeeId})`,
        profileId
      );

      // Notify approved employee
      currentDb.notifications.unshift({
        id: `notif-${Date.now()}`,
        profileId: profileId,
        title: 'Account Activated',
        body: 'Welcome to the platform! Your registration request has been approved by HR.',
        type: 'announcement',
        isRead: false,
        referenceId: profileId,
        createdAt: new Date().toISOString()
      });

      saveDb(currentDb);
      refreshDbState();
      addActivityLog(user.id, 'Moderate User Approve', `Approved login registration for user ID: ${profileId}`);
    }
  };

  // 2. REJECT / DELETE USER
  const handleRejectUser = (profileId: string) => {
    const currentDb = getDb();
    const target = currentDb.profiles.find(p => p.id === profileId);
    if (target) {
      currentDb.profiles = currentDb.profiles.filter(p => p.id !== profileId);
      
      addAuditLog(
        user.id,
        'Reject Account Request',
        'profiles',
        profileId,
        `Rejected and purged account request for ${target.name} (${target.employeeId})`
      );

      saveDb(currentDb);
      refreshDbState();
      addActivityLog(user.id, 'Moderate User Reject', `Rejected registration request for ID: ${profileId}`);
    }
  };

  // 3. CHANGE ROLE
  const handleChangeRole = (profileId: string, newRole: Profile['role']) => {
    const currentDb = getDb();
    const idx = currentDb.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      const prevRole = currentDb.profiles[idx].role;
      currentDb.profiles[idx].role = newRole;

      addAuditLog(
        user.id,
        'Role Modification',
        'profiles',
        profileId,
        `Changed role of ${currentDb.profiles[idx].name} from "${prevRole}" to "${newRole}"`,
        profileId
      );

      saveDb(currentDb);
      refreshDbState();
      addActivityLog(user.id, 'Modify User Role', `Swapped role of ${profileId} to ${newRole}`);
    }
  };

  // 4. SUSPEND / ACTIVATE PROFILE
  const handleToggleUserStatus = (profileId: string, currentStatus: Profile['status']) => {
    const currentDb = getDb();
    const idx = currentDb.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      const newStatus: Profile['status'] = currentStatus === 'Active' ? 'Suspended' : 'Active';
      currentDb.profiles[idx].status = newStatus;

      addAuditLog(
        user.id,
        newStatus === 'Suspended' ? 'Suspend Account' : 'Reactivate Account',
        'profiles',
        profileId,
        `Changed status of ${currentDb.profiles[idx].name} from "${currentStatus}" to "${newStatus}"`,
        profileId
      );

      saveDb(currentDb);
      refreshDbState();
      addActivityLog(user.id, 'Modify User Status', `Set status of employee ${profileId} to ${newStatus}`);
    }
  };

  // 5. FORCE LOGOUT USER
  const handleForceLogout = (profileId: string) => {
    const currentDb = getDb();
    const idx = currentDb.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      currentDb.profiles[idx].onlineStatus = 'offline';
      
      addAuditLog(
        user.id,
        'Force Logout Session',
        'profiles',
        profileId,
        `Forced logout session for ${currentDb.profiles[idx].name}`,
        profileId
      );

      saveDb(currentDb);
      refreshDbState();
      addActivityLog(user.id, 'Moderation Force Logout', `Terminated active sessions of employee ID: ${profileId}`);
      alert(`Force logout request successfully triggered for user ${currentDb.profiles[idx].name}.`);
    }
  };

  // 6. CHAT HISTORY DOWNLOAD SIMULATION
  const handleDownloadChatHistory = (roomId: string) => {
    const room = db.chatRooms.find(r => r.id === roomId);
    const roomName = room ? (room.name || 'Direct_Chat') : 'chat_log';
    alert(`Chat transcript file compiled! "${roomName.replace('📢 ', '').replace('💻 ', '').replace(' ', '_')}_transcripts.json" downloaded successfully.`);
  };

  // Filtered employees list
  const pendingApprovals = db.profiles.filter(p => p.status === 'Pending Approval');
  const activeEmployees = db.profiles.filter(p => p.status !== 'Pending Approval' && p.id !== user.id);

  const searchedEmployees = activeEmployees.filter(emp =>
    emp.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    emp.designation.toLowerCase().includes(userSearch.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Selected audit chat details
  const auditChatRoom = db.chatRooms.find(r => r.id === auditRoomId);
  const auditChatMessages = db.messages.filter(m => m.roomId === auditRoomId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* OPERATIONS HEADER CARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5.5 h-5.5 text-violet-400" /> Admin Control panel
          </h1>
          <p className="text-xs text-slate-400 leading-normal">
            Approve user entries, manage RBAC, audit transactions logs, and monitor workspace chats.
          </p>
        </div>

        {/* Tab Selection buttons */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
          {[
            { id: 'users', label: 'RBAC & Approvals', icon: UserCheck },
            { id: 'logs', label: 'Audit Logs', icon: FileText },
            { id: 'chats', label: 'Chat Monitor Console', icon: MessageSquare }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  adminTab === tab.id ? 'bg-violet-650 text-white' : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 🛡 TAB 1: EMPLOYEE APPROVALS & RBAC */}
      {/* ==================================================== */}
      {adminTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Approvals list - 4 cols */}
          <div className="lg:col-span-5 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/40 pb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Pending Account Approvals ({pendingApprovals.length})
            </h2>

            {pendingApprovals.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No pending registrations waiting review.</p>
            ) : (
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {pendingApprovals.map(req => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 text-xs space-y-2.5">
                    <div className="flex items-center gap-3">
                      <img src={req.avatarUrl} alt={req.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate leading-none">{req.name}</p>
                        <p className="text-[10px] text-slate-450 truncate mt-1">{req.designation} • {req.employeeId}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-850/60 flex gap-2">
                      <button
                        onClick={() => handleApproveUser(req.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded text-[10px]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectUser(req.id)}
                        className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-350 font-semibold py-1.5 rounded text-[10px]"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Active Staff Roles settings - 7 cols */}
          <div className="lg:col-span-7 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Active Workspace Registry</h2>
              
              <input
                type="text"
                placeholder="Search staff registry..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none"
              />
            </div>

            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {searchedEmployees.map(emp => (
                <div key={emp.id} className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <img src={emp.avatarUrl} alt={emp.name} className="w-8.5 h-8.5 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-200 truncate">{emp.name}</p>
                      <p className="text-[9px] text-slate-450 truncate">{emp.designation} • ID: {emp.employeeId}</p>
                    </div>
                  </div>

                  {/* Actions row: role selects, status toggle, force logout */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Role changer */}
                    <select
                      value={emp.role}
                      onChange={(e: any) => handleChangeRole(emp.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-350 outline-none focus:border-violet-500 font-semibold"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="Manager">Manager</option>
                      <option value="HR Admin">HR Admin</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>

                    {/* Suspend activator */}
                    <button
                      onClick={() => handleToggleUserStatus(emp.id, emp.status)}
                      className={`font-semibold px-2.5 py-1.5 rounded-lg text-[9px] border transition-all ${
                        emp.status === 'Active'
                          ? 'bg-amber-950/20 border-amber-500/20 text-amber-400 hover:bg-amber-900/20'
                          : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/20'
                      }`}
                    >
                      {emp.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>

                    {/* Force Logout */}
                    <button
                      onClick={() => handleForceLogout(emp.id)}
                      className="bg-red-950/20 border border-red-500/20 hover:border-red-500/40 text-red-400 p-1.5 rounded-lg text-[9px] font-semibold transition-all flex items-center gap-1"
                      title="Force Sign Out Session"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout
                    </button>

                  </div>

                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 🛡 TAB 2: SYSTEM AUDIT & TRANSACTION LOGS */}
      {/* ==================================================== */}
      {adminTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Col A: Activity logs */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/40 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400 animate-pulse" /> Corporate Employee Activity Stream
            </h2>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {db.activityLogs.map(log => {
                const author = db.profiles.find(p => p.id === log.profileId);
                return (
                  <div key={log.id} className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl text-xs space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span className="font-bold text-slate-350">{author?.name || 'System'} ({author?.role || 'Service'})</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 font-medium">Action: {log.action}</p>
                    <p className="text-slate-450 leading-relaxed text-[11px]">{log.details}</p>
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-900/50 text-[9px] text-slate-650">
                      <span>IP: {log.ipAddress}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{log.device}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col B: Admin Audit logs */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/40 pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Security Audits Logs
            </h2>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {db.auditLogs.map(audit => {
                const adminUser = db.profiles.find(p => p.id === audit.adminId);
                const target = db.profiles.find(p => p.id === audit.targetUserId);
                
                return (
                  <div key={audit.id} className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl text-xs space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span className="font-bold text-slate-300">{adminUser?.name || 'System Admin'}</span>
                      <span>{new Date(audit.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-rose-350 font-bold">Audit Action: {audit.action}</p>
                    <p className="text-slate-350 text-[11px]">{audit.changes}</p>
                    {target && (
                      <p className="text-[9px] text-slate-550 leading-none">Target User: {target.name} ({target.employeeId})</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 🛡 TAB 3: CHAT MONITOR CONSOLE */}
      {/* ==================================================== */}
      {adminTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Chat rooms select - 4 cols */}
          <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-4 backdrop-blur-md space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-805">Active Workspace Channels</h2>
            
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {db.chatRooms.map(room => {
                
                // Chat Room Name resolver
                let roomTitle = room.name || 'Private Chat';
                if (room.type === 'direct') {
                  const m1 = db.profiles.find(p => p.id === room.memberIds[0]);
                  const m2 = db.profiles.find(p => p.id === room.memberIds[1]);
                  roomTitle = m1 && m2 ? `${m1.name} ⇆ ${m2.name}` : 'Direct DM';
                }

                return (
                  <button
                    key={room.id}
                    onClick={() => setAuditRoomId(room.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                      auditRoomId === room.id ? 'bg-violet-650 text-white' : 'text-slate-400 hover:bg-slate-950/40 hover:text-slate-205'
                    }`}
                  >
                    <span className="truncate">{roomTitle}</span>
                    <span className="text-[8px] bg-slate-950/50 px-1.5 py-0.2 rounded border border-slate-800">
                      {room.type.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Message history audits stream - 8 cols */}
          <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between min-h-[480px]">
            
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">WORKSPACE CHAT MONITOR SCREEN</span>
                  <h3 className="text-sm font-bold text-white mt-1">
                    Auditing Room: {auditChatRoom?.name || 'Direct Messaging DM'}
                  </h3>
                </div>
                
                <button
                  onClick={() => handleDownloadChatHistory(auditRoomId)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-205 border border-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-violet-400" /> Export Chat Log
                </button>
              </div>

              {/* Chat monitor warning banner */}
              <div className="bg-red-950/20 border border-red-500/20 px-4 py-2 rounded-xl flex items-start gap-2.5 text-[10px] text-red-300 mb-4 leading-relaxed text-left">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Compliance Audit Active:</strong> Under corporate security mandates, admins are authorized to audit workspace channels to prevent leaks and maintain code compliance. Actions are timestamped.
                </span>
              </div>

              {/* Messages feed */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {auditChatMessages.map(msg => {
                  const author = db.profiles.find(p => p.id === msg.senderId);
                  
                  return (
                    <div key={msg.id} className="flex gap-3 text-xs leading-relaxed items-start text-left p-2 bg-slate-950/20 rounded-lg border border-slate-850">
                      <img src={author?.avatarUrl} alt={author?.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                          <span className="font-bold text-slate-350">{author?.name} ({author?.designation})</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        
                        <p className={`text-xs ${msg.isDeleted ? 'text-red-400/70 italic' : 'text-slate-300'}`}>
                          {msg.content}
                        </p>
                        
                        {msg.isDeleted && (
                          <span className="text-[8px] bg-red-950/30 text-red-400 border border-red-950/50 px-1 py-0.2 rounded mt-1 inline-block font-mono">Deleted Message (Visible only to Audits)</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {auditChatMessages.length === 0 && (
                  <p className="text-slate-500 italic py-10 text-center text-xs">No conversations recorded in this channel.</p>
                )}
              </div>
            </div>

            {/* Bottom info footer */}
            <div className="pt-4 border-t border-slate-850/60 text-[9px] text-slate-550 text-left flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-violet-400" />
              <span>Workspace Audit Session ID: AUD-{Date.now().toString().slice(0,8)}</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
