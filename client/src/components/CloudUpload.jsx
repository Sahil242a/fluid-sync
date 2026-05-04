import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Upload, X, Check, Copy,
  FileText, Trash2, AlertCircle,
  Loader2, Link2, ExternalLink, Plus
} from 'lucide-react';
import { useCloudUpload } from '../hooks/useCloudUpload';

// ─── Blocked Extensions ────────────────────────────────────
const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'msi', 'sh', 'bash',
  'ps1', 'vbs', 'jar', 'com', 'scr', 'dll',
  'reg', 'pif', 'cpl', 'inf'
];

const isBlockedFile = (file) => {
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
  return BLOCKED_EXTENSIONS.includes(ext);
};

// ─── Helpers ───────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getFileColor = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'text-purple-400 bg-purple-500/20';
  if (['mp4','mkv','avi','mov','webm'].includes(ext))        return 'text-rose-400 bg-rose-500/20';
  if (['mp3','wav','flac','aac'].includes(ext))              return 'text-amber-400 bg-amber-500/20';
  if (['zip','rar','7z','tar'].includes(ext))                return 'text-orange-400 bg-orange-500/20';
  return 'text-sky-400 bg-sky-500/20';
};

const CloudUpload = ({ user }) => {
  const {
    uploadProgress,
    uploadStatus,
    uploadError,
    shareLink,
    fileInfo,
    currentFileName,
    currentFileIdx,
    totalFiles,
    uploadFiles,
    cancelUpload,
    reset,
    MAX_CLOUD_FILE_SIZE,
  } = useCloudUpload();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging,    setIsDragging]    = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [blockError,    setBlockError]    = useState("");

  // ── Add Files ──────────────────────────────────────────
  const addFiles = useCallback((incoming) => {
    setBlockError("");
    const valid   = [];
    const blocked = [];

    for (const file of incoming) {
      // ✅ Check blocked extensions first
      if (isBlockedFile(file)) {
        blocked.push(file.name);
        continue;
      }

      if (file.size > MAX_CLOUD_FILE_SIZE) {
        alert(`"${file.name}" exceeds the 500MB limit`);
        continue;
      }

      const isDupe = selectedFiles.some(
        f => f.name === file.name && f.size === file.size
      );
      if (!isDupe) valid.push(file);
    }

    // ✅ Show blocked files error inline
    if (blocked.length > 0) {
      setBlockError(
        `Not allowed: ${blocked.join(', ')} — executable file types are blocked`
      );
    }

    if (valid.length > 0) {
      setSelectedFiles(prev => [...prev, ...valid]);
    }
  }, [selectedFiles, MAX_CLOUD_FILE_SIZE]);

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Drag Handlers ──────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // ── Upload ─────────────────────────────────────────────
  const handleUpload = () => {
    if (selectedFiles.length > 0 && user) {
      uploadFiles(selectedFiles, user);
    }
  };

  // ── Copy Link ──────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    reset();
    setSelectedFiles([]);
    setBlockError("");
  };

  // ── Total size ─────────────────────────────────────────
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  // ── Complete State ─────────────────────────────────────
  if (uploadStatus === 'complete' && fileInfo) {
    return (
      <div className="w-full h-full bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-xl p-8 flex flex-col items-center justify-center gap-6 overflow-y-auto">
        <div className="p-6 bg-emerald-500/20 rounded-full">
          <Check size={48} className="text-emerald-400" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-black uppercase italic text-white mb-1">
            Upload Complete!
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            {fileInfo.count} file{fileInfo.count > 1 ? 's' : ''} •{' '}
            {formatSize(fileInfo.totalSize)}
          </p>
        </div>

        {/* Uploaded Files List */}
        <div className="w-full max-w-md space-y-2 max-h-[160px] overflow-y-auto">
          {fileInfo.files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
              <div className={`p-1.5 rounded-lg text-xs ${getFileColor(f.name)}`}>
                <FileText size={14} />
              </div>
              <span className="text-xs text-slate-300 truncate flex-1">{f.name}</span>
              <span className="text-[10px] text-slate-600 shrink-0">{formatSize(f.size)}</span>
            </div>
          ))}
        </div>

        {/* Share Link */}
        <div className="w-full max-w-md bg-black/30 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={14} className="text-sky-400" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              Share Link ({fileInfo.count} file{fileInfo.count > 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 bg-black/50 border border-white/5 px-4 py-3 rounded-xl text-sky-400 font-mono text-xs truncate"
            />
            <button
              onClick={handleCopy}
              className={`p-3 rounded-xl transition-all shrink-0 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Link expires on {fileInfo.expires}
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Upload More
          </button>
          <a
            href={shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-sky-500 rounded-xl font-black text-[10px] uppercase tracking-widest text-black hover:bg-sky-400 transition-all"
          >
            <ExternalLink size={14} /> Test Link
          </a>
        </div>
      </div>
    );
  }

  // ── Uploading State ────────────────────────────────────
  if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
    return (
      <div className="w-full h-full bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-xl p-8 flex flex-col items-center justify-center gap-6">

        {/* Current File */}
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl w-full max-w-sm">
          <div className={`p-3 rounded-xl shrink-0 ${getFileColor(currentFileName)}`}>
            <FileText size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{currentFileName}</p>
            <p className="text-[10px] text-slate-600 uppercase">
              File {currentFileIdx} of {totalFiles}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
            <span className="text-slate-500">
              {uploadStatus === 'processing' ? 'Generating link...' : 'Uploading...'}
            </span>
            <span className="text-purple-400">{uploadProgress}%</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-sky-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Overall progress dots */}
          {totalFiles > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              {Array.from({ length: totalFiles }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i < currentFileIdx - 1
                      ? 'bg-emerald-500 w-6'
                      : i === currentFileIdx - 1
                      ? 'bg-purple-500 w-8'
                      : 'bg-white/10 w-6'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {uploadStatus === 'uploading' && (
          <button
            onClick={cancelUpload}
            className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/20 transition-all"
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────
  if (uploadStatus === 'error') {
    return (
      <div className="w-full h-full bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-xl p-8 flex flex-col items-center justify-center gap-6">
        <div className="p-6 bg-rose-500/20 rounded-full">
          <AlertCircle size={48} className="text-rose-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black uppercase italic text-white mb-2">
            Upload Failed
          </h3>
          <p className="text-sm text-rose-400 max-w-xs">{uploadError}</p>
        </div>
        <button
          onClick={handleReset}
          className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Idle State ─────────────────────────────────────────
  return (
    <div className="w-full h-full bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-xl flex flex-col overflow-hidden">

      {/* Drop Zone */}
      <div
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('cloud-file-input')?.click()}
        className={`
          flex-1 m-4 border-2 border-dashed rounded-[32px] p-6
          flex flex-col items-center justify-center gap-3
          transition-all cursor-pointer min-h-0
          ${isDragging
            ? 'border-purple-400 bg-purple-500/20 scale-[1.01]'
            : 'border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5'
          }
        `}
      >
        <input
          id="cloud-file-input"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files))}
        />

        <div className={`p-4 rounded-2xl transition-all ${isDragging ? 'bg-purple-500/30' : 'bg-purple-500/10'}`}>
          <Cloud size={32} className="text-purple-400" />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-300">
            {isDragging ? 'Drop files to upload' : 'Drop files or click to browse'}
          </p>
          <p className="text-[10px] text-slate-600 mt-1 uppercase font-black tracking-tighter">
            Multiple files • Max 500MB each • Link valid 7 days
          </p>
        </div>
      </div>

      {/* ✅ Inline Block Error Banner */}
      <AnimatePresence>
        {blockError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mb-2 flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
          >
            <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-rose-400 font-bold leading-relaxed">
              {blockError}
            </p>
            <button
              onClick={() => setBlockError("")}
              className="ml-auto text-rose-500/50 hover:text-rose-400 transition-colors shrink-0"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Queue */}
      {selectedFiles.length > 0 && (
        <div className="px-4 pb-2 shrink-0">

          {/* Queue Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Queue
              </span>
              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-black text-purple-400">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-slate-500">
                {formatSize(totalSize)}
              </span>
            </div>

            {/* Add More + Clear All */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => document.getElementById('cloud-file-input')?.click()}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-black text-slate-500 hover:text-purple-400 uppercase tracking-widest transition-colors"
              >
                <Plus size={10} /> Add
              </button>
              <button
                onClick={() => { setSelectedFiles([]); setBlockError(""); }}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-black text-slate-600 hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                <Trash2 size={10} /> Clear
              </button>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {selectedFiles.map((file, idx) => (
                <motion.div
                  key={`${file.name}-${file.size}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${getFileColor(file.name)}`}>
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-white truncate max-w-[160px]">
                        {file.name}
                      </p>
                      <p className="text-[9px] text-slate-600 uppercase">
                        {formatSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="p-4 pt-2 shrink-0">
        {selectedFiles.length > 0 ? (
          <button
            onClick={handleUpload}
            disabled={!user}
            className={`
              w-full py-4 rounded-2xl font-black text-sm uppercase italic
              flex items-center justify-center gap-3 transition-all
              ${user
                ? 'bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            <Upload size={18} />
            {user
              ? `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''} to Cloud`
              : 'Sign in to Upload'
            }
          </button>
        ) : (
          <button
            onClick={() => document.getElementById('cloud-file-input')?.click()}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase italic bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
          >
            <Plus size={18} /> Select Files
          </button>
        )}
      </div>
    </div>
  );
};

export default CloudUpload;