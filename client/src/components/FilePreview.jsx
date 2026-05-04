// client/src/components/FilePreview.jsx
import React, { useCallback, useMemo } from 'react';
import {
  X, Trash2,
  FileText, Film, Music,
  Image, Archive, File,
  CheckCircle2, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── File Type Config ────────────────────────────────────────
const FILE_TYPES = [
  { exts: ['jpg','jpeg','png','gif','webp','svg','bmp','ico','avif'], icon: Image,    color: 'text-violet-400',  bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
  { exts: ['mp4','mkv','avi','mov','webm','flv','wmv','m4v'],       icon: Film,     color: 'text-rose-400',    bg: 'bg-rose-500/10',   border: 'border-rose-500/15'   },
  { exts: ['mp3','wav','flac','aac','ogg','m4a','wma'],            icon: Music,    color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/15'  },
  { exts: ['pdf','doc','docx','txt','md','csv','xls','xlsx','ppt'], icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/15'},
  { exts: ['zip','rar','7z','tar','gz','bz2','xz'],                icon: Archive,  color: 'text-orange-400',  bg: 'bg-orange-500/10', border: 'border-orange-500/15' },
];

const DEFAULT_TYPE = { icon: File, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/15' };

const getFileType = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  return FILE_TYPES.find(t => t.exts.includes(ext)) ?? DEFAULT_TYPE;
};

const formatSize = (bytes) => {
  if (!bytes)                       return '0 B';
  if (bytes < 1024)                 return `${bytes} B`;
  if (bytes < 1024 * 1024)          return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)   return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
};

const getFileKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;

// ─── Single File Row ─────────────────────────────────────────
const FileRow = React.memo(({ file, index, onRemove, isCurrent, isDone, total }) => {
  const { icon: Icon, color, bg, border } = getFileType(file.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1    }}
      exit={{    opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        relative flex items-center gap-3
        px-4 py-3 rounded-xl border
        transition-all duration-300 group
        ${isCurrent
          ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/5 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.08)]'
          : isDone
          ? 'bg-emerald-500/[0.04] border-emerald-500/10'
          : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]'
        }
      `}
    >
      {/* Index badge */}
      <div className={`
        w-5 h-5 rounded-md flex items-center justify-center shrink-0
        text-[9px] font-black
        ${isCurrent
          ? 'bg-cyan-500/20 text-cyan-400'
          : isDone
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-white/[0.04] text-slate-600'
        }
      `}>
        {isCurrent
          ? <Loader2 size={10} className="animate-spin" />
          : isDone
          ? <CheckCircle2 size={10} />
          : index + 1
        }
      </div>

      {/* File icon */}
      <div className={`
        p-1.5 rounded-lg shrink-0 border
        ${isCurrent
          ? 'bg-cyan-500/10 border-cyan-500/15'
          : isDone
          ? 'bg-emerald-500/10 border-emerald-500/15'
          : `${bg} ${border}`
        }
      `}>
        {isCurrent
          ? <Loader2 size={14} className="text-cyan-400 animate-spin" />
          : isDone
          ? <CheckCircle2 size={14} className="text-emerald-400" />
          : <Icon size={14} className={color} />
        }
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate leading-none mb-0.5">
          {file.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
            {formatSize(file.size)}
          </span>
          {isCurrent && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider"
            >
              Sending...
            </motion.span>
          )}
          {isDone && (
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
              Sent ✓
            </span>
          )}
        </div>
      </div>

      {/* Remove button */}
      {!isCurrent && !isDone && (
        <button
          onClick={() => onRemove(index)}
          aria-label={`Remove ${file.name}`}
          className="
            p-1.5 rounded-lg opacity-0 group-hover:opacity-100
            text-slate-600 hover:text-rose-400 hover:bg-rose-500/10
            transition-all duration-200 shrink-0
          "
        >
          <X size={12} />
        </button>
      )}

      {/* Progress indicator for current file */}
      {isCurrent && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

FileRow.displayName = 'FileRow';

// ─── Main Component ──────────────────────────────────────────
const FilePreview = ({
  fileQueue,
  setFileQueue,
  currentFileName = '',
  sentFiles       = [],
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const removeFile = useCallback((index) => {
    setFileQueue(prev => prev.filter((_, i) => i !== index));
  }, [setFileQueue]);

  const clearAll = useCallback(() => {
    if (window.confirm('Remove all queued files?')) setFileQueue([]);
  }, [setFileQueue]);

  const totalSize = useMemo(
    () => fileQueue.reduce((sum, f) => sum + f.size, 0),
    [fileQueue]
  );

  if (fileQueue.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {/* Queue icon */}
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 border border-cyan-500/10 flex items-center justify-center">
              <span className="text-[10px] font-black text-cyan-400">{fileQueue.length}</span>
            </div>
            {/* Pulse dot */}
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          </div>

          <div>
            <p className="text-xs font-bold text-white leading-none">
              File Queue
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              {formatSize(totalSize)} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear button */}
          {fileQueue.length > 1 && !isCollapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              className="
                flex items-center gap-1 px-2.5 py-1
                text-[9px] font-bold uppercase tracking-widest
                text-slate-600 hover:text-rose-400
                hover:bg-rose-500/10 rounded-lg
                transition-all
              "
            >
              <Trash2 size={10} />
              Clear
            </button>
          )}

          {/* Collapse toggle */}
          {isCollapsed
            ? <ChevronDown size={14} className="text-slate-600" />
            : <ChevronUp   size={14} className="text-slate-600" />
          }
        </div>
      </div>

      {/* ── File List ── */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {fileQueue.map((file, idx) => (
                  <FileRow
                    key={getFileKey(file)}
                    file={file}
                    index={idx}
                    total={fileQueue.length}
                    onRemove={removeFile}
                    isCurrent={file.name === currentFileName}
                    isDone={sentFiles.includes(file.name)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsed summary ── */}
      {isCollapsed && (
        <div className="px-4 pb-3">
          <div className="flex gap-1">
            {fileQueue.slice(0, 8).map((file, i) => {
              const { color } = getFileType(file.name);
              return (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${color.replace('text-', 'bg-')}/40`}
                />
              );
            })}
            {fileQueue.length > 8 && (
              <div className="h-1 flex-1 rounded-full bg-white/10" />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FilePreview;