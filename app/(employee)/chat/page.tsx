'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Search,
  Building,
  Megaphone,
  FileText,
  Image as ImageIcon,
  Smile,
  Trash2,
  Edit2,
  Copy,
  ArrowRight,
  UserCheck,
  CheckCheck,
  MoreVertical,
  Paperclip,
  X,
  File
} from 'lucide-react';
import { getDb, saveDb, addActivityLog, ChatRoom, Message, Profile, DB } from '@/lib/database/mockDb';
import { useDashboard } from '@/app/dashboard/DashboardContext';

export default function EmployeeChatPage() {
  const { user } = useDashboard();
  const [db, setDb] = useState<DB | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Search and Text Inputs
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  
  // Responsive sidebar toggles
  const [mobileLeftOpen, setMobileLeftOpen] = useState(true);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // Message Actions state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [msgMenuOpenId, setMsgMenuOpenId] = useState<string | null>(null);
  const [newDmTargetId, setNewDmTargetId] = useState('');

  // Threading
  const [replyToMsg, setReplyToMsg] = useState<Message | null>(null);

  // Auto-scroll anchor
  const scrollAnchor = useRef<HTMLDivElement>(null);

  const canStartDm = !!user && ['Super Admin', 'Admin', 'Department Head', 'Team Lead'].includes(user.role);

  const ensureRoomMembership = (room: ChatRoom | null) => {
    if (!room || !user) return room;
    const currentDb = getDb();
    const roomIndex = currentDb.chatRooms.findIndex(r => r.id === room.id);
    if (roomIndex === -1) return room;

    const targetRoom = currentDb.chatRooms[roomIndex];
    const isAllowedToJoin = targetRoom.type === 'direct'
      ? targetRoom.memberIds.includes(user.id) || canStartDm
      : targetRoom.memberIds.includes(user.id) || targetRoom.memberIds.length === 0 || canStartDm;

    if (isAllowedToJoin && !targetRoom.memberIds.includes(user.id)) {
      targetRoom.memberIds.push(user.id);
      saveDb(currentDb);
      setRooms(currentDb.chatRooms);
    }

    return targetRoom;
  };

  const fetchDb = () => {
    const currentDb = getDb();
    setDb(currentDb);
    
    const allRooms = currentDb.chatRooms;
    setRooms(allRooms);

    setActiveRoom(prev => {
      if (!prev) {
        const initialRoom = allRooms[0] ? ensureRoomMembership(allRooms[0]) : null;
        return initialRoom;
      }

      const stillExists = allRooms.find(room => room.id === prev.id);
      if (!stillExists) return null;

      return prev;
    });
  };

  const handleCreateDirectRoom = (targetProfileId: string) => {
    if (!user || !targetProfileId || targetProfileId === user.id) return;
    const currentDb = getDb();
    const existingRoom = currentDb.chatRooms.find(room => room.type === 'direct' && room.memberIds.includes(user.id) && room.memberIds.includes(targetProfileId));
    if (existingRoom) {
      setActiveRoom(existingRoom);
      setMobileLeftOpen(false);
      return;
    }

    const newRoom: ChatRoom = {
      id: `room-dm-${Date.now()}`,
      name: null,
      type: 'direct',
      memberIds: [user.id, targetProfileId],
      mutedIds: [],
      starredIds: [],
      archivedIds: [],
      createdAt: new Date().toISOString()
    };

    currentDb.chatRooms.push(newRoom);
    saveDb(currentDb);
    setRooms(currentDb.chatRooms);
    setActiveRoom(newRoom);
    setMobileLeftOpen(false);
    setNewDmTargetId('');
  };

  useEffect(() => {
    fetchDb();
    const interval = setInterval(fetchDb, 3000); // Poll DMs/Channels
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeRoom || !db) return;
    const roomMsgs = db.messages.filter(m => m.roomId === activeRoom.id);
    setMessages(roomMsgs);
    
    // Auto scroll to bottom
    setTimeout(() => {
      scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeRoom, db]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoom || !user) return;

    const joinedRoom = ensureRoomMembership(activeRoom);
    if (!joinedRoom) return;

    const db = getDb();
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      roomId: joinedRoom.id,
      senderId: user.id,
      content: inputText,
      type: 'text',
      replyToId: replyToMsg ? replyToMsg.id : null,
      reactions: [],
      readBy: [{ profileId: user.id, timestamp: new Date().toISOString() }],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.messages.push(newMessage);
    saveDb(db);
    setInputText('');
    setReplyToMsg(null);
    fetchDb();
  };

  const handleReact = (msgId: string, emoji: string) => {
    if (!user) return;
    const db = getDb();
    const idx = db.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      const msg = db.messages[idx];
      const rIdx = msg.reactions.findIndex(r => r.emoji === emoji);
      if (rIdx !== -1) {
        // Toggle user reaction
        const hasReacted = msg.reactions[rIdx].profileIds.includes(user.id);
        if (hasReacted) {
          msg.reactions[rIdx].profileIds = msg.reactions[rIdx].profileIds.filter(id => id !== user.id);
        } else {
          msg.reactions[rIdx].profileIds.push(user.id);
        }
      } else {
        msg.reactions.push({ emoji, profileIds: [user.id] });
      }
      saveDb(db);
      fetchDb();
    }
  };

  const handleEditMessage = (msgId: string) => {
    const db = getDb();
    const idx = db.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      db.messages[idx].content = editText;
      db.messages[idx].isEdited = true;
      db.messages[idx].updatedAt = new Date().toISOString();
      saveDb(db);
      setEditingMessageId(null);
      fetchDb();
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    const db = getDb();
    const idx = db.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      db.messages[idx].isDeleted = true;
      db.messages[idx].content = '🚫 This message was deleted.';
      saveDb(db);
      fetchDb();
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Silent copy
  };

  // Filter messages by search query
  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(r =>
    (r.name || 'Private Chat').toLowerCase().includes(roomSearch.toLowerCase())
  );

  // Details for right sidebar
  const getRoomDetails = () => {
    if (!activeRoom || !db) return null;
    if (activeRoom.type === 'direct') {
      const otherId = activeRoom.memberIds.find(id => id !== user?.id);
      return db.profiles.find(p => p.id === otherId) || null;
    }
    return activeRoom;
  };

  const roomDetails = getRoomDetails();

  if (!user || !db) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
      
      {/* LEFT DRAWER/SIDEBAR - ROOM LISTS */}
      <div className={`w-80 border-r border-border flex flex-col shrink-0 bg-slate-900/10 dark:bg-slate-950/20 transition-all duration-300 ${
        mobileLeftOpen ? 'flex' : 'hidden lg:flex'
      }`}>
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Workspace Channels</h3>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border p-2 rounded-xl text-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Search channels..."
              className="bg-transparent border-none outline-none w-full placeholder-slate-500"
            />
          </div>
          {canStartDm && (
            <div className="flex gap-2">
              <select
                value={newDmTargetId}
                onChange={(e) => setNewDmTargetId(e.target.value)}
                className="flex-1 bg-slate-900 border border-border rounded-lg px-2 py-2 text-[11px] text-foreground outline-none"
              >
                <option value="">Start DM with...</option>
                {db?.profiles.filter(p => p.id !== user?.id).map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleCreateDirectRoom(newDmTargetId)}
                className="bg-violet-600 hover:bg-violet-500 text-white px-2.5 rounded-lg text-[11px] font-semibold"
              >
                DM
              </button>
            </div>
          )}
        </div>

        {/* Room items */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredRooms.map(room => {
            const isActive = activeRoom?.id === room.id;
            let displayName = room.name || 'Private Chat';
            let icon = <Users className="w-4 h-4 text-violet-500" />;

            if (room.type === 'direct') {
              const otherMemberId = room.memberIds.find(id => id !== user.id);
              const otherMember = db.profiles.find(p => p.id === otherMemberId);
              displayName = otherMember ? otherMember.name : 'Unknown User';
              icon = (
                <div className="relative">
                  <img src={otherMember?.avatarUrl} className="w-5 h-5 rounded-full object-cover" />
                  <span className={`absolute bottom-[-2px] right-[-2px] w-2 h-2 rounded-full border border-background ${
                    otherMember?.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                  }`} />
                </div>
              );
            } else if (room.type === 'announcement') {
              icon = <Building className="w-4 h-4 text-indigo-500" />;
            }

            return (
              <button
                key={room.id}
                onClick={() => {
                  const joinedRoom = ensureRoomMembership(room);
                  setActiveRoom(joinedRoom);
                  setMobileLeftOpen(false); // Collapse on selection for mobile view
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive ? 'bg-violet-600/10 text-violet-600 border border-violet-500/20' : 'text-slate-400 hover:bg-border/60 hover:text-foreground border border-transparent'
                }`}
              >
                {icon}
                <span className="truncate flex-1">{displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MIDDLE SECTION - CHAT CONVERSATION */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background ${
        !mobileLeftOpen ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Active room header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileLeftOpen(true)}
              className="lg:hidden p-1 border border-border rounded-lg text-slate-400 hover:text-white"
            >
              ◀ Channels
            </button>
            <h4 className="font-bold text-xs truncate">
              {activeRoom?.type === 'direct'
                ? db.profiles.find(p => p.id === activeRoom.memberIds.find(id => id !== user.id))?.name
                : activeRoom?.name}
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/10 border border-border px-2.5 py-1 rounded-lg text-xs">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="bg-transparent border-none outline-none text-[10px] w-24 sm:w-36 text-foreground placeholder-slate-500"
              />
            </div>
            <button
              onClick={() => setMobileRightOpen(!mobileRightOpen)}
              className="p-2 border border-border rounded-lg text-slate-400 hover:text-foreground"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No messages found. Send the first message to start the thread.
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isMine = msg.senderId === user.id;
              const sender = db.profiles.find(p => p.id === msg.senderId);
              
              return (
                <div key={msg.id} className={`flex gap-3 group text-xs ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <img src={sender?.avatarUrl} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1 max-w-[70%]">
                    {!isMine && (
                      <span className="text-[10px] text-slate-500 font-bold">{sender?.name}</span>
                    )}

                    <div className={`p-3 rounded-2xl relative ${
                      isMine
                        ? 'bg-violet-600 text-white rounded-tr-none'
                        : 'bg-card border border-border text-foreground rounded-tl-none'
                    }`}>
                      {editingMessageId === msg.id ? (
                        <div className="space-y-1.5 min-w-[200px]">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-slate-900 border border-border rounded p-1.5 text-xs text-white outline-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2 py-0.5 bg-slate-700 text-white rounded text-[10px]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditMessage(msg.id)}
                              className="px-2 py-0.5 bg-violet-500 text-white rounded text-[10px]"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-relaxed break-words">{msg.content}</p>
                      )}

                      {/* Msg actions dropdown toggle */}
                      {!msg.isDeleted && editingMessageId !== msg.id && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-slate-950/60 p-0.5 rounded">
                          <button
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditText(msg.content);
                            }}
                            className="p-0.5 hover:bg-slate-800 rounded text-slate-300"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-0.5 hover:bg-slate-800 rounded text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCopyMessage(msg.content)}
                            className="p-0.5 hover:bg-slate-800 rounded text-slate-350"
                            title="Copy"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reactions & timestamp */}
                    <div className="flex items-center gap-2 mt-1 select-none">
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {/* Emoji quick triggers */}
                      {!msg.isDeleted && (
                        <div className="flex gap-1 text-[10px]">
                          <button onClick={() => handleReact(msg.id, '👍')} className="hover:scale-110">👍</button>
                          <button onClick={() => handleReact(msg.id, '❤️')} className="hover:scale-110">❤️</button>
                          <button onClick={() => handleReact(msg.id, '🔥')} className="hover:scale-110">🔥</button>
                        </div>
                      )}

                      {/* Display active reactions */}
                      {msg.reactions.map(r => {
                        if (r.profileIds.length === 0) return null;
                        return (
                          <span key={r.emoji} className="bg-slate-900 border border-border px-1 py-0.2 rounded text-[9px]">
                            {r.emoji} {r.profileIds.length}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollAnchor} />
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-border shrink-0 bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message to channel..."
              className="flex-1 bg-slate-900/10 dark:bg-slate-950/60 border border-border hover:border-violet-500/30 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs outline-none text-foreground placeholder-slate-500"
            />
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-xl transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDEBAR - DETAILS */}
      {mobileRightOpen && roomDetails && (
        <div className="w-80 border-l border-border bg-card p-6 overflow-y-auto space-y-6 shrink-0 absolute inset-y-0 right-0 z-35 lg:relative lg:inset-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h4 className="font-bold text-xs">Details Panel</h4>
            <button
              onClick={() => setMobileRightOpen(false)}
              className="p-1 hover:bg-border/60 rounded text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {'type' in roomDetails ? (
            // Room details
            <div className="space-y-4 text-xs text-slate-400">
              <div>
                <p className="font-bold text-foreground mb-1">{roomDetails.name}</p>
                <p className="text-[10px]">Type: {roomDetails.type}</p>
              </div>
            </div>
          ) : (
            // User details
            <div className="space-y-4 text-center">
              <img src={roomDetails.avatarUrl} className="w-20 h-20 rounded-full border border-border mx-auto object-cover" />
              <div>
                <h4 className="font-bold text-sm text-foreground">{roomDetails.name}</h4>
                <p className="text-xs text-slate-400">{roomDetails.designation}</p>
              </div>
              <div className="text-left text-xs space-y-2 border-t border-border pt-4 text-slate-400">
                <p><strong>Email:</strong> {roomDetails.email}</p>
                <p><strong>Status:</strong> {roomDetails.onlineStatus}</p>
                <p><strong>Mobile:</strong> ••••••••••</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
