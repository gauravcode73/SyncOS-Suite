'use client';

import React, { useState, useEffect } from 'react';
import { getDb, Task, MeetingRoom } from '@/lib/database/mockDb';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { Calendar as CalendarIcon, Clock, Video, CheckSquare } from 'lucide-react';

interface CalendarItem {
  id: string;
  title: string;
  time: string;
  type: 'meeting' | 'task';
  details?: string;
}

export default function EmployeeCalendarPage() {
  const { user } = useDashboard();
  const [items, setItems] = useState<CalendarItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const list: CalendarItem[] = [];

    // Add meetings
    db.meetingRooms.forEach(m => {
      list.push({
        id: m.id,
        title: m.title,
        time: m.scheduledAt || 'Right Now',
        type: 'meeting',
        details: `Duration: ${m.duration} mins`
      });
    });

    // Add tasks
    db.tasks.filter(t => t.assigneeIds.includes(user.id)).forEach(t => {
      list.push({
        id: t.id,
        title: t.name,
        time: t.deadline,
        type: 'task',
        details: `Priority: ${t.priority}`
      });
    });

    // Sort by date/time
    list.sort((a, b) => a.time.localeCompare(b.time));
    setItems(list);
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Sync Calendar</h2>
        <p className="text-xs text-slate-400 mt-1">Coordinate your schedule, deadlines, and online meetups.</p>
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
          <CalendarIcon className="w-4 h-4 text-violet-500" />
          <h4 className="text-sm font-bold">Upcoming Agenda</h4>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Your calendar is empty. Enjoy the free day!</p>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 p-4 border border-border bg-background/50 rounded-xl hover:border-violet-500/20 transition-all text-xs">
                <div className="flex flex-col items-center justify-center shrink-0 w-24 bg-slate-900/40 p-2 rounded-lg text-center">
                  <span className="font-extrabold text-violet-500 text-sm">{item.time.split('T')[0]}</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">{item.time.includes('T') ? item.time.split('T')[1].substring(0, 5) : 'All Day'}</span>
                </div>
                
                <div className="flex-1 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-foreground">{item.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{item.details}</p>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    item.type === 'meeting' ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
