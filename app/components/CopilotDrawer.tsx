'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2, ClipboardList, BookOpen, Users, BarChart3, HelpCircle } from 'lucide-react';
import { getDb, getCurrentUser, Profile, Task, DocumentFile } from '@/lib/database/mockDb';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
}

export default function CopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [isOpen]);

  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const userProfile = getCurrentUser();
      const firstName = userProfile ? userProfile.name.split(' ')[0] : 'Employee';
      setMessages([
        {
          id: 'welcome',
          sender: 'copilot',
          text: `Hi ${firstName}! 👋 I am your SyncOS Copilot. I have full access to your workspace tasks, company SOPs, online colleagues, and project statistics. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const processResponse = (query: string): string => {
    const db = getDb();
    const cleanQuery = query.toLowerCase().trim();
    const userProfile = getCurrentUser() || currentUser;

    if (!userProfile) {
      return "Please log in to query the workspace context.";
    }

    // 1. GREETINGS
    if (cleanQuery.match(/\b(hi|hello|hey|greetings|welcome)\b/)) {
      const firstName = userProfile.name.split(' ')[0];
      return `Hello ${firstName}! How can I assist you with your tasks or workspace info today?`;
    }

    // 2. TASKS / TODOs
    if (cleanQuery.includes('task') || cleanQuery.includes('todo') || cleanQuery.includes('assigned') || cleanQuery.includes('deadline')) {
      const myTasks = db.tasks.filter(t => !t.isDeleted && t.assigneeIds.includes(userProfile.id));
      
      if (myTasks.length === 0) {
        if (['Super Admin', 'HR Admin'].includes(userProfile.role)) {
          const allActive = db.tasks.filter(t => !t.isDeleted && t.status !== 'Completed');
          return `You don't have any personal tasks assigned, but as an administrator, I see **${allActive.length} active tasks** in the workspace. E.g.,:\n` + 
            allActive.slice(0, 3).map(t => `• **${t.name}** (Priority: ${t.priority}, Status: ${t.status})`).join('\n');
        }
        return "You have no active tasks assigned to you right now. Great job keeping your board clear! 🎉";
      }

      let response = `Here are your active assigned tasks:\n`;
      myTasks.forEach((t, i) => {
        response += `${i + 1}. **${t.name}**\n   • Priority: ${t.priority} | Status: ${t.status}\n   • Deadline: ${t.deadline || 'No deadline'}\n`;
      });
      return response;
    }

    // 3. HR POLICY / LEAVES / VPNS (SOPs)
    if (cleanQuery.includes('leave') || cleanQuery.includes('policy') || cleanQuery.includes('ethics') || cleanQuery.includes('vpn') || cleanQuery.includes('sop') || cleanQuery.includes('document')) {
      const sopDocs = db.documents.filter(d => !d.isFolder && d.isKbSop);
      
      let matchedDoc: DocumentFile | undefined;
      if (cleanQuery.includes('leave') || cleanQuery.includes('policy') || cleanQuery.includes('ethics') || cleanQuery.includes('hr')) {
        matchedDoc = sopDocs.find(d => d.id === 'sop-hr-policy');
      } else if (cleanQuery.includes('vpn') || cleanQuery.includes('network') || cleanQuery.includes('security') || cleanQuery.includes('it')) {
        matchedDoc = sopDocs.find(d => d.id === 'sop-it-vpn');
      }

      if (matchedDoc && matchedDoc.content) {
        return `Here is a summary of the **${matchedDoc.name}**:\n\n${matchedDoc.content}\n\n*You can view the full file in the Corporate Drive.*`;
      }

      return `I found **${sopDocs.length} company policy documents** in the knowledge base. E.g.:\n` + 
        sopDocs.map(d => `• **${d.name}** (${d.kbCategory || 'General SOP'})`).join('\n') + 
        `\n\nAsk me specifically about *"leave policy"* or *"vpn setup"* to view details!`;
    }

    // 4. ONLINE COLLEAGUES
    if (cleanQuery.includes('online') || cleanQuery.includes('active') || cleanQuery.includes('who is on') || cleanQuery.includes('colleague') || cleanQuery.includes('employee')) {
      const onlineUsers = db.profiles.filter(p => p.onlineStatus === 'online' && p.id !== userProfile.id);
      
      if (onlineUsers.length === 0) {
        return "It looks like no other team members are currently online in the workspace.";
      }

      let response = `There are **${onlineUsers.length} colleagues online** right now:\n`;
      onlineUsers.forEach(u => {
        response += `• **${u.name}** (${u.designation} - ${u.role})\n`;
      });
      return response;
    }

    // 5. WORKSPACE STATS
    if (cleanQuery.includes('stats') || cleanQuery.includes('statistics') || cleanQuery.includes('overview') || cleanQuery.includes('count') || cleanQuery.includes('total')) {
      const totalEmployees = db.profiles.length;
      const activeTasks = db.tasks.filter(t => !t.isDeleted && t.status !== 'Completed').length;
      const totalProjects = db.projects.length;
      const onlineCount = db.profiles.filter(p => p.onlineStatus === 'online').length;

      return `📊 **SyncOS Workspace Overview Statistics:**\n` +
        `• **Active Users Online**: ${onlineCount} online (out of ${totalEmployees} total employee profiles)\n` +
        `• **Corporate Projects**: ${totalProjects} active projects\n` +
        `• **Active Tasks Pending**: ${activeTasks} tasks currently in progress\n` +
        `• **Departments**: ${db.departments.length} active corporate units`;
    }

    // 6. DRAFTING MESSAGES
    if (cleanQuery.includes('write') || cleanQuery.includes('draft') || cleanQuery.includes('compose') || cleanQuery.includes('template')) {
      return `Here is a professional template you can copy and use:\n\n` +
        `*"Hi Team,\n\nI hope you're doing well. Just wanted to share a quick update regarding our ongoing projects. Let's make sure all task check-ins, documents, and chat follow-ups occur inside this platform to keep our records synchronized.\n\nBest regards,\n${userProfile.name}"*`;
    }

    // 7. FALLBACK / LIST OF OPTIONS
    return `I'm not sure how to process that request. Since I run locally in your browser, here are the topics I can query for you:\n\n` +
      `• 📋 *"What are my active tasks?"* (Assigned check-list items)\n` +
      `• 📖 *"Show company leave policy"* (Summarizes HR guidelines)\n` +
      `• 🛠 *"VPN network setup"* (IT connection prerequisites)\n` +
      `• 🟢 *"Who is currently online?"* (Active workspace colleagues)\n` +
      `• 📊 *"Show workspace stats"* (Overview of projects and employees)\n` +
      `• 📝 *"Draft update message"* (Draft communication template)`;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const copilotResponse: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: processResponse(userMessage.text),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, copilotResponse]);
      setIsThinking(false);
    }, 800 + Math.random() * 400); // Simulated delay for premium feel
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <>
      {/* Floating Sparkles Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full shadow-lg hover:shadow-violet-600/30 transition-all duration-300 active:scale-95 group border border-violet-400/20 cursor-pointer"
        aria-label="Ask SyncOS Copilot"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-violet-500 border border-white/20"></span>
        </span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Chat Container */}
          <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">SyncOS Copilot</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Local Workspace Context</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                      msg.sender === 'user'
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-violet-600/10 border-violet-500/20'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <User className="w-3.5 h-3.5 text-slate-350" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-violet-400" />
                    )}
                  </div>

                  {/* Text Bubble */}
                  <div className="space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-violet-600 text-white rounded-tr-none'
                          : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <p className={`text-[8px] text-slate-500 font-medium ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="w-7 h-7 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Scanning database...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="p-3 border-t border-white/5 bg-slate-950/40 space-y-2 shrink-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Quick Queries</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { text: '📋 My Tasks', query: 'What are my active tasks?' },
                  { text: '📖 HR SOP Policy', query: 'Show company leave policy' },
                  { text: '🟢 Who is online?', query: 'Who is currently online?' },
                  { text: '📊 Workspace Stats', query: 'Show workspace stats' }
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.query)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-[10px] text-slate-300 font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-white/10 bg-slate-950 flex gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Copilot about tasks, policies..."
                className="flex-1 bg-slate-900 border border-white/10 hover:border-violet-500/40 focus:border-violet-500 text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
