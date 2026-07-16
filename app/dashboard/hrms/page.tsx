'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../DashboardContext';
import {
  getDb,
  saveDb,
  addActivityLog,
  addAuditLog,
  Profile,
  Attendance,
  LeaveRequest
} from '@/lib/database/mockDb';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  Clock,
  Briefcase,
  Layers,
  Search,
  Phone,
  Mail,
  UserCheck,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function HRMSPortal() {
  const { user, isClockedIn, isOnBreak, clockInTime, workingHours, triggerClockIn, triggerClockOut, triggerBreak, refreshDbState, dbVersion } = useDashboard();
  const [db, setDb] = useState(getDb());
  
  // HRMS sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'leaves' | 'directory'>('leaves');
  
  // Directory filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Leave Form
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<'Casual' | 'Sick' | 'Annual' | 'Unpaid'>('Casual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Clock timer state
  const [timerText, setTimerText] = useState('00:00:00');

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  // Live timer for checkin
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && clockInTime && !isOnBreak) {
      interval = setInterval(() => {
        const checkInDate = new Date(clockInTime).getTime();
        const now = new Date().getTime();
        
        // Find total break time
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
          setTimerText(
            `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          );
        }
      }, 1000);
    } else if (isOnBreak) {
      setTimerText('ON BREAK');
    } else {
      setTimerText('00:00:00');
    }
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime, isOnBreak, db, user]);

  if (!user) return null;

  // Filter attendance logs for user
  const userAttendanceLogs = db.attendance
    .filter(a => a.profileId === user.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Leave Balances simulation
  const leaveBalances = {
    Sick: 6,
    Casual: 8,
    Annual: 12
  };

  // Check how many leaves of each type are already approved
  const approvedLeaves = db.leaveRequests.filter(l => l.profileId === user.id && l.status === 'Approved');
  
  const leavesTaken = {
    Sick: approvedLeaves.filter(l => l.type === 'Sick').length,
    Casual: approvedLeaves.filter(l => l.type === 'Casual').length,
    Annual: approvedLeaves.filter(l => l.type === 'Annual').length
  };

  const balances = {
    Sick: Math.max(0, leaveBalances.Sick - leavesTaken.Sick),
    Casual: Math.max(0, leaveBalances.Casual - leavesTaken.Casual),
    Annual: Math.max(0, leaveBalances.Annual - leavesTaken.Annual)
  };

  // Leave Requests filtering
  const isHRorSuperAdmin = user.role === 'Super Admin' || user.role === 'HR Admin';
  const leavesFiltered = isHRorSuperAdmin
    ? db.leaveRequests // Admin sees all leave applications
    : db.leaveRequests.filter(l => l.profileId === user.id); // Employee sees own

  // Approve / Reject Leave
  const handleReviewLeave = (leaveId: string, isApprove: boolean) => {
    const currentDb = getDb();
    const idx = currentDb.leaveRequests.findIndex(l => l.id === leaveId);
    if (idx !== -1) {
      const leave = currentDb.leaveRequests[idx];
      leave.status = isApprove ? 'Approved' : 'Rejected';
      leave.approvedBy = user.id;

      // Add audit log
      addAuditLog(
        user.id,
        `Leave Request ${leave.status}`,
        'leave_requests',
        leaveId,
        `Admin updated leave request status to: ${leave.status}`,
        leave.profileId
      );

      // Create notification for employee
      currentDb.notifications.unshift({
        id: `notif-${Date.now()}`,
        profileId: leave.profileId,
        title: `Leave Request ${leave.status}`,
        body: `Your request for ${leave.type} leave (${leave.startDate} to ${leave.endDate}) was ${leave.status.toLowerCase()} by ${user.name}`,
        type: 'leave',
        isRead: false,
        referenceId: leaveId,
        createdAt: new Date().toISOString()
      });

      saveDb(currentDb);
      refreshDbState();
      addActivityLog(user.id, 'Moderate Leave Request', `Approved/Rejected leave application ID: ${leaveId}`);
    }
  };

  // Apply Leave Submit
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason.trim()) return;

    const currentDb = getDb();
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      profileId: user.id,
      type: leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason,
      status: 'Pending',
      approvedBy: null,
      createdAt: new Date().toISOString()
    };

    currentDb.leaveRequests.unshift(newRequest);
    saveDb(currentDb);
    
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    setLeaveModalOpen(false);
    refreshDbState();
    addActivityLog(user.id, 'Apply Leave Request', `Requested leave from ${leaveStart} to ${leaveEnd}`);
  };

  // Filtered employee list
  const filteredEmployees = db.profiles.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedDeptId === 'all') return matchesSearch;
    return matchesSearch && emp.departmentId === selectedDeptId;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* GREETING CARD SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5.5 h-5.5 text-violet-400" /> HR Operations Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Check attendance reports, file sick leaves, review org hierarchy directory.
          </p>
        </div>

        {/* HR Tab Selection buttons */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
          {[
            { id: 'leaves', label: 'Leaves Planner' },
            { id: 'directory', label: 'Org Chart & Directory' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === tab.id ? 'bg-violet-650 text-white' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>



      {/* ==================================================== */}
      {/* 📅 TAB 2: LEAVE PLANNER */}
      {/* ==================================================== */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-6">
          
          {/* Leaves Counter Widget Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Casual Leave Balance</span>
              <h3 className="text-2xl font-bold text-white mt-1">{balances.Casual} Days</h3>
              <p className="text-[10px] text-slate-500 mt-1">Used: {leavesTaken.Casual} of 8 days</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sick Leave Balance</span>
              <h3 className="text-2xl font-bold text-white mt-1">{balances.Sick} Days</h3>
              <p className="text-[10px] text-slate-500 mt-1">Used: {leavesTaken.Sick} of 6 days</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Annual Paid Balance</span>
              <h3 className="text-2xl font-bold text-white mt-1">{balances.Annual} Days</h3>
              <p className="text-[10px] text-slate-500 mt-1">Used: {leavesTaken.Annual} of 12 days</p>
            </div>

            {/* Application shortcut block */}
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="p-4 rounded-xl border border-violet-500/20 bg-violet-950/15 hover:bg-violet-950/30 transition-all text-center flex flex-col justify-center items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-5 h-5 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">File Leave Application</span>
            </button>

          </div>

          {/* Leave Request List / Reviewer panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {isHRorSuperAdmin ? 'Leave Applications Review Panel (HR Operations)' : 'Your Leave Application History'}
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    {isHRorSuperAdmin && <th className="p-3">Employee</th>}
                    <th className="p-3">Leave Type</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Reason Description</th>
                    <th className="p-3">Status</th>
                    {isHRorSuperAdmin && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leavesFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={isHRorSuperAdmin ? 7 : 5} className="p-6 text-center text-slate-500 italic">No leave applications recorded in database.</td>
                    </tr>
                  ) : (
                    leavesFiltered.map(leave => {
                      const emp = db.profiles.find(p => p.id === leave.profileId);
                      return (
                        <tr key={leave.id} className="hover:bg-slate-900/20">
                          {isHRorSuperAdmin && (
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img src={emp?.avatarUrl} alt={emp?.name} className="w-6.5 h-6.5 rounded-full object-cover" />
                                <div>
                                  <p className="font-bold text-slate-205">{emp?.name}</p>
                                  <p className="text-[9px] text-slate-500 leading-none">{emp?.designation}</p>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="p-3 text-slate-200 font-semibold">{leave.type}</td>
                          <td className="p-3 text-slate-400">{leave.startDate}</td>
                          <td className="p-3 text-slate-400">{leave.endDate}</td>
                          <td className="p-3 text-slate-350 line-clamp-1 max-w-[200px]" title={leave.reason}>{leave.reason}</td>
                          <td className="p-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                              leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              leave.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>{leave.status}</span>
                          </td>
                          {isHRorSuperAdmin && (
                            <td className="p-3 text-right">
                              {leave.status === 'Pending' ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleReviewLeave(leave.id, true)}
                                    className="bg-emerald-600 hover:bg-emerald-505 p-1 rounded text-white"
                                    title="Approve Leave"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleReviewLeave(leave.id, false)}
                                    className="bg-red-600 hover:bg-red-505 p-1 rounded text-white"
                                    title="Reject Leave"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Audited
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 📅 TAB 3: ORG DIRECTORY & HIERARCHY CHART */}
      {/* ==================================================== */}
      {activeSubTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left visual Hierarchy tree - 4 cols */}
          <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800/40 pb-2 flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-violet-400" /> Corporate Hierarchy (Org Chart)
            </h2>

            {/* Tree branches */}
            <div className="space-y-4 text-xs">
              
              {/* Root Node - Vikram CTO */}
              <div className="p-2 bg-violet-950/20 border border-violet-500/20 rounded-xl max-w-[200px]">
                <p className="font-bold text-white truncate">Vikram Malhotra</p>
                <p className="text-[9px] text-slate-400">Chief Technology Officer</p>
              </div>

              {/* Sub level */}
              <div className="pl-6 border-l border-slate-800 space-y-3">
                
                {/* Branch A - Aisha HR */}
                <div>
                  <div className="p-2 bg-slate-900 border border-slate-850 rounded-xl max-w-[200px]">
                    <p className="font-bold text-slate-200 truncate">Aisha Sharma</p>
                    <p className="text-[9px] text-slate-500 font-semibold">HR Director</p>
                  </div>
                </div>

                {/* Branch B - Rahul Eng Mgr */}
                <div className="space-y-2">
                  <div className="p-2 bg-slate-900 border border-slate-850 rounded-xl max-w-[200px]">
                    <p className="font-bold text-slate-200 truncate">Rahul Verma</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Engineering Manager</p>
                  </div>
                  
                  {/* Developers under Rahul */}
                  <div className="pl-6 border-l border-slate-800">
                    <div className="p-2 bg-slate-950 border border-slate-850 rounded-xl max-w-[170px] opacity-70">
                      <p className="font-semibold text-slate-350 truncate">Amit Roy</p>
                      <p className="text-[8px] text-slate-500">Frontend Engineer</p>
                    </div>
                  </div>
                </div>

                {/* Branch C - Priya Design Lead */}
                <div>
                  <div className="p-2 bg-slate-900 border border-slate-850 rounded-xl max-w-[200px]">
                    <p className="font-bold text-slate-200 truncate">Priya Patel</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Lead UI/UX Designer</p>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Right searchable employee profiles list - 8 cols */}
          <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/40">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Employee Directory</h2>
              
              {/* Directory Filter input */}
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by name, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1 pl-8 pr-2.5 text-xs outline-none text-slate-200 focus:border-violet-500"
                  />
                </div>
                
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-350 outline-none"
                >
                  <option value="all">All Depts</option>
                  {db.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Directory Cards list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="p-4 rounded-xl border border-slate-850 bg-slate-950/20 text-xs space-y-3 hover:border-slate-800 transition-all flex flex-col justify-between">
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={emp.avatarUrl} alt={emp.name} className="w-10 h-10 rounded-full object-cover border border-slate-800" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{emp.name}</p>
                        <p className="text-[10px] text-slate-450 truncate">{emp.designation}</p>
                        <span className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider text-slate-500">
                          {emp.employeeId}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                      emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  {/* Skills tags list */}
                  {emp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {emp.skills.map(skill => (
                        <span key={skill} className="bg-slate-900 border border-slate-850 text-slate-400 px-1.5 py-0.2 rounded text-[8px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Phone & Email contacts */}
                  <div className="pt-2 border-t border-slate-850/60 space-y-1 text-slate-500 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                      <span>{emp.mobile}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 🚀 MODAL DIALOGS */}
      {/* ==================================================== */}

      {/* APPLY LEAVE POPUP DIALOG */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in text-slate-200">
            <h2 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800/60">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e: any) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Annual">Annual Paid Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none text-slate-350"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none text-slate-350"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reason / Justification</label>
                <textarea
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="State the reason clearly for approval review..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-violet-650 hover:bg-violet-550 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Apply Leave
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
