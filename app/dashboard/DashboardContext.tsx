'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDb, saveDb, getCurrentUser, setCurrentUser, addActivityLog, Profile, Attendance } from '@/lib/database/mockDb';

interface DashboardContextType {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  attendance: Attendance | null;
  isClockedIn: boolean;
  isOnBreak: boolean;
  clockInTime: string | null;
  workingHours: number;
  triggerClockIn: (reason?: string) => void;
  triggerClockOut: () => void;
  triggerBreak: () => void;
  refreshDbState: () => void;
  dbVersion: number;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [dbVersion, setDbVersion] = useState(0);

  // Sync state with dbVersion
  const refreshDbState = () => {
    setDbVersion(v => v + 1);
  };

  useEffect(() => {
    const activeUser = getCurrentUser();
    if (!activeUser) {
      router.push('/');
      return;
    }
    setUserState(activeUser);

    // Sync user online status
    const db = getDb();
    const userIdx = db.profiles.findIndex(p => p.id === activeUser.id);
    if (userIdx !== -1 && db.profiles[userIdx].onlineStatus !== 'online') {
      db.profiles[userIdx].onlineStatus = 'online';
      db.profiles[userIdx].lastActive = new Date().toISOString();
      saveDb(db);
    }

    // Load today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = db.attendance.find(a => a.profileId === activeUser.id && a.date === today) || null;
    setAttendance(todayRecord);
  }, [router, dbVersion]);

  const setUser = (newUser: Profile | null) => {
    setCurrentUser(newUser);
    setUserState(newUser);
    if (!newUser) {
      router.push('/');
    } else {
      refreshDbState();
    }
  };

  const isClockedIn = !!(attendance && attendance.checkIn && !attendance.checkOut);
  const isOnBreak = !!(attendance && attendance.breaks.length > 0 && attendance.breaks[attendance.breaks.length - 1].end === null);
  const clockInTime = attendance?.checkIn || null;
  const workingHours = attendance?.workingHours || 0;

  const triggerClockIn = (reason?: string) => {
    if (!user) return;
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    let record = db.attendance.find(a => a.profileId === user.id && a.date === today);

    // Check if late (after 09:15)
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const isLate = currentHour > 9 || (currentHour === 9 && currentMin > 15);

    if (!record) {
      record = {
        id: `att-${user.id}-${today}`,
        profileId: user.id,
        date: today,
        checkIn: now,
        checkOut: null,
        breaks: [],
        workingHours: 0,
        status: isLate ? 'Late' : 'Present',
        lateReason: isLate ? (reason || 'Commute delay') : undefined
      };
      db.attendance.push(record);
    } else {
      record.checkIn = now;
      record.checkOut = null;
      record.status = isLate ? 'Late' : 'Present';
      if (isLate && reason) {
        record.lateReason = reason;
      }
    }

    addActivityLog(user.id, 'Attendance Check-In', `Clocked in successfully. Status: ${record.status}`);
    saveDb(db);
    setAttendance(record);
    refreshDbState();
  };

  const triggerClockOut = () => {
    if (!user || !attendance) return;
    const db = getDb();
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const record = db.attendance.find(a => a.profileId === user.id && a.date === today);
    if (record && record.checkIn) {
      record.checkOut = now;
      
      // Calculate work hours
      const checkInDate = new Date(record.checkIn);
      const checkOutDate = new Date(now);
      let totalMs = checkOutDate.getTime() - checkInDate.getTime();
      
      // Subtract break durations
      let totalBreakMs = 0;
      record.breaks.forEach(b => {
        const start = new Date(b.start);
        const end = b.end ? new Date(b.end) : new Date(); // If break not ended, end it now
        totalBreakMs += end.getTime() - start.getTime();
      });
      
      // Ensure any pending break is ended
      const activeBreakIdx = record.breaks.findIndex(b => b.end === null);
      if (activeBreakIdx !== -1) {
        record.breaks[activeBreakIdx].end = now;
      }

      const activeMs = totalMs - totalBreakMs;
      record.workingHours = Math.max(0, parseFloat((activeMs / (1000 * 60 * 60)).toFixed(2)));
      
      addActivityLog(user.id, 'Attendance Check-Out', `Clocked out. Calculated working hours: ${record.workingHours}h`);
      saveDb(db);
      setAttendance(record);
      refreshDbState();
    }
  };

  const triggerBreak = () => {
    if (!user || !attendance || !attendance.checkIn) return;
    const db = getDb();
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const record = db.attendance.find(a => a.profileId === user.id && a.date === today);
    if (record && record.checkIn) {
      const activeBreakIdx = record.breaks.findIndex(b => b.end === null);
      
      if (activeBreakIdx === -1) {
        // Start break
        record.breaks.push({ start: now, end: null });
        addActivityLog(user.id, 'Break Started', 'Began attendance break.');
      } else {
        // End break
        record.breaks[activeBreakIdx].end = now;
        addActivityLog(user.id, 'Break Ended', 'Returned from break.');
        
        // Recalculate working hours up to now
        const checkInDate = new Date(record.checkIn);
        const nowSec = new Date().getTime();
        let totalMs = nowSec - checkInDate.getTime();
        
        let totalBreakMs = 0;
        record.breaks.forEach(b => {
          if (b.end) {
            totalBreakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
          }
        });
        record.workingHours = Math.max(0, parseFloat(((totalMs - totalBreakMs) / (1000 * 60 * 60)).toFixed(2)));
      }
      
      saveDb(db);
      setAttendance(record);
      refreshDbState();
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        user,
        setUser,
        attendance,
        isClockedIn,
        isOnBreak,
        clockInTime,
        workingHours,
        triggerClockIn,
        triggerClockOut,
        triggerBreak,
        refreshDbState,
        dbVersion
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
