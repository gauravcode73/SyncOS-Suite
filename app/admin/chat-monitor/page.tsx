'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addAuditLog, ChatRoom, Message, Profile, DB } from '@/lib/database/mockDb';
import { Shield, Search, Eye, Trash2, Edit3, MessageSquare, Download, Archive, VolumeX } from 'lucide-react';

export default function AdminChatMonitorPage() {
  const [db, setDb] = useState<DB | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [dbVersion, setDbVersion] = useState(0);

  const fetchDb = () => {
    const currentDb = getDb();
    setDb(currentDb);
    setRooms(currentDb.chatRooms);
    if (!selectedRoom && currentDb.chatRooms.length > 0) {
      setSelectedRoom(currentDb.chatRooms[0]);
    }
  };

  useEffect(() => {
    fetchDb();
    const interval = setInterval(fetchDb, 1500);
    return () => clearInterval(interval);
  }, [dbVersion]);

  useEffect(() => {
    if (!selectedRoom || !db) return;
    setMessages(db.messages.filter(m => m.roomId === selectedRoom.id));
  }, [selectedRoom, db]);

  const handleDeleteMessage = (msgId: string) => {
    const currentDb = getDb();
    const idx = currentDb.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      currentDb.messages[idx].isDeleted = true;
      currentDb.messages[idx].content = '🚫 This message was deleted by Super Admin moderation.';
      addAuditLog('system', 'Moderate Delete Message', 'messages', msgId, `Admin removed message content from room: ${selectedRoom?.name || 'Private'}`);
      saveDb(currentDb);
      setDbVersion(v => v + 1);
    }
  };

  const handleExportHistory = () => {
    if (!selectedRoom || messages.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chat_history_${selectedRoom.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addAuditLog('system', 'Export Chat History', 'messages', selectedRoom.id, `Exported audit logs for room: ${selectedRoom.name || 'Private'}`);
  };

  const filteredRooms = rooms.filter(r =>
    (r.name || 'Private DM').toLowerCase().includes(roomSearch.toLowerCase())
  );

  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  if (!db) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" /> Chat Monitoring Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">Audit, export, and moderate company-owned communication feeds.</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 text-red-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          ⚠️ Administrative Monitoring Enabled
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px]">
        {/* Left rooms selector */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2 bg-slate-900/15 border border-border p-2 rounded-xl text-xs">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search feeds..."
                className="bg-transparent border-none outline-none w-full text-foreground placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredRooms.map(room => {
              const isActive = selectedRoom?.id === room.id;
              let name = room.name || 'Private DM';
              if (room.type === 'direct') {
                const members = room.memberIds.map(id => db.profiles.find(p => p.id === id)?.name).filter(Boolean);
                name = `💬 DM: ${members.join(' ⇄ ')}`;
              }
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold text-left transition-all ${
                    isActive ? 'bg-violet-600/10 text-violet-600 border border-violet-500/20' : 'text-slate-450 hover:bg-slate-800/10 hover:text-white border border-transparent'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right feed display */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          {selectedRoom ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-slate-900/5">
                <div className="min-w-0 pr-4">
                  <h3 className="text-xs font-bold text-foreground truncate">
                    Auditing: {selectedRoom.name || 'Private DM'}
                  </h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Type: {selectedRoom.type}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportHistory}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-border text-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Logs
                  </button>
                </div>
              </div>

              {/* Message Lists */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {filteredMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">No communication logs recorded in this feed.</p>
                ) : (
                  filteredMessages.map(msg => {
                    const sender = db.profiles.find(p => p.id === msg.senderId);
                    return (
                      <div key={msg.id} className="flex gap-3 text-xs justify-start border-b border-border/20 pb-3 last:border-0">
                        <img src={sender?.avatarUrl} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-bold text-slate-355">{sender?.name || 'System'}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                              {!msg.isDeleted && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 hover:bg-red-500/10 text-red-400 rounded transition-all cursor-pointer"
                                  title="Moderate Remove Message"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className={`leading-relaxed break-words ${msg.isDeleted ? 'text-red-400 italic' : 'text-slate-300'}`}>
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select a communication feed to begin auditing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
