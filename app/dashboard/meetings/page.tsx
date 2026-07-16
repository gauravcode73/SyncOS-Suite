'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../DashboardContext';
import { getDb, saveDb, addActivityLog, Profile, MeetingRoom } from '@/lib/database/mockDb';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Radio,
  Hand,
  Users,
  MessageSquare,
  Volume2,
  X,
  PhoneOff,
  UserPlus,
  Plus,
  Play,
  Settings,
  ShieldAlert,
  FolderLock,
  UserCheck,
  Check,
  Trash2
} from 'lucide-react';

export default function VideoMeetings() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [db, setDb] = useState(getDb());
  const jitsiApiRef = useRef<any>(null);
  
  // Lobby vs Meeting state
  const [activeCallRoomId, setActiveCallRoomId] = useState<string | null>(null);
  
  // Lobby creation state
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  
  // Hardware status
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasHandRaised, setHasHandRaised] = useState(false);

  // In-call right drawer state
  const [callDrawer, setCallDrawer] = useState<'chat' | 'people' | null>(null);

  // Active meeting room instance
  const [activeRoom, setActiveRoom] = useState<MeetingRoom | null>(null);
  
  // Local chat text
  const [meetingChatInput, setMeetingChatInput] = useState('');

  // Waiting Room state for mock approval
  const [waitingRoomList, setWaitingRoomList] = useState<{ id: string; name: string; avatar: string }[]>([]);

  // Local grid participant states
  const [callParticipants, setCallParticipants] = useState<{
    id: string;
    name: string;
    avatarUrl: string;
    micOn: boolean;
    camOn: boolean;
    handRaised: boolean;
    speaking: boolean;
  }[]>([]);

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  // Handle shareable URLs to join call on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user && !activeCallRoomId) {
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('room');
      if (roomId) {
        const currentDb = getDb();
        let room = currentDb.meetingRooms.find(m => m.id === roomId);
        if (!room) {
          const firstAdmin = currentDb.profiles.find(p => p.role === 'Super Admin');
          room = {
            id: roomId,
            title: 'Shared Link Call',
            hostId: firstAdmin ? firstAdmin.id : user.id,
            status: 'active',
            scheduledAt: new Date().toISOString(),
            duration: 0,
            waitingRoomIds: [],
            participantIds: [user.id],
            chat: [],
            raisedHands: []
          };
          currentDb.meetingRooms.unshift(room);
          saveDb(currentDb);
          refreshDbState();
        }

        setActiveCallRoomId(room.id);
        setActiveRoom(room);

        // Seed call members
        const otherProfiles = currentDb.profiles
          .filter(p => p.id !== user.id && p.id !== 'emp-007')
          .slice(0, 3)
          .map(p => ({
            id: p.id,
            name: p.name,
            avatarUrl: p.avatarUrl,
            micOn: Math.random() > 0.4,
            camOn: Math.random() > 0.3,
            handRaised: false,
            speaking: false
          }));

        setCallParticipants([
          {
            id: user.id,
            name: user.name + ' (You)',
            avatarUrl: user.avatarUrl,
            micOn: isMicOn,
            camOn: isCamOn,
            handRaised: false,
            speaking: false
          },
          ...otherProfiles
        ]);
        
        addActivityLog(user.id, 'Join Link Meeting', `Connected via shareable link to room ID: ${roomId}`);
      }
    }
  }, [user, dbVersion, activeCallRoomId]);

  // Load and control real Jitsi Meet WebRTC iframe
  useEffect(() => {
    if (!activeCallRoomId || !user) {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      return;
    }

    const domain = "meet.jit.si";
    const scriptUrl = `https://${domain}/external_api.js`;
    let script = document.querySelector(`script[src="${scriptUrl}"]`);

    const initJitsi = () => {
      const parentNode = document.getElementById('jitsi-container');
      if (!parentNode) return;

      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }

      const api = new (window as any).JitsiMeetExternalAPI(domain, {
        roomName: activeCallRoomId,
        parentNode: parentNode,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: !isMicOn,
          startWithVideoMuted: !isCamOn,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          disableThirdPartyRequests: true,
        },
        userInfo: {
          displayName: user.name,
          email: user.email
        }
      });

      api.addEventListener('videoConferenceLeft', () => {
        handleHangUp();
      });

      jitsiApiRef.current = api;
    };

    if (!script) {
      script = document.createElement('script');
      script.setAttribute('src', scriptUrl);
      script.addEventListener('load', initJitsi);
      document.body.appendChild(script);
    } else {
      if ((window as any).JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        script.addEventListener('load', initJitsi);
      }
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [activeCallRoomId, user]);

  if (!user) return null;

  // 1. HOST AN INSTANT MEETING
  const handleStartInstantMeeting = (title: string) => {
    const currentDb = getDb();
    const meetingTitle = title.trim() || 'Instant Sync Call';
    
    const newRoom: MeetingRoom = {
      id: `meet-${Date.now()}`,
      title: meetingTitle,
      hostId: user.id,
      status: 'active',
      scheduledAt: new Date().toISOString(),
      duration: 0,
      waitingRoomIds: [],
      participantIds: [user.id],
      chat: [],
      raisedHands: []
    };

    currentDb.meetingRooms.unshift(newRoom);
    saveDb(currentDb);
    refreshDbState();

    // Set active meeting state
    setActiveCallRoomId(newRoom.id);
    setActiveRoom(newRoom);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname + '?room=' + newRoom.id);
    }

    // Load initial call participants
    // Automatically seed a couple of colleagues joining the meeting
    const seededColleagues = currentDb.profiles
      .filter(p => p.id !== user.id && p.id !== 'emp-007') // exclude pending
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl,
        micOn: Math.random() > 0.3,
        camOn: Math.random() > 0.2,
        handRaised: false,
        speaking: false
      }));

    setCallParticipants([
      {
        id: user.id,
        name: user.name + ' (You)',
        avatarUrl: user.avatarUrl,
        micOn: isMicOn,
        camOn: isCamOn,
        handRaised: false,
        speaking: false
      },
      ...seededColleagues
    ]);

    // Simulate waiting room participant entry after 4 seconds
    setTimeout(() => {
      setWaitingRoomList([
        {
          id: 'emp-006',
          name: 'Neha Gupta',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
        }
      ]);
    }, 4000);

    // Simulate colleagues speaking updates
    const speakInterval = setInterval(() => {
      setCallParticipants(prev =>
        prev.map(p => {
          if (p.id === user.id) return p;
          return {
            ...p,
            speaking: p.micOn && Math.random() > 0.75
          };
        })
      );
    }, 2000);

    addActivityLog(user.id, 'Host Video Meeting', `Started video room: "${meetingTitle}"`);
    return () => clearInterval(speakInterval);
  };

  // 2. JOIN MEETING FROM LIST
  const handleJoinMeetingRoom = (room: MeetingRoom) => {
    const currentDb = getDb();
    // Join meeting
    setActiveCallRoomId(room.id);
    setActiveRoom(room);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname + '?room=' + room.id);
    }

    // Seed mock conference participants
    const otherProfiles = currentDb.profiles
      .filter(p => p.id !== user.id && p.id !== 'emp-007')
      .slice(0, 4)
      .map(p => ({
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl,
        micOn: Math.random() > 0.4,
        camOn: Math.random() > 0.3,
        handRaised: false,
        speaking: false
      }));

    setCallParticipants([
      {
        id: user.id,
        name: user.name + ' (You)',
        avatarUrl: user.avatarUrl,
        micOn: isMicOn,
        camOn: isCamOn,
        handRaised: false,
        speaking: false
      },
      ...otherProfiles
    ]);

    addActivityLog(user.id, 'Join Video Meeting', `Connected to meeting room: "${room.title}"`);
  };

  // 3. MUTE / HANG UP CALL
  const handleHangUp = () => {
    if (activeRoom) {
      const currentDb = getDb();
      const roomIdx = currentDb.meetingRooms.findIndex(m => m.id === activeRoom.id);
      if (roomIdx !== -1) {
        currentDb.meetingRooms[roomIdx].status = 'completed';
        currentDb.meetingRooms[roomIdx].notes = `Meeting ended. Duration: 15 minutes. Notes log recorded.`;
        saveDb(currentDb);
        refreshDbState();
      }
      addActivityLog(user.id, 'Disconnect Video Meeting', `Left call: "${activeRoom.title}"`);
    }
    setActiveCallRoomId(null);
    setActiveRoom(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
    setWaitingRoomList([]);
    setCallParticipants([]);
    setIsScreenSharing(false);
    setIsRecording(false);
    setHasHandRaised(false);
  };

  // 4. MUTE COLLEAGUE (HOST CONTROL MODERATION)
  const handleHostMuteParticipant = (pId: string) => {
    // Modify mic status in local participants
    setCallParticipants(prev =>
      prev.map(p => (p.id === pId ? { ...p, micOn: false, speaking: false } : p))
    );
  };

  // 5. REMOVE / KICK PARTICIPANT (HOST CONTROL)
  const handleHostKickParticipant = (pId: string) => {
    // Animate removal from the list
    setCallParticipants(prev => prev.filter(p => p.id !== pId));
    addActivityLog(user.id, 'Moderation Kick User', `Host kicked participant ID: ${pId} from conference.`);
  };

  // 6. WAITING ROOM ADMISSION ACTION
  const handleAdmitWaitingUser = (guestId: string, admit: boolean) => {
    if (admit) {
      const dbInstance = getDb();
      const newStaff = dbInstance.profiles.find(p => p.id === guestId);
      if (newStaff) {
        setCallParticipants(prev => [
          ...prev,
          {
            id: newStaff.id,
            name: newStaff.name,
            avatarUrl: newStaff.avatarUrl,
            micOn: true,
            camOn: true,
            handRaised: false,
            speaking: false
          }
        ]);
        addActivityLog(user.id, 'Admit Waiting Room User', `Granted entry permission for ${newStaff.name}`);
      }
    }
    setWaitingRoomList(prev => prev.filter(w => w.id !== guestId));
  };

  // 7. TOGGLE HARDWARE LOGIC
  const handleToggleMic = () => {
    setIsMicOn(!isMicOn);
    setCallParticipants(prev =>
      prev.map(p => (p.id === user.id ? { ...p, micOn: !isMicOn, speaking: !isMicOn ? p.speaking : false } : p))
    );
  };

  const handleToggleCam = () => {
    setIsCamOn(!isCamOn);
    setCallParticipants(prev =>
      prev.map(p => (p.id === user.id ? { ...p, camOn: !isCamOn } : p))
    );
  };

  const handleToggleHandRaise = () => {
    setHasHandRaised(!hasHandRaised);
    setCallParticipants(prev =>
      prev.map(p => (p.id === user.id ? { ...p, handRaised: !hasHandRaised } : p))
    );
  };

  // 8. SEND IN-MEETING TEXT MESSAGE
  const handleSendMeetingMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingChatInput.trim() || !activeRoom) return;

    const chatMsg = {
      id: `chat-${Date.now()}`,
      profileId: user.id,
      content: meetingChatInput,
      createdAt: new Date().toISOString()
    };

    setActiveRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chat: [...prev.chat, chatMsg]
      };
    });

    setMeetingChatInput('');
  };

  // Filter scheduled and active meetings from database
  const activeRoomsList = db.meetingRooms.filter(m => m.status === 'active');
  const scheduledRoomsList = db.meetingRooms.filter(m => m.status === 'scheduled');
  const pastMeetingsList = db.meetingRooms.filter(m => m.status === 'completed');

  const isUserHost = activeRoom?.hostId === user.id;

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      
      {/* ==================================================== */}
      {/* 💻 CONTEXT A: CALL LOBBY VIEWPORT */}
      {/* ==================================================== */}
      {!activeCallRoomId ? (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md text-left">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Video className="w-6 h-6 text-rose-500" /> Unified Meet Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Host instant conferences, schedule standups, or join active team discussions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Start / Schedule Box - 5 cols */}
            <div className="md:col-span-5 bg-slate-900/30 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Start a Meeting</h2>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Meeting Subject / Title</label>
                  <input
                    type="text"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="e.g. Sales Q3 Sync Up"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartInstantMeeting(newMeetingTitle)}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" /> Start Instant Call
                  </button>
                </div>
              </div>
            </div>

            {/* Active and Scheduled Rooms list - 7 cols */}
            <div className="md:col-span-7 space-y-6">
              
              {/* Active Meetings right now */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-bold text-emerald-450 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-450 animate-pulse" /> Active Discussions Now ({activeRoomsList.length})
                </h2>

                {activeRoomsList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No active conference rooms at the moment.</p>
                ) : (
                  <div className="space-y-3">
                    {activeRoomsList.map(room => {
                      const host = db.profiles.find(p => p.id === room.hostId);
                      return (
                        <div key={room.id} className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-slate-200">{room.title}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Host: {host?.name || 'Admin'} • Status: Active call</p>
                          </div>
                          <button
                            onClick={() => handleJoinMeetingRoom(room)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg text-xs shrink-0"
                          >
                            Join Call
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scheduled meetings list */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-450 uppercase tracking-wider mb-4">Upcoming Scheduled Conferences</h2>
                
                {scheduledRoomsList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No upcoming scheduled meetings.</p>
                ) : (
                  <div className="space-y-3">
                    {scheduledRoomsList.map(room => (
                      <div key={room.id} className="p-3 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-200">{room.title}</p>
                          <p className="text-[9px] text-slate-500 mt-1">Time: {new Date(room.scheduledAt).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleJoinMeetingRoom(room)}
                          className="bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded text-[10px]"
                        >
                          Join Lobby
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      ) : (
        
        // ====================================================
        // 🎥 CONTEXT B: ACTIVE VIDEO ROOM (REAL JITSI MEET CONTAINER)
        // ====================================================
        <div className="flex-1 flex flex-col overflow-hidden border border-slate-800 bg-slate-950 rounded-2xl relative h-full min-h-[500px]">
          
          {/* Real Jitsi WebRTC frame viewport */}
          <div className="flex-1 w-full h-full min-h-[450px]" id="jitsi-container" />

          {/* Overlay widget bar containing Copy Invite button */}
          <div className="absolute top-4 left-4 z-40 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 shadow-2xl">
            <span className="text-xs font-bold text-white shrink-0">Room: {activeRoom?.title}</span>
            
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && activeRoom) {
                  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${activeRoom.id}`;
                  navigator.clipboard.writeText(inviteUrl);
                  alert(`Invite Link copied to clipboard!\n${inviteUrl}\nShare this with other employees to let them join the same call.`);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-violet-650 hover:bg-violet-600 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
              title="Copy Meeting Invite Link"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Copy Invite Link</span>
            </button>

            <button
              onClick={handleHangUp}
              className="px-3 py-1.5 rounded-lg bg-red-650 hover:bg-red-500 text-white text-[10px] font-bold transition-all"
            >
              Leave Call
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
