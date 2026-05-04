import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download, FileText, AlertCircle,
  Clock, User, Loader2, CheckCircle2
} from 'lucide-react';

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

const CloudDownload = () => {
  const params  = useParams();
  const encoded = params['*'] || params.encoded || '';

  // ── Decode ─────────────────────────────────────────────
  let decoded   = null;
  let decodeErr = null;

  try {
    decoded = JSON.parse(atob(encoded));
  } catch (e) {
    decodeErr = "Invalid or corrupted download link.";
  }

  // ── Expired check ──────────────────────────────────────
  const isExpired = decoded ? new Date(decoded.exp) < new Date() : false;

  // ── Derived data ───────────────────────────────────────
  const files      = decoded?.files     ?? [];
  const uploader   = decoded?.by        ?? "Anonymous";
  const expiresAt  = decoded?.exp
    ? new Date(decoded.exp).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';
  const totalSize  = files.reduce((sum, f) => sum + (f.size ?? 0), 0);

  // ── Download a single file ─────────────────────────────
  const downloadFile = async (file) => {
    try {
      const res  = await fetch(file.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback - open in new tab
      window.open(file.url, '_blank');
    }
  };

  // ── Download all files ─────────────────────────────────
  const downloadAll = () => {
    files.forEach((file, i) => {
      setTimeout(() => downloadFile(file), i * 800);
    });
  };

  // ────────────────────────────────────────────────────────
  // ── Error State ────────────────────────────────────────
  // ────────────────────────────────────────────────────────
  if (decodeErr || (!decoded && !decodeErr)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="p-6 bg-rose-500/20 rounded-full inline-flex">
            <AlertCircle size={48} className="text-rose-400" />
          </div>
          <h2 className="text-xl font-black uppercase italic text-white">
            Invalid Link
          </h2>
          <p className="text-sm text-slate-500">
            {decodeErr ?? "This download link is invalid."}
          </p>
        </div>
      </div>
    );
  }

  // ── Expired State ──────────────────────────────────────
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="p-6 bg-amber-500/20 rounded-full inline-flex">
            <Clock size={48} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-black uppercase italic text-white">
            Link Expired
          </h2>
          <p className="text-sm text-slate-500">
            This link expired on {expiresAt}.
          </p>
        </div>
      </div>
    );
  }

  // ── Ready State ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-4"
      >
        {/* Header */}
        <div className="text-center space-y-1 mb-6">
          <div className="p-4 bg-emerald-500/20 rounded-full inline-flex mb-3">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black uppercase italic text-white">
            Ready to Download
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            {files.length} file{files.length > 1 ? 's' : ''} •{' '}
            {formatSize(totalSize)}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
            <User size={12} />
            <span>{uploader}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
            <Clock size={12} />
            <span>Expires {expiresAt}</span>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {files.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl"
            >
              {/* Icon */}
              <div className={`p-2.5 rounded-xl shrink-0 ${getFileColor(file.name)}`}>
                <FileText size={18} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">
                  {file.name}
                </p>
                <p className="text-[10px] text-slate-600 uppercase">
                  {formatSize(file.size)}
                </p>
              </div>

              {/* Download single */}
              <button
                onClick={() => downloadFile(file)}
                className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 hover:bg-sky-500/20 transition-all shrink-0"
              >
                <Download size={16} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Download All Button */}
        {files.length > 1 && (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-purple-500 hover:bg-purple-400 rounded-2xl font-black text-sm uppercase italic text-white flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          >
            <Download size={18} />
            Download All {files.length} Files
          </button>
        )}

        {/* Single file big button */}
        {files.length === 1 && (
          <button
            onClick={() => downloadFile(files[0])}
            className="w-full py-4 bg-purple-500 hover:bg-purple-400 rounded-2xl font-black text-sm uppercase italic text-white flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          >
            <Download size={18} />
            Download {files[0].name}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default CloudDownload;