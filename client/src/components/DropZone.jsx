// client/src/components/DropZone.jsx
import React, {
  useState, useRef, useCallback, useEffect
} from 'react';
import {
  UploadCloud, AlertCircle, FileText,
  Film, Music, Image, Archive, File, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ──────────────────────────────────────────────
const MAX_FILE_SIZE    = 2 * 1024 * 1024 * 1024;
const MAX_FILES        = 20;
const MAX_TOTAL_SIZE   = 10 * 1024 * 1024 * 1024;
const ERROR_DISPLAY_MS = 3500;
const BLOCKED_EXTENSIONS = ['.exe','.bat','.cmd','.scr','.msi','.vbs','.ps1','.sh'];

// ─── File Type Config ────────────────────────────────────────
const FILE_TYPES = [
  { exts: ['jpg','jpeg','png','gif','webp','svg','bmp','ico','avif'], icon: Image,    color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  { exts: ['mp4','mkv','avi','mov','webm','flv','wmv'],              icon: Film,     color: 'text-rose-400',    bg: 'bg-rose-500/10'   },
  { exts: ['mp3','wav','flac','aac','ogg','m4a'],                   icon: Music,    color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
  { exts: ['pdf','doc','docx','txt','md','csv','xls','xlsx'],        icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10'},
  { exts: ['zip','rar','7z','tar','gz','bz2'],                      icon: Archive,  color: 'text-orange-400',  bg: 'bg-orange-500/10' },
];

const getFileType = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  return FILE_TYPES.find(t => t.exts.includes(ext)) ?? { icon: File, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
};

const formatSize = (bytes) => {
  if (!bytes || bytes === 0)        return '0 B';
  if (bytes < 1024)                 return `${bytes} B`;
  if (bytes < 1024 * 1024)          return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)   return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
};

// ─── Animated Particles ──────────────────────────────────────
const DragParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[40px]">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
        initial={{
          x: `${20 + i * 13}%`,
          y: '100%',
          opacity: 0,
          scale: 0,
        }}
        animate={{
          y: `${10 + (i % 3) * 20}%`,
          opacity: [0, 1, 0],
          scale:   [0, 1.5, 0],
        }}
        transition={{
          duration:   1.5,
          repeat:     Infinity,
          delay:      i * 0.25,
          ease:       'easeOut',
        }}
      />
    ))}
  </div>
);

