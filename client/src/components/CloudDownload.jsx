import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download, FileText, AlertCircle,
  Clock, User, CheckCircle2, X
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
  if (['pdf'].includes(ext))                                 return 'text-red-400 bg-red-500/20';
  return 'text-sky-400 bg-sky-500/20';
};

const CloudDownload = () => {
  const params  = useParams();
  const encoded = params['*'] || params.encoded || '';

  const [state, setState] = useState('loading');
  // loading | ready | expired | error
  const [files,       setFiles]       = useState([]);
  const [uploader,    setUploader]    = useState('');
  const [expiresAt,   setExpiresAt]   = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [downloading, setDownloading] = useState({});

  // ── Decode on mount ──────────────────────────────────
  useEffect(() => {
    if (!encoded) {
      setState('error');
      setErrorMsg('No download link found.');
      return;
    }

    try {
      const decoded = JSON.parse(atob(encoded));

      console.log('Decoded:', decoded);

      // ── Expired check ──
      if (decoded.exp && new Date(decoded.exp) < new Date()) {
        setState('expired');
        setExpiresAt(
          new Date(decoded.exp).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
          })
        );
        return;
      }

      // ── Multi-file format ──
      if (Array.isArray(decoded.files) && decoded.files.length > 0) {
        setFiles(decoded.files);
        setUploader(decoded.by || 'Anonymous');
        setExpiresAt(
          decoded.exp
            ? new Date(decoded.exp).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              })
            : 'Unknown'
        );
        setState('ready');
        return;
      }

      // ── Old single-file format (backward compat) ──
      if (decoded.url) {
        setFiles([{
          name: decoded.name || 'file',
          size: decoded.size || 0,
          url:  decoded.url,
        }]);
        setUploader(decoded.by || 'Anonymous');
        setExpiresAt(
          decoded.exp
            ? new Date(decoded.exp).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              })
            : 'Unknown'
        );
        setState('ready');
        return;
      }

      // ── Nothing valid found ──
      setState('error');
      setErrorMsg('No files found in this link.');

    } catch (e) {
      console.error('Decode error:', e);
      setState('error');
      setErrorMsg('Invalid or corrupted download link.');
    }
  }, [encoded]);

  // ── Download single file ─────────────────────────────
  const downloadFile = async (file, index) => {
    setDownloading(prev => ({ ...prev, [index]: true }));
    try {
      const res  = await fetch(file.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback - open directly
      window.open(file.url, '_blank');
    } finally {
      setDownloading(prev => ({ ...prev, [index]: false }));
    }
  };

  // ── Download all ─────────────────────────────────────
  const downloadAll = () => {
    files.forEach((file, i) => {
      setTimeout(() => downloadFile(file, i), i * 1000);
    });
  };

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  // ────────────────────────────────────────────────────
  // ── Loading State ────────────────────────────────────
  // ────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="p-5 bg-rose-500/20 rounded-full inline-flex">
            <AlertCircle size={44} className="text-rose-400" />
          </div>
          <h2 className="text-xl font-black uppercase italic text-white">
            Invalid Link
          </h2>
          <p className="text-sm text-slate-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ── Expired State ─────────────────────────────────────
  if (state === 'expired') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="p-5 bg-amber-500/20 rounded-full inline-flex">
            <Clock size={44} className="text-amber-400" />
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

  // ── Ready State ───────────────────────────────────────
  return (
    <div className="min-h-[100dvh] w-full bg-[#0a0a0f] flex items-start sm:items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-4"
      >
        {/* ── Header ── */}
        <div className="text-center space-y-2 mb-2">
          <div className="p-4 bg-emerald-500/20 rounded-full inline-flex mb-2">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black uppercase italic text-white">
            Ready to Download
          </h2>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest">
            {files.length} file{files.length > 1 ? 's' : ''} •{' '}
            {formatSize(totalSize)}
          </p>
        </div>

        {/* ── Meta ── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
            <User size={11} />
            <span>{uploader}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
            <Clock size={11} />
            <span>Expires {expiresAt}</span>
          </div>
        </div>

        {/* ── File List ── */}
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {files.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl"
            >
              {/* Icon */}
              <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${getFileColor(file.name)}`}>
                <FileText size={16} />
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
                onClick={() => downloadFile(file, i)}
                disabled={downloading[i]}
                className="p-2 sm:p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 hover:bg-sky-500/20 transition-all shrink-0 disabled:opacity-50"
              >
                {downloading[i]
                  ? <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  : <Download size={15} />
                }
              </button>
            </motion.div>
          ))}
        </div>

        {/* ── Download All Button ── */}
        {files.length > 1 && (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-purple-500 hover:bg-purple-400 active:bg-purple-600 rounded-2xl font-black text-sm uppercase italic text-white flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          >
            <Download size={18} />
            Download All {files.length} Files
          </button>
        )}

        {/* ── Single File Big Button ── */}
        {files.length === 1 && (
          <button
            onClick={() => downloadFile(files[0], 0)}
            disabled={downloading[0]}
            className="w-full py-4 bg-purple-500 hover:bg-purple-400 active:bg-purple-600 rounded-2xl font-black text-sm uppercase italic text-white flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-50"
          >
            {downloading[0]
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Download size={18} />
            }
            {downloading[0] ? 'Downloading...' : `Download ${files[0].name}`}
          </button>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-[10px] text-slate-700 font-bold uppercase tracking-widest pt-2">
          Powered by Fluid Sync
        </p>
      </motion.div>
    </div>
  );
};

export default CloudDownload;