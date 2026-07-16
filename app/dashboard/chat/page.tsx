'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../DashboardContext';
import {
  getDb,
  saveDb,
  addActivityLog,
  addAuditLog,
  ChatRoom,
  Message,
  Profile
} from '@/lib/database/mockDb';
import {
  Hash,
  MessageSquare,
  Users,
  Search,
  Send,
  MoreHorizontal,
  Smile,
  Mic,
  Paperclip,
  Bookmark,
  Reply,
  Edit2,
  Trash2,
  X,
  Volume2,
  AlertCircle,
  Eye,
  BellOff,
  Bell,
  Archive,
  Star,
  Pin,
  CornerDownRight,
  SendHorizontal,
  Plus
} from 'lucide-react';

export default function WorkspaceChat() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [db, setDb] = useState(getDb());
  const [activeRoomId, setActiveRoomId] = useState<string>('room-announcements');

  // Chat Feed States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  
  // Search state within room
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [isRoomSearchOpen, setIsRoomSearchOpen] = useState(false);

  // Thread Sidebar State
  const [activeThreadParentId, setActiveThreadParentId] = useState<string | null>(null);
  const [threadInputText, setThreadInputText] = useState('');

  // Typing indicator simulation
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Filter sidebar states
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [roomListSearch, setRoomListSearch] = useState('');
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [newDmSearch, setNewDmSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  // Load room messages
  useEffect(() => {
    const currentDb = getDb();
    const roomMessages = currentDb.messages.filter(m => m.roomId === activeRoomId);
    setMessages(roomMessages);

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Simulate other user typing indicator occasionally on entering a channel
    if (activeRoomId !== 'room-announcements' && Math.random() > 0.4) {
      const room = currentDb.chatRooms.find(r => r.id === activeRoomId);
      const otherMembers = room?.memberIds.filter(id => id !== user?.id) || [];
      if (otherMembers.length > 0) {
        const typingId = otherMembers[Math.floor(Math.random() * otherMembers.length)];
        const typingName = currentDb.profiles.find(p => p.id === typingId)?.name || 'Someone';
        
        setTimeout(() => {
          setTypingUser(typingName);
          setTimeout(() => setTypingUser(null), 3000);
        }, 1500);
      }
    }
  }, [activeRoomId, dbVersion]);

  if (!user) return null;

  const activeRoom = db.chatRooms.find(r => r.id === activeRoomId) || db.chatRooms[0];

  // Room members
  const roomMembers = db.profiles.filter(p => activeRoom?.memberIds.includes(p.id));

  // Determine chat name
  const getRoomName = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherId = room.memberIds.find(id => id !== user.id);
      const otherUser = db.profiles.find(p => p.id === otherId);
      return otherUser ? `${otherUser.name} (${otherUser.designation})` : 'Direct Chat';
    }
    return room.name || 'Group Chat';
  };

  // Check if room is unread
  const isRoomUnread = (room: ChatRoom) => {
    // Simple mock unread simulation
    if (room.id === 'room-announcements' && activeRoomId !== 'room-announcements') return true;
    return false;
  };

  // Mute / Star / Archive room togglers
  const handleToggleMute = (roomId: string) => {
    const currentDb = getDb();
    const roomIdx = currentDb.chatRooms.findIndex(r => r.id === roomId);
    if (roomIdx !== -1) {
      const room = currentDb.chatRooms[roomIdx];
      if (!room.mutedIds) room.mutedIds = [];
      if (room.mutedIds.includes(user.id)) {
        room.mutedIds = room.mutedIds.filter(id => id !== user.id);
      } else {
        room.mutedIds.push(user.id);
      }
      saveDb(currentDb);
      refreshDbState();
    }
  };

  const handleToggleStar = (roomId: string) => {
    const currentDb = getDb();
    const roomIdx = currentDb.chatRooms.findIndex(r => r.id === roomId);
    if (roomIdx !== -1) {
      const room = currentDb.chatRooms[roomIdx];
      if (!room.starredIds) room.starredIds = [];
      if (room.starredIds.includes(user.id)) {
        room.starredIds = room.starredIds.filter(id => id !== user.id);
      } else {
        room.starredIds.push(user.id);
      }
      saveDb(currentDb);
      refreshDbState();
    }
  };

  // SEND MESSAGE
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentDb = getDb();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      roomId: activeRoomId,
      senderId: user.id,
      content: inputText,
      type: 'text',
      reactions: [],
      readBy: [{ profileId: user.id, timestamp: new Date().toISOString() }],
      replyToId: replyToId,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    currentDb.messages.push(newMsg);
    saveDb(currentDb);
    
    setInputText('');
    setReplyToId(null);
    refreshDbState();

    // Trigger scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // EDIT MESSAGE
  const handleEditMessage = (msgId: string, newText: string) => {
    if (!newText.trim()) return;
    const currentDb = getDb();
    const idx = currentDb.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      currentDb.messages[idx].content = newText;
      currentDb.messages[idx].isEdited = true;
      currentDb.messages[idx].updatedAt = new Date().toISOString();
      saveDb(currentDb);
      setEditingMessageId(null);
      refreshDbState();
    }
  };

  // DELETE MESSAGE (Soft delete)
  const handleDeleteMessage = (msgId: string) => {
    const currentDb = getDb();
    const idx = currentDb.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      const msg = currentDb.messages[idx];
      msg.isDeleted = true;
      msg.content = 'This message was deleted.';
      
      // If admin deletes someone else's message, log to audit
      if (msg.senderId !== user.id && (user.role === 'Super Admin' || user.role === 'HR Admin')) {
        addAuditLog(
          user.id,
          'Message Deleted by Admin',
          'messages',
          msgId,
          `Admin deleted message in room "${getRoomName(activeRoom)}". Sender ID: ${msg.senderId}`
        );
      }

      saveDb(currentDb);
      refreshDbState();
    }
  };

  // REACT TO MESSAGE (Emoji)
  const handleReactToMessage = (msgId: string, emoji: string) => {
    const currentDb = getDb();
    const idx = currentDb.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      const msg = currentDb.messages[idx];
      if (!msg.reactions) msg.reactions = [];

      const reactionIdx = msg.reactions.findIndex(r => r.emoji === emoji);
      if (reactionIdx === -1) {
        msg.reactions.push({ emoji, profileIds: [user.id] });
      } else {
        const reactions = msg.reactions[reactionIdx];
        if (reactions.profileIds.includes(user.id)) {
          reactions.profileIds = reactions.profileIds.filter(id => id !== user.id);
          if (reactions.profileIds.length === 0) {
            msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
          }
        } else {
          reactions.profileIds.push(user.id);
        }
      }
      saveDb(currentDb);
      refreshDbState();
    }
  };

  // VOICE NOTE SIMULATOR
  const triggerVoiceNote = () => {
    const currentDb = getDb();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      roomId: activeRoomId,
      senderId: user.id,
      content: '🎙️ Voice message (0:12)',
      type: 'voice',
      fileUrl: '#',
      fileName: 'Voice_Note.mp3',
      reactions: [],
      readBy: [{ profileId: user.id, timestamp: new Date().toISOString() }],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    currentDb.messages.push(newMsg);
    saveDb(currentDb);
    refreshDbState();
  };

  // FILE ATTACHMENT SIMULATOR
  const triggerFileUpload = () => {
    const currentDb = getDb();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      roomId: activeRoomId,
      senderId: user.id,
      content: '📎 Shared a file document',
      type: 'file',
      fileUrl: '#',
      fileName: 'SyncOS_Productivity_Report.pdf',
      fileSize: '1.4 MB',
      reactions: [],
      readBy: [{ profileId: user.id, timestamp: new Date().toISOString() }],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    currentDb.messages.push(newMsg);
    saveDb(currentDb);
    refreshDbState();
  };

  // SEND THREAD REPLY
  const handleSendThreadReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadInputText.trim() || !activeThreadParentId) return;

    const currentDb = getDb();
    // In our simplified layout, thread replies are added as comments on the parent message or subtasks, or
    // we can create a sub-chat message linked via replyToId.
    // Let's create a sub-chat message in the same room with replyToId set!
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      roomId: activeRoomId,
      senderId: user.id,
      content: threadInputText,
      type: 'text',
      replyToId: activeThreadParentId,
      reactions: [],
      readBy: [{ profileId: user.id, timestamp: new Date().toISOString() }],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    currentDb.messages.push(newMsg);
    saveDb(currentDb);
    setThreadInputText('');
    refreshDbState();
    
    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleStartDM = (targetEmployeeId: string) => {
    const currentDb = getDb();
    
    // Check if direct message room already exists
    let existingRoom = currentDb.chatRooms.find(r => 
      r.type === 'direct' && 
      r.memberIds.includes(user!.id) && 
      r.memberIds.includes(targetEmployeeId)
    );

    if (existingRoom) {
      setActiveRoomId(existingRoom.id);
    } else {
      const newRoomId = `room-dm-${Date.now()}`;
      const newRoom: ChatRoom = {
        id: newRoomId,
        name: null,
        type: 'direct',
        memberIds: [user!.id, targetEmployeeId],
        mutedIds: [],
        starredIds: [],
        archivedIds: []
      };
      currentDb.chatRooms.push(newRoom);
      saveDb(currentDb);
      refreshDbState();
      setActiveRoomId(newRoomId);
    }

    setNewDmOpen(false);
    setNewDmSearch('');
  };

  // Filtered rooms list
  const filteredRooms = db.chatRooms.filter(room => {
    const name = getRoomName(room).toLowerCase();
    const searchMatch = name.includes(roomListSearch.toLowerCase());
    
    if (!searchMatch) return false;
    
    if (chatFilter === 'unread') {
      return isRoomUnread(room);
    }
    if (chatFilter === 'starred') {
      return room.starredIds?.includes(user.id);
    }
    return true;
  });

  // Filtered messages by search inside room
  const filteredMessages = messages.filter(m => {
    if (!roomSearchQuery) return true;
    return m.content.toLowerCase().includes(roomSearchQuery.toLowerCase()) && !m.isDeleted;
  });

  // Selected thread parent message
  const threadParentMessage = messages.find(m => m.id === activeThreadParentId);
  const threadReplies = messages.filter(m => m.replyToId === activeThreadParentId);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
      
      {/* 1. SIDEBAR - CHATS LIST */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Sidebar filters and search */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chat list..."
              value={roomListSearch}
              onChange={(e) => setRoomListSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs outline-none text-slate-200 placeholder-slate-600 focus:border-violet-500"
            />
          </div>

          <div className="flex gap-1.5 bg-slate-950 p-0.5 rounded-lg border border-slate-850">
            {(['all', 'unread', 'starred'] as const).map(f => (
              <button
                key={f}
                onClick={() => setChatFilter(f)}
                className={`flex-1 text-[10px] py-1 font-bold rounded uppercase tracking-wider transition-all ${
                  chatFilter === f ? 'bg-violet-650 text-white shadow-sm' : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Channels scroll container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* Announcements & Dept channels */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5 flex items-center justify-between">
              Channels
            </h3>
            <div className="space-y-0.5">
              {filteredRooms
                .filter(r => r.type !== 'direct')
                .map(room => {
                  const isSelected = activeRoomId === room.id;
                  const isUnread = isRoomUnread(room);
                  const isMuted = room.mutedIds?.includes(user.id);
                  const isStarred = room.starredIds?.includes(user.id);
                  
                  return (
                    <button
                      key={room.id}
                      onClick={() => { setActiveRoomId(room.id); setActiveThreadParentId(null); }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-250'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Hash className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        <span className={`text-xs truncate ${isUnread && !isSelected ? 'font-extrabold text-white' : 'font-medium'}`}>
                          {getRoomName(room)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {isMuted && <BellOff className="w-2.5 h-2.5 opacity-60" />}
                        {isStarred && <Star className={`w-2.5 h-2.5 fill-current ${isSelected ? 'text-white' : 'text-yellow-500'}`} />}
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Direct messages */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5 flex items-center justify-between">
              <span>Direct Messages</span>
              <button
                onClick={() => setNewDmOpen(!newDmOpen)}
                className="text-slate-500 hover:text-white p-0.5 rounded transition-all hover:bg-slate-800"
                title="Start Private Chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </h3>

            {newDmOpen && (
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 my-2 space-y-2 text-left">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={newDmSearch}
                  onChange={(e) => setNewDmSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] outline-none text-slate-200 placeholder-slate-650"
                  autoFocus
                />
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                  {db.profiles
                    .filter(p => p.id !== user!.id && p.name.toLowerCase().includes(newDmSearch.toLowerCase()))
                    .map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => handleStartDM(emp.id)}
                        className="w-full text-left p-1.5 hover:bg-slate-800 rounded text-[10px] text-slate-350 truncate flex items-center gap-1.5 transition-all font-semibold"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span>{emp.name} ({emp.designation})</span>
                      </button>
                    ))}
                  {db.profiles.filter(p => p.id !== user!.id && p.name.toLowerCase().includes(newDmSearch.toLowerCase())).length === 0 && (
                    <p className="text-[9px] text-slate-550 text-center py-2">No employees found.</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {filteredRooms
                .filter(r => r.type === 'direct')
                .map(room => {
                  const isSelected = activeRoomId === room.id;
                  const otherId = room.memberIds.find(id => id !== user.id);
                  const otherUser = db.profiles.find(p => p.id === otherId);
                  const isOnline = otherUser?.onlineStatus === 'online';
                  
                  return (
                    <button
                      key={room.id}
                      onClick={() => { setActiveRoomId(room.id); setActiveThreadParentId(null); }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-250'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <span className={`block w-2 h-2 rounded-full border border-slate-900 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-700'
                          }`} />
                        </div>
                        <span className={`text-xs truncate ${isSelected ? 'text-white' : 'text-slate-350'}`}>
                          {otherUser?.name || 'Workspace Colleague'}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

        </div>

      </div>

      {/* 2. CHAT FEED - VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/60">
        
        {/* Chat Feed Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-violet-400" />
              {activeRoom ? getRoomName(activeRoom) : 'Select Chat'}
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold">{roomMembers.length} active workspace members</p>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Search room input trigger */}
            <button
              onClick={() => setIsRoomSearchOpen(!isRoomSearchOpen)}
              className={`p-1.5 rounded-lg text-slate-450 hover:text-white transition-all ${
                isRoomSearchOpen ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'
              }`}
              title="Search Room Messages"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mute and Star quick actions for active room */}
            {activeRoom && (
              <>
                <button
                  onClick={() => handleToggleStar(activeRoom.id)}
                  className="p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-slate-900"
                  title="Star Chat"
                >
                  <Star className={`w-4 h-4 ${activeRoom.starredIds?.includes(user.id) ? 'fill-current text-yellow-500' : ''}`} />
                </button>
                <button
                  onClick={() => handleToggleMute(activeRoom.id)}
                  className="p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-slate-900"
                  title="Mute Notifications"
                >
                  {activeRoom.mutedIds?.includes(user.id) ? <BellOff className="w-4 h-4 text-slate-400" /> : <Bell className="w-4 h-4" />}
                </button>
              </>
            )}

          </div>
        </div>

        {/* Search bar inside room viewport */}
        {isRoomSearchOpen && (
          <div className="bg-slate-900/80 px-6 py-2 border-b border-slate-800 flex items-center gap-3">
            <Search className="w-3.5 h-3.5 text-slate-550" />
            <input
              type="text"
              placeholder="Find keywords in this conversation..."
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-slate-600"
            />
            <button
              onClick={() => { setRoomSearchQuery(''); setIsRoomSearchOpen(false); }}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ⚠️ SECURITY DISCLAIMER MONITORING WARNING BANNER */}
        <div className="bg-amber-950/20 border-b border-amber-900/30 px-6 py-2 flex items-center gap-2.5 text-[10px] text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span><strong>Notice:</strong> This is a monitored corporate workspace. Communications, chat messages, and file sharing are audited for security, compliance, and organizational records.</span>
        </div>

        {/* Messages Feed Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {filteredMessages.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs">
              💬 Beginning of conversation. Send a message to start syncing!
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const sender = db.profiles.find(p => p.id === msg.senderId);
              const isMe = msg.senderId === user.id;
              
              // Find if this message has thread replies
              const replyCount = db.messages.filter(m => m.replyToId === msg.id).length;
              
              // Resolve reply parent message text
              let replyParentText = '';
              if (msg.replyToId) {
                const parent = db.messages.find(m => m.id === msg.replyToId);
                replyParentText = parent ? parent.content : 'Original message';
              }

              return (
                <div key={msg.id} className="group relative flex items-start gap-3.5 p-2 rounded-xl hover:bg-slate-900/30 transition-all">
                  
                  <img src={sender?.avatarUrl} alt={sender?.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-850" />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    
                    {/* Header info */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{sender?.name || 'Colleague'}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded border border-slate-750 font-medium">
                        {sender?.designation}
                      </span>
                      <span className="text-[9px] text-slate-550">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      
                      {msg.isEdited && (
                        <span className="text-[8px] text-slate-550 italic bg-slate-900 px-1 rounded">(edited)</span>
                      )}
                    </div>

                    {/* Reply tag if message responds to another */}
                    {msg.replyToId && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/60 p-1.5 rounded-lg border border-slate-850 max-w-sm italic">
                        <CornerDownRight className="w-3 h-3 text-violet-400 shrink-0" />
                        <span className="truncate">Replying to: "{replyParentText}"</span>
                      </div>
                    )}

                    {/* Content text */}
                    {editingMessageId === msg.id ? (
                      <div className="flex items-center gap-2 mt-1 max-w-xl">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 bg-slate-950 border border-violet-500 rounded p-1.5 text-xs text-white outline-none"
                        />
                        <button
                          onClick={() => handleEditMessage(msg.id, editText)}
                          className="bg-violet-600 text-white text-[10px] font-bold px-2 py-1.5 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="text-slate-400 text-xs p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 leading-relaxed break-words pr-8">
                        
                        {/* Render file attachments */}
                        {msg.type === 'file' && (
                          <div className="mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4 max-w-xs">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-200 truncate text-[11px]">{msg.fileName}</p>
                              <p className="text-[9px] text-slate-550 mt-0.5">{msg.fileSize}</p>
                            </div>
                            <a
                              href="#"
                              onClick={(e) => e.preventDefault()}
                              className="text-[10px] text-violet-400 hover:text-white font-bold"
                            >
                              Download
                            </a>
                          </div>
                        )}

                        {/* Render Voice Message */}
                        {msg.type === 'voice' && (
                          <div className="mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3 max-w-xs">
                            <span className="text-lg">🔊</span>
                            <div className="flex-1 space-y-1">
                              <div className="h-6 flex items-center gap-0.5">
                                <span className="w-1 h-3 bg-violet-500 rounded-full" />
                                <span className="w-1 h-4 bg-violet-400 rounded-full" />
                                <span className="w-1 h-2 bg-violet-500 rounded-full" />
                                <span className="w-1 h-5 bg-violet-300 rounded-full" />
                                <span className="w-1 h-3 bg-violet-500 rounded-full" />
                              </div>
                              <p className="text-[9px] text-slate-550 leading-none">Voice Message • 0:12</p>
                            </div>
                          </div>
                        )}

                        {/* Text Content */}
                        {msg.type === 'text' && msg.content}
                      </div>
                    )}

                    {/* Reactions display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {msg.reactions.map(react => (
                          <button
                            key={react.emoji}
                            onClick={() => handleReactToMessage(msg.id, react.emoji)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                              react.profileIds.includes(user.id)
                                ? 'bg-violet-950/40 text-violet-300 border-violet-500/30'
                                : 'bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            <span>{react.emoji}</span>
                            <span>{react.profileIds.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Thread trigger */}
                    {replyCount > 0 && !msg.replyToId && (
                      <button
                        onClick={() => setActiveThreadParentId(msg.id)}
                        className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 mt-1 transition-all"
                      >
                        <Reply className="w-3 h-3" />
                        <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                      </button>
                    )}

                  </div>

                  {/* Actions hover-bar */}
                  {!msg.isDeleted && (
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-lg transition-opacity">
                      
                      <button
                        onClick={() => handleReactToMessage(msg.id, '👍')}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                        title="React 👍"
                      >
                        👍
                      </button>

                      <button
                        onClick={() => { setReplyToId(msg.id); setInputText(''); }}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                        title="Reply / Thread"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      {isMe && (
                        <button
                          onClick={() => { setEditingMessageId(msg.id); setEditText(msg.content); }}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(isMe || user.role === 'Super Admin' || user.role === 'HR Admin') && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 hover:bg-slate-850 text-red-400 hover:text-red-300 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  )}

                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {typingUser && (
            <div className="flex items-center gap-2 text-[10px] text-slate-450 italic px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span>{typingUser} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Area */}
        <div className="p-4 border-t border-slate-850 bg-slate-900/20">
          
          {/* Reply-to tag overlay if active */}
          {replyToId && (
            <div className="mb-2 p-2 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between text-xs text-slate-400 italic">
              <span className="truncate">Replying to message: "{messages.find(m => m.id === replyToId)?.content}"</span>
              <button onClick={() => setReplyToId(null)} className="text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            
            {/* Simulated file upload click */}
            <button
              type="button"
              onClick={triggerFileUpload}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-white transition-all shrink-0"
              title="Attach Document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Simulated voice recorder click */}
            <button
              type="button"
              onClick={triggerVoiceNote}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-white transition-all shrink-0"
              title="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Text input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeRoom?.type === 'announcement' && user.role !== 'Super Admin' && user.role !== 'HR Admin'
                  ? 'Announcement channel is read-only for employees'
                  : `Message #${activeRoom ? getRoomName(activeRoom) : 'channel'}...`
              }
              disabled={activeRoom?.type === 'announcement' && user.role !== 'Super Admin' && user.role !== 'HR Admin'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-xs outline-none text-slate-200 placeholder-slate-650 focus:border-violet-500 transition-all disabled:opacity-50"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>

          </form>
        </div>

      </div>

      {/* 3. THREAD REPLY SIDEBAR PANEL DRAWER (Optional on Click) */}
      {activeThreadParentId && threadParentMessage && (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
          
          <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-violet-400" /> Message Thread
            </h3>
            <button
              onClick={() => setActiveThreadParentId(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thread messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Parent message block */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-bold text-slate-200">{db.profiles.find(p => p.id === threadParentMessage.senderId)?.name || 'Colleague'}</span>
                <span className="text-[9px] text-slate-500">{new Date(threadParentMessage.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-350 leading-relaxed">{threadParentMessage.content}</p>
            </div>

            <div className="h-px bg-slate-800/60 my-2" />

            {/* Thread Replies */}
            {threadReplies.length === 0 ? (
              <div className="text-center py-6 text-slate-550 text-[10px]">
                No replies yet. Start the conversation thread!
              </div>
            ) : (
              <div className="space-y-3">
                {threadReplies.map(reply => {
                  const replySender = db.profiles.find(p => p.id === reply.senderId);
                  return (
                    <div key={reply.id} className="p-2.5 rounded-lg border border-slate-850 bg-slate-950/10 text-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold text-slate-200">{replySender?.name}</span>
                        <span className="text-[9px] text-slate-500">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-400 leading-normal">{reply.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div ref={threadEndRef} />
          </div>

          {/* Thread input form */}
          <div className="p-3 border-t border-slate-850">
            <form onSubmit={handleSendThreadReply} className="flex gap-2">
              <input
                type="text"
                placeholder="Reply in thread..."
                value={threadInputText}
                onChange={(e) => setThreadInputText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 text-[11px] text-white outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={!threadInputText.trim()}
                className="bg-violet-600 hover:bg-violet-550 px-2.5 rounded-lg text-white font-semibold text-[10px] disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