// ─── Main DropZone ───────────────────────────────────────────
const DropZone = ({ isPeerConnected, fileQueue, setFileQueue }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError,  setDragError]  = useState('');

  const inputRef    = useRef(null);
  const dragCounter = useRef(0);
  const errorTimer  = useRef(null);

  useEffect(() => () => { if (errorTimer.current) clearTimeout(errorTimer.current); }, []);

  const showError = useCallback((msg) => {
    setDragError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => { setDragError(''); errorTimer.current = null; }, ERROR_DISPLAY_MS);
  }, []);

  const containsFolder = useCallback((items) => {
    for (const item of items) {
      if (item.webkitGetAsEntry?.()?.isDirectory) return true;
    }
    return false;
  }, []);

  const validateFiles = useCallback((incoming) => {
    const errors = [], valid = [];

    if (fileQueue.length + incoming.length > MAX_FILES)
      return { valid: [], errors: [`Max ${MAX_FILES} files`] };

    const existingSize = fileQueue.reduce((s, f) => s + f.size, 0);
    if (existingSize + incoming.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_SIZE)
      return { valid: [], errors: ['Total exceeds 10GB'] };

    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE)        { errors.push(`${file.name} exceeds 2GB`); continue; }
      if (file.size === 0)                  { errors.push(`${file.name} is empty`);    continue; }
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (BLOCKED_EXTENSIONS.includes(ext)) { errors.push(`${file.name} blocked`);     continue; }
      if (fileQueue.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name} already added`); continue;
      }
      valid.push(file);
    }
    return { valid, errors };
  }, [fileQueue]);

  const addFiles = useCallback((incoming) => {
    if (!isPeerConnected || !incoming?.length) return;
    const { valid, errors } = validateFiles(incoming);
    if (errors.length) showError(errors[0]);
    if (valid.length)  setFileQueue(prev => [...prev, ...valid]);
  }, [isPeerConnected, validateFiles, setFileQueue, showError]);

  // Paste support
  useEffect(() => {
    const onPaste = (e) => {
      if (!isPeerConnected) return;
      const files = Array.from(e.clipboardData?.items || [])
        .filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean);
      if (files.length) addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isPeerConnected, addFiles]);

  const handleFileChange = (e) => { addFiles(Array.from(e.target.files)); e.target.value = ''; };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isPeerConnected) return;
    dragCounter.current += 1;
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, [isPeerConnected]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = isPeerConnected ? 'copy' : 'none';
  }, [isPeerConnected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (!isPeerConnected)                              { showError('Establish tunnel first'); return; }
    if (containsFolder(Array.from(e.dataTransfer.items))) { showError('Folders not supported — zip first'); return; }
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length)                               { showError('No files detected'); return; }
    addFiles(dropped);
  }, [isPeerConnected, addFiles, showError, containsFolder]);

  const totalSize  = fileQueue.reduce((s, f) => s + f.size, 0);
  const hasFiles   = fileQueue.length > 0;
  const isDisabled = !isPeerConnected;

  // ── Zone state styling ──
  const getZoneStyle = () => {
    if (isDisabled) return 'border-white/[0.05] bg-white/[0.01] cursor-not-allowed opacity-40';
    if (dragError)  return 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)]';
    if (isDragging) return 'border-cyan-400/60 bg-cyan-500/5 shadow-[0_0_50px_rgba(6,182,212,0.2)] scale-[1.01]';
    return 'border-white/[0.07] bg-white/[0.02] hover:border-cyan-500/20 hover:bg-cyan-500/[0.02] cursor-pointer';
  };

  // ── Center icon ──
  const renderCenterIcon = () => {
    if (dragError) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          className="p-5 bg-rose-500/10 rounded-3xl mb-5"
        >
          <AlertCircle size={36} className="text-rose-400" />
        </motion.div>
      );
    }

    if (isDragging) {
      return (
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="p-5 bg-cyan-500/10 rounded-3xl mb-5 border border-cyan-500/20"
        >
          <UploadCloud size={36} className="text-cyan-400" />
        </motion.div>
      );
    }

    if (hasFiles && fileQueue.length === 1) {
      const { icon: Icon, color, bg } = getFileType(fileQueue[0].name);
      return (
        <div className={`p-5 ${bg} rounded-3xl mb-5 border border-white/[0.06]`}>
          <Icon size={36} className={color} />
        </div>
      );
    }

    return (
      <motion.div
        animate={isPeerConnected ? { y: [-2, 2, -2] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className={`
          p-5 rounded-3xl mb-5 border
          ${isPeerConnected
            ? 'bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 border-cyan-500/15'
            : 'bg-white/[0.02] border-white/[0.04]'
          }
        `}
      >
        <UploadCloud size={36} className={isPeerConnected ? 'text-cyan-400' : 'text-slate-700'} />
      </motion.div>
    );
  };

  return (
    <div
      role="button"
      tabIndex={isPeerConnected ? 0 : -1}
      aria-label="Drop files or click to browse"
      aria-disabled={isDisabled}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); }}}
      onClick={() => isPeerConnected && inputRef.current?.click()}
      className={`
        relative flex-1 border-2 border-dashed rounded-[40px]
        transition-all duration-400 ease-out
        flex flex-col items-center justify-center p-10
        focus:outline-none select-none overflow-hidden
        ${getZoneStyle()}
      `}
    >
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={isDisabled}
        className="hidden"
        aria-hidden="true"
      />

      {/* Drag particles */}
      <AnimatePresence>
        {isDragging && <DragParticles />}
      </AnimatePresence>

      {/* Corner decoration */}
      {isPeerConnected && !dragError && (
        <>
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-500/20 rounded-br-xl" />
        </>
      )}

      {/* Center content */}
      {renderCenterIcon()}

      {/* Primary text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={dragError ? 'error' : isDragging ? 'drag' : 'idle'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{    opacity: 0, y: -5 }}
          className={`text-sm font-bold uppercase tracking-widest text-center ${
            dragError
              ? 'text-rose-400'
              : isDragging
              ? 'text-cyan-300'
              : isPeerConnected
              ? 'text-slate-300'
              : 'text-slate-600'
          }`}
        >
          {dragError
            ? dragError
            : isDragging
            ? '✦ Release to queue files'
            : isPeerConnected
            ? 'Drop files or click to browse'
            : 'Establish tunnel first'
          }
        </motion.p>
      </AnimatePresence>

      {/* Sub text */}
      {!dragError && (
        <p className={`text-[10px] mt-2 font-semibold uppercase tracking-wider ${
          isDragging ? 'text-cyan-400/60' : 'text-slate-600'
        }`}>
          {isPeerConnected
            ? 'Ctrl+V to paste  •  Max 2GB per file  •  Up to 20 files'
            : 'Connect to a peer to enable file transfer'
          }
        </p>
      )}

      {/* File counter pill */}
      <AnimatePresence>
        {isPeerConnected && hasFiles && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: 10 }}
            className="absolute bottom-5 flex items-center gap-3"
          >
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-full backdrop-blur-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                {fileQueue.length} file{fileQueue.length > 1 ? 's' : ''} queued
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                {formatSize(totalSize)}
              </span>
            </div>

            {/* Add more button */}
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] px-3 py-2 rounded-full hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all"
            >
              <Plus size={12} className="text-cyan-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dragging gradient overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            className="absolute inset-0 pointer-events-none rounded-[40px] bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropZone;