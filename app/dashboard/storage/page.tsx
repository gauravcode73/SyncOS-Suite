'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../DashboardContext';
import {
  getDb,
  saveDb,
  addActivityLog,
  DocumentFile
} from '@/lib/database/mockDb';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
  Archive as ZipIcon,
  ChevronRight,
  Upload,
  FolderPlus,
  ArrowLeft,
  X,
  Share2,
  Trash2,
  Clock,
  ExternalLink,
  Plus
} from 'lucide-react';

export default function CloudStorage() {
  const { user, dbVersion, refreshDbState } = useDashboard();
  const [db, setDb] = useState(getDb());
  
  // Storage navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Selected file modal details
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Creating Folder state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Uploading File simulation state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState('pdf');
  const [uploadFileSize, setUploadFileSize] = useState('1.5 MB');

  // Sharing file parameters
  const [shareEmployeeId, setShareEmployeeId] = useState('');

  useEffect(() => {
    setDb(getDb());
  }, [dbVersion]);

  if (!user) return null;

  // Filter files inside current folder
  // Exclude isKbSop (SOP manual wikis have their own Notion subview)
  const currentFiles = db.documents.filter(d => d.folderId === currentFolderId && !d.isKbSop);

  const selectedFile = db.documents.find(d => d.id === selectedFileId) || null;

  // Render breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = db.documents.find(d => d.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.folderId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Create Folder Action
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const currentDb = getDb();
    const newFolder: DocumentFile = {
      id: `fld-${Date.now()}`,
      name: newFolderName,
      filePath: null,
      folderId: currentFolderId,
      isFolder: true,
      size: '--',
      ownerId: user.id,
      isKbSop: false,
      version: 1,
      sharedWithIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    currentDb.documents.push(newFolder);
    saveDb(currentDb);
    
    setNewFolderName('');
    setFolderModalOpen(false);
    refreshDbState();
    addActivityLog(user.id, 'Create Directory', `Created drive folder: "${newFolderName}"`);
  };

  // Upload File Simulation Action
  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;

    setIsUploading(true);
    setTimeout(() => {
      const currentDb = getDb();
      
      const fileMimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        png: 'image/png',
        zip: 'application/zip'
      };

      const newFile: DocumentFile = {
        id: `doc-${Date.now()}`,
        name: `${uploadFileName}.${uploadFileType}`,
        filePath: `/storage/user-${user.id}/${uploadFileName}.${uploadFileType}`,
        folderId: currentFolderId,
        isFolder: false,
        size: uploadFileSize || '850 KB',
        mimeType: fileMimeTypes[uploadFileType] || 'application/octet-stream',
        ownerId: user.id,
        isKbSop: false,
        version: 1,
        history: [{ version: 1, updatedAt: new Date().toISOString(), updatedBy: user.name, description: 'Initial file upload creation.' }],
        sharedWithIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      currentDb.documents.push(newFile);
      saveDb(currentDb);
      
      setUploadFileName('');
      setIsUploading(false);
      refreshDbState();
      addActivityLog(user.id, 'Upload Document', `Uploaded drive file: "${newFile.name}"`);
    }, 1200);
  };

  // Share File Action
  const handleShareFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmployeeId || !selectedFile) return;

    const currentDb = getDb();
    const idx = currentDb.documents.findIndex(d => d.id === selectedFile.id);
    if (idx !== -1) {
      const doc = currentDb.documents[idx];
      if (!doc.sharedWithIds.includes(shareEmployeeId)) {
        doc.sharedWithIds.push(shareEmployeeId);
      }
      
      // Notify employee
      currentDb.notifications.unshift({
        id: `notif-${Date.now()}`,
        profileId: shareEmployeeId,
        title: 'New Shared Document',
        body: `${user.name} shared a file with you: "${doc.name}"`,
        type: 'leave', // General notification type is fine
        isRead: false,
        referenceId: doc.id,
        createdAt: new Date().toISOString()
      });

      saveDb(currentDb);
      setShareEmployeeId('');
      refreshDbState();
      addActivityLog(user.id, 'Share Document', `Shared document "${doc.name}" with colleague.`);
    }
  };

  // Delete File/Folder Action
  const handleDeleteDocument = (docId: string) => {
    const currentDb = getDb();
    currentDb.documents = currentDb.documents.filter(d => d.id !== docId);
    saveDb(currentDb);
    setSelectedFileId(null);
    refreshDbState();
    addActivityLog(user.id, 'Delete Document', `Deleted document ID: ${docId} from drive.`);
  };

  // Mime Icon Resolver Helper
  const getFileIcon = (mime?: string) => {
    if (!mime) return FileText;
    if (mime.includes('spreadsheet') || mime.includes('sheet') || mime.includes('excel')) return FileSpreadsheet;
    if (mime.includes('pdf')) return FileText;
    if (mime.includes('image')) return ImageIcon;
    if (mime.includes('video') || mime.includes('mp4')) return Film;
    if (mime.includes('zip') || mime.includes('compressed')) return ZipIcon;
    return FileText;
  };

  const getFileColor = (mime?: string) => {
    if (!mime) return 'text-slate-400';
    if (mime.includes('spreadsheet') || mime.includes('sheet')) return 'text-emerald-500';
    if (mime.includes('pdf')) return 'text-red-500';
    if (mime.includes('image')) return 'text-sky-500';
    if (mime.includes('zip')) return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER OPERATIONS CARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Folder className="w-5.5 h-5.5 text-sky-400" /> Secure Cloud Drive
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Store files, organize directories, preview documents, and audit file versions.
          </p>
        </div>

        {/* Directory action wizards */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFolderModalOpen(true)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition-all"
          >
            <FolderPlus className="w-4 h-4 text-sky-400" /> New Folder
          </button>
        </div>
      </div>

      {/* DRIVE NAVIGATION BREADCRUMBS PATHWAY */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold px-4 py-3 bg-slate-900/10 border border-slate-850 rounded-xl">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={`hover:text-white transition-colors ${currentFolderId === null ? 'text-white' : 'text-slate-500'}`}
        >
          My Cloud Drive
        </button>

        {breadcrumbs.map(crumb => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-3 h-3 text-slate-650" />
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className={`hover:text-white transition-colors ${currentFolderId === crumb.id ? 'text-white' : 'text-slate-500'}`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}

        {currentFolderId && (
          <button
            onClick={() => {
              const parentFolder = db.documents.find(d => d.id === currentFolderId);
              setCurrentFolderId(parentFolder ? parentFolder.folderId : null);
            }}
            className="ml-auto flex items-center gap-1 text-[10px] text-slate-500 hover:text-white font-bold bg-slate-950/40 border border-slate-800 px-2 py-0.5 rounded transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back Up
          </button>
        )}
      </div>

      {/* CORE UPLOAD ZONE SIMULATOR AND DIRECTORY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Drive contents - 8 cols */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* Direct Folders List */}
            {currentFiles.filter(f => f.isFolder).map(fld => (
              <div
                key={fld.id}
                onClick={() => setCurrentFolderId(fld.id)}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold shrink-0">
                  <Folder className="w-5.5 h-5.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{fld.name}</p>
                  <p className="text-[10px] text-slate-500">Directory Folder</p>
                </div>
              </div>
            ))}

            {/* Direct Files List */}
            {currentFiles.filter(f => !f.isFolder).map(file => {
              const FileIcon = getFileIcon(file.mimeType);
              const colorStyle = getFileColor(file.mimeType);
              
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-750 hover:bg-slate-900/50 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-3 text-left"
                >
                  <div className={`w-10 h-10 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center font-bold shrink-0 ${colorStyle}`}>
                    <FileIcon className="w-5.5 h-5.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-250 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{file.size} • Version {file.version}</p>
                  </div>
                </div>
              );
            })}

          </div>

          {currentFiles.length === 0 && (
            <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-850 rounded-xl text-slate-550 text-xs">
              📂 Empty Folder. organization files upload zone is active.
            </div>
          )}

        </div>

        {/* Right Upload Panel Simulator - 4 cols */}
        <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-400 animate-bounce" /> Upload Simulator
          </h2>
          
          <form onSubmit={handleUploadFile} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-455 mb-1.5">File Name (No suffix)</label>
              <input
                type="text"
                required
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                placeholder="Product_Release_Notes"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-white outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-455 mb-1.5">Format Extension</label>
                <select
                  value={uploadFileType}
                  onChange={(e) => setUploadFileType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 outline-none focus:border-violet-500 text-slate-350"
                >
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="docx">Word (.docx)</option>
                  <option value="png">Image (.png)</option>
                  <option value="zip">ZIP (.zip)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-455 mb-1.5">Simulation Size</label>
                <input
                  type="text"
                  value={uploadFileSize}
                  onChange={(e) => setUploadFileSize(e.target.value)}
                  placeholder="2.4 MB"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 outline-none focus:border-violet-500 text-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading || !uploadFileName.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isUploading ? 'Uploading to Supabase...' : 'Simulate File Upload'}
            </button>

          </form>
        </div>

      </div>

      {/* ==================================================== */}
      {/* 📁 MODALS POPUPS SECTION */}
      {/* ==================================================== */}

      {/* CREATE DIRECTORY MODAL */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in text-slate-200">
            <h2 className="text-sm font-bold text-white mb-4 pb-2 border-b border-slate-800/60">Create Directory Folder</h2>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Directory Folder Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Design Assets"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:border-violet-500 outline-none text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-655 hover:bg-sky-505 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILE PREVIEWER & HISTORY DETAILS OVERLAY */}
      {selectedFileId && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in text-slate-200">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="min-w-0 pr-4 flex items-center gap-2">
                <span className="text-xl">📄</span>
                <div>
                  <h2 className="text-xs font-bold text-white truncate leading-tight">{selectedFile.name}</h2>
                  <p className="text-[9px] text-slate-500 leading-none">Size: {selectedFile.size} • Version v{selectedFile.version}</p>
                </div>
              </div>
              <button onClick={() => setSelectedFileId(null)} className="text-slate-450 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Mock Preview & download - 7 cols */}
              <div className="md:col-span-7 space-y-4">
                
                {/* Mock Preview window */}
                <div className="h-64 rounded-xl border border-slate-850 bg-slate-950/60 flex flex-col items-center justify-center text-center p-6 relative">
                  <span className="text-4xl mb-3">📂</span>
                  <p className="text-xs font-semibold text-slate-350 truncate max-w-sm">Mock Preview of "{selectedFile.name}"</p>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Supabase Object Storage Node • Access Restricted by Role</p>
                  
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="mt-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Download File File
                  </a>
                </div>

                {/* Shared logs */}
                <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Share2 className="w-3.5 h-3.5" /> File Visibility Access
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Owner Profile: <span className="text-slate-200 font-semibold">{db.profiles.find(p => p.id === selectedFile.ownerId)?.name || 'Admin'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Shared with: {selectedFile.sharedWithIds.length === 0 ? (
                      <span className="text-slate-550">Private (Only Owner and Super Admin)</span>
                    ) : (
                      selectedFile.sharedWithIds.map(id => db.profiles.find(p => p.id === id)?.name).join(', ')
                    )}
                  </p>
                </div>

              </div>

              {/* Right Column: Version History & Sharing Forms - 5 cols */}
              <div className="md:col-span-5 space-y-5">
                
                {/* Version History logs */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-violet-400" /> Version Control History
                  </h3>
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3 max-h-[160px] overflow-y-auto pr-1 text-[10px]">
                    {selectedFile.history?.map(hist => (
                      <div key={hist.version} className="space-y-1 pb-1.5 border-b border-slate-850 last:border-0 last:pb-0">
                        <div className="flex justify-between font-bold text-slate-350">
                          <span>Version {hist.version}</span>
                          <span className="text-slate-650">{new Date(hist.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-450 leading-relaxed">{hist.description}</p>
                        <p className="text-[9px] text-slate-500 font-medium">Modifier: {hist.updatedBy}</p>
                      </div>
                    )) || (
                      <p className="text-slate-500 italic">No version history records found.</p>
                    )}
                  </div>
                </div>

                {/* Share input form */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Share File Access</h3>
                  
                  <form onSubmit={handleShareFile} className="flex gap-1.5">
                    <select
                      required
                      value={shareEmployeeId}
                      onChange={(e) => setShareEmployeeId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-350 outline-none"
                    >
                      <option value="">-- Choose Colleague --</option>
                      {db.profiles.filter(p => p.id !== user.id).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!shareEmployeeId}
                      className="bg-violet-600 hover:bg-violet-550 text-white font-bold text-[10px] px-3.5 rounded-lg disabled:opacity-40"
                    >
                      Share
                    </button>
                  </form>
                </div>

                {/* Delete button option */}
                {(selectedFile.ownerId === user.id || user.role === 'Super Admin') && (
                  <button
                    onClick={() => handleDeleteDocument(selectedFile.id)}
                    className="w-full mt-4 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Purge Document
                  </button>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
