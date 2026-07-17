'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../dashboard/DashboardContext';
import { getDb, saveDb, addActivityLog, DocumentFile } from '@/lib/database/mockDb';
import {
  BookOpen,
  Search,
  Book,
  Clock,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Settings,
  Edit,
  ArrowRight,
  Info
} from 'lucide-react';

export default function KnowledgeSOP() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [db, setDb] = useState(getDb());
  
  // Active document selection
  const [selectedDocId, setSelectedDocId] = useState<string>('sop-hr-policy');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Categories mapping
  const categories = ['HR Policy', 'IT SOP', 'Design Guideline', 'Security'] as const;

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  if (!user) return null;

  // Filter SOP files (isKbSop === true)
  const sopDocs = db.documents.filter(d => d.isKbSop);

  // Search SOPs
  const searchedSops = sopDocs.filter(d => {
    const q = searchQuery.toLowerCase();
    const titleMatch = d.name.toLowerCase().includes(q);
    const contentMatch = d.content ? d.content.toLowerCase().includes(q) : false;
    return titleMatch || contentMatch;
  });

  const selectedDoc = db.documents.find(d => d.id === selectedDocId) || sopDocs[0];

  // Render basic markdown tags manually into nice Tailwind HTML components
  const renderMockMarkdown = (markdownText?: string) => {
    if (!markdownText) return <p className="text-slate-500 italic">No content available.</p>;

    const lines = markdownText.split('\n');
    return (
      <div className="space-y-4 leading-relaxed text-slate-300">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-2xl font-extrabold text-white pt-4 pb-2 border-b border-slate-800">
                {line.replace('# ', '')}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-white pt-3 pb-1">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm font-bold text-slate-200 pt-2">
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1 text-xs">
                <li>{line.replace(/^[-*]\s+/, '')}</li>
              </ul>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx} className="text-xs text-slate-350">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* OPERATIONS HEADER CARD */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md text-left">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5.5 h-5.5 text-violet-400" /> Company SOP & Knowledge Base
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review standard operating procedures (SOP), compliance rules, security guides, and FAQs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Category & Documents selection Sidebar - 4 cols */}
        <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-4 backdrop-blur-md space-y-4">
          
          {/* SOP Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search wiki articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1 pl-8 pr-2.5 text-xs outline-none text-slate-200 focus:border-violet-500"
            />
          </div>

          <div className="space-y-4">
            {categories.map(cat => {
              const catDocs = searchedSops.filter(d => d.kbCategory === cat);
              if (catDocs.length === 0) return null;
              
              return (
                <div key={cat} className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">{cat}</h3>
                  <div className="space-y-0.5">
                    {catDocs.map(doc => {
                      const isSelected = selectedDoc?.id === doc.id;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-violet-600 text-white'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-250'
                          }`}
                        >
                          <span className="text-xs truncate font-semibold">{doc.name.replace('.md', '')}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQs section heading shortcut links */}
          <div className="border-t border-slate-800/60 pt-4">
            <h3 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-violet-400" /> Quick FAQs
            </h3>
            
            <div className="space-y-1 p-2 rounded-xl bg-slate-950/20 border border-slate-850 text-[10px] text-slate-450 leading-relaxed">
              <p className="font-semibold text-slate-350">Q: How do I change check-in time?</p>
              <p className="italic mb-2">Check-in times are logged automatically when clicking Clock In in the header.</p>

              <p className="font-semibold text-slate-350">Q: Can I edit project milestones?</p>
              <p className="italic">Only Super Admins, Department heads, or assigned Project managers have milestones write access.</p>
            </div>
          </div>

        </div>

        {/* Right Article Viewer Content - 8 cols */}
        <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800 rounded-2xl p-8 backdrop-blur-md min-h-[500px] flex flex-col justify-between">
          
          {selectedDoc ? (
            <div className="space-y-6">
              
              {/* Document Header parameters info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div className="space-y-1 text-left">
                  <span className="bg-violet-500/10 text-violet-400 border border-violet-500/25 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {selectedDoc.kbCategory}
                  </span>
                  <h2 className="text-xl font-bold text-white pt-1">{selectedDoc.name.replace('.md', '')}</h2>
                  
                  <div className="flex items-center gap-2.5 text-[10px] text-slate-500 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Version v{selectedDoc.version}</span>
                    <span>•</span>
                    <span>Last audited: {new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Edit document mockup for Super Admin or HR */}
                {(user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Department Head') && (
                  <button
                    onClick={() => alert('SOP editing and draft revisions modal placeholder. (Supabase SQL edit mutation)')}
                    className="flex items-center gap-1.5 bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5 text-violet-400" /> Draft Revision
                  </button>
                )}
              </div>

              {/* Render article document */}
              <div className="text-left">
                {renderMockMarkdown(selectedDoc.content)}
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-slate-550 text-xs">
              Select an SOP document from the sidebar to review policy guidelines.
            </div>
          )}

          {/* Compliance auditing bottom notification */}
          <div className="mt-8 pt-4 border-t border-slate-800/40 text-[9px] text-slate-550 text-left flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
            <span>Compliance Notice: All employees are contractually obligated to review, understand, and adhere to published SOP policies. Document access is logged in system audit tables.</span>
          </div>

        </div>

      </div>

    </div>
  );
}
