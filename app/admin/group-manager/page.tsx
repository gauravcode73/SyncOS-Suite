'use client';

import React, { useState, useEffect } from 'react';
import { getDb, saveDb, addAuditLog, ChatRoom, Profile } from '@/lib/database/mockDb';
import { Users, Plus, Shield, Trash2, Edit2, Check, X, UserMinus, UserPlus } from 'lucide-react';

export default function AdminGroupManagerPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  
  // Create state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<any>('project');
  const [newDesc, setNewDesc] = useState('');

  // Editing state
  const [editName, setEditName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Member manipulation state
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');

  useEffect(() => {
    const db = getDb();
    setRooms(db.chatRooms.filter(r => r.type !== 'direct'));
    setProfiles(db.profiles);
  }, []);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const db = getDb();
    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
      name: newName,
      type: newType,
      memberIds: [],
      mutedIds: [],
      starredIds: [],
      archivedIds: []
    };

    db.chatRooms.push(newRoom);
    addAuditLog('system', 'Create Chat Channel', 'chat_rooms', newRoom.id, `Created new channel: ${newRoom.name} (${newRoom.type})`);
    saveDb(db);

    setRooms(db.chatRooms.filter(r => r.type !== 'direct'));
    setSelectedRoom(newRoom);
    setNewName('');
  };

  const handleDeleteGroup = (roomId: string) => {
    const db = getDb();
    db.chatRooms = db.chatRooms.filter(r => r.id !== roomId);
    // clean messages
    db.messages = db.messages.filter(m => m.roomId !== roomId);
    addAuditLog('system', 'Delete Chat Channel', 'chat_rooms', roomId, `Deleted channel: ${selectedRoom?.name}`);
    saveDb(db);

    setRooms(db.chatRooms.filter(r => r.type !== 'direct'));
    setSelectedRoom(null);
  };

  const handleSaveRename = () => {
    if (!selectedRoom || !editName.trim()) return;
    const db = getDb();
    const idx = db.chatRooms.findIndex(r => r.id === selectedRoom.id);
    if (idx !== -1) {
      db.chatRooms[idx].name = editName;
      addAuditLog('system', 'Rename Chat Channel', 'chat_rooms', selectedRoom.id, `Renamed channel from "${selectedRoom.name}" to "${editName}"`);
      saveDb(db);
      setRooms(db.chatRooms.filter(r => r.type !== 'direct'));
      setSelectedRoom({ ...db.chatRooms[idx] });
      setIsEditing(false);
    }
  };

  const handleAddMember = () => {
    if (!selectedRoom || !selectedMemberToAdd) return;
    const db = getDb();
    const idx = db.chatRooms.findIndex(r => r.id === selectedRoom.id);
    if (idx !== -1) {
      const room = db.chatRooms[idx];
      if (!room.memberIds.includes(selectedMemberToAdd)) {
        room.memberIds.push(selectedMemberToAdd);
        addAuditLog('system', 'Add Channel Member', 'chat_rooms', selectedRoom.id, `Added member ID: ${selectedMemberToAdd} to room: ${room.name}`);
        saveDb(db);
        setRooms(db.chatRooms.filter(r => r.type !== 'direct'));
        setSelectedRoom({ ...room });
        setSelectedMemberToAdd('');
      }
    }
  };

  const handleRemoveMember = (profileId: string) => {
    if (!selectedRoom) return;
    const db = getDb();
    const idx = db.chatRooms.findIndex(r => r.id === selectedRoom.id);
    if (idx !== -1) {
      const room = db.chatRooms[idx];
      room.memberIds = room.memberIds.filter(id => id !== profileId);
      addAuditLog('system', 'Remove Channel Member', 'chat_rooms', selectedRoom.id, `Removed member ID: ${profileId} from room: ${room.name}`);
      saveDb(db);
      setRooms(db.chatRooms.filter(r => r.type !== 'direct'));
      setSelectedRoom({ ...room });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Advanced Group & Channel Management</h2>
        <p className="text-xs text-slate-400 mt-1">Configure project chat rooms, departments channels, and corporate announcements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create Group Form */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-2xl shadow-sm h-fit space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" />
            Provision Channel / Group
          </h3>
          <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Group / Channel Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sprint Alpha Sync"
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Channel Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full bg-slate-900 border border-border rounded-lg py-2 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="project">Project Chat</option>
                <option value="department">Department Chat</option>
                <option value="team">Team Chat</option>
                <option value="announcement">Announcement Circular Channel</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-all cursor-pointer"
            >
              Provision Channel
            </button>
          </form>

          {/* Selection List */}
          <div className="pt-4 border-t border-border/60">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Channels</h4>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {rooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoom(r);
                    setEditName(r.name || '');
                  }}
                  className={`w-full text-left text-xs p-2 rounded transition-all truncate flex items-center justify-between ${
                    selectedRoom?.id === r.id ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-foreground'
                  }`}
                >
                  <span>{r.name}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-950/40 px-1 rounded">{r.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Group Controls Panel */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]">
          {selectedRoom ? (
            <div className="space-y-6 text-xs">
              <div className="flex justify-between items-start border-b border-border/80 pb-4">
                <div>
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-900 border border-border rounded px-2 py-1 outline-none text-white font-bold"
                      />
                      <button onClick={handleSaveRename} className="p-1.5 bg-violet-600 text-white rounded hover:bg-violet-500 cursor-pointer">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setIsEditing(false)} className="p-1.5 bg-slate-800 text-slate-350 rounded border border-border cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{selectedRoom.name}</h3>
                      <button onClick={() => setIsEditing(true)} className="p-1 text-slate-500 hover:text-white transition-all cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Classification: {selectedRoom.type}</p>
                </div>

                <button
                  onClick={() => handleDeleteGroup(selectedRoom.id)}
                  className="bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Purge Group
                </button>
              </div>

              {/* Members Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-500" /> Member Registry ({selectedRoom.memberIds?.length || 0})
                  </h4>
                  
                  {/* Add Member form */}
                  <div className="flex gap-2">
                    <select
                      value={selectedMemberToAdd}
                      onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                      className="bg-slate-900 border border-border rounded-lg px-2 py-1 outline-none text-slate-400"
                    >
                      <option value="">-- Add Employee --</option>
                      {profiles.filter(p => !selectedRoom.memberIds?.includes(p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddMember}
                      disabled={!selectedMemberToAdd}
                      className="bg-violet-650 hover:bg-violet-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] disabled:opacity-40 transition-all cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Member items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {(selectedRoom.memberIds || []).map(mId => {
                    const member = profiles.find(p => p.id === mId);
                    if (!member) return null;
                    return (
                      <div key={mId} className="flex items-center justify-between p-2.5 border border-border bg-slate-900/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <img src={member.avatarUrl} className="w-6.5 h-6.5 rounded-full object-cover" />
                          <div>
                            <p className="font-semibold text-foreground text-xs leading-none">{member.name}</p>
                            <p className="text-[9px] text-slate-500 mt-1 leading-none">{member.designation}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(mId)}
                          className="text-red-400 hover:bg-red-500/10 p-1 rounded transition-all cursor-pointer"
                          title="Remove Member"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {(!selectedRoom.memberIds || selectedRoom.memberIds.length === 0) && (
                    <p className="text-slate-500 col-span-2 text-center py-4 italic">No members assigned to this group channel.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select or provision a group/channel on the left panel to configure settings.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
