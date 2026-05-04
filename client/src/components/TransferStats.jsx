// client/src/components/TransferStats.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Download, Upload, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes || bytes === 0)       return '0 B';
  if (bytes < 1024)                return `${bytes} B`;
  if (bytes < 1024 * 1024)         return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)  return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
};

// ─── Animated Number ─────────────────────────────────────────
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(value);
  const rafRef   = useRef(null);
  const startRef = useRef(null);
  const fromRef  = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to   = value;
    if (Math.abs(to - from) < 1) { setDisplay(to); fromRef.current = to; return; }
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / 350, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span>{display}</span>;
};

// ─── Speed Graph (mini sparkline) ────────────────────────────
const SpeedGraph = ({ speed }) => {
  const [history, setHistory] = useState(Array(20).fill(0));

  useEffect(() => {
    setHistory(prev => [...prev.slice(1), parseFloat(speed) || 0]);
  }, [speed]);

  const max = Math.max(...history, 0.1);

  return (
    <div className="flex items-end gap-0.5 h-8 w-full">
      {history.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500/60 to-cyan-300/30"
          animate={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          transition={{ duration: 0.3 }}
          style={{ minHeight: '4%' }}
        />
      ))}
    </div>
  );
};

// ─── Cancel Overlay ──────────────────────────────────────────
const CancelConfirm = ({ onConfirm, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{    opacity: 0 }}
    className="absolute inset-0 z-50 rounded-[40px] backdrop-blur-xl bg-black/70 flex flex-col items-center justify-center gap-6 p-8"
  >
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0   }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="p-5 bg-amber-500/20 rounded-3xl border border-amber-500/30"
    >
      <AlertTriangle size={40} className="text-amber-400" />
    </motion.div>

    <div className="text-center">
      <p className="text-white font-black text-xl uppercase tracking-tight mb-2">
        Abort Transfer?
      </p>
      <p className="text-slate-400 text-xs uppercase tracking-widest">
        This will reset the tunnel connection
      </p>
    </div>

    <div className="flex gap-3 w-full max-w-xs">
      <button
        onClick={onDismiss}
        className="flex-1 py-4 bg-white/[0.06] border border-white/[0.1] rounded-2xl font-bold text-sm text-white hover:bg-white/[0.1] transition-all"
      >
        Continue
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-4 bg-rose-500 rounded-2xl font-bold text-sm text-white hover:bg-rose-400 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
      >
        Abort
      </button>
    </div>
  </motion.div>
);

// ─── Main Component ──────────────────────────────────────────
const TransferStats = ({
  progress         = 0,
  stats            = { speed: '0', timeLeft: '0:00 min' },
  fileName         = '',
  onCancel,
  direction        = 'sending',
  currentFileIndex = 1,
  totalFiles       = 1,
  bytesTransferred = 0,
  totalBytes       = 0,
}) => {
  const [showCancel, setShowCancel] = useState(false);
  const isCalculating = !stats?.speed || stats.speed === '0';
  const isSending     = direction === 'sending';

  return (
    <div className="
      relative w-full h-full rounded-[40px] overflow-hidden
      flex flex-col
    ">
      {/* ── Gradient Background ── */}
      <div className={`
        absolute inset-0 
        ${isSending
          ? 'bg-gradient-to-br from-[#0f1f35] via-[#0a1628] to-[#0d0d1a]'
          : 'bg-gradient-to-br from-[#0f2020] via-[#0a1a18] to-[#0d0d1a]'
        }
      `} />

      {/* Animated glow orbs */}
      <div className={`
        absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30
        ${isSending ? 'bg-cyan-500' : 'bg-emerald-500'}
      `} />
      <div className={`
        absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20
        ${isSending ? 'bg-indigo-500' : 'bg-teal-500'}
      `} />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Cancel Confirm ── */}
      <AnimatePresence>
        {showCancel && (
          <CancelConfirm
            onConfirm={() => { setShowCancel(false); onCancel?.(); }}
            onDismiss={() => setShowCancel(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col h-full p-8 gap-6">

        {/* ── Top Row: Direction + Cancel ── */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {/* Direction badge */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full w-fit
              border backdrop-blur-sm
              ${isSending
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }
            `}>
              {isSending
                ? <Upload   size={12} />
                : <Download size={12} />
              }
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isSending ? 'Sending' : 'Receiving'}
              </span>
              {totalFiles > 1 && (
                <>
                  <span className="opacity-30">•</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {currentFileIndex} / {totalFiles}
                  </span>
                </>
              )}
            </div>

            {/* File name */}
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                Current File
              </p>
              <h2 className="text-lg font-black text-white truncate max-w-[280px] leading-tight">
                {fileName || 'Initializing...'}
              </h2>
              {totalBytes > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {formatSize(bytesTransferred)}
                  <span className="text-slate-700"> / </span>
                  {formatSize(totalBytes)}
                </p>
              )}
            </div>
          </div>

          {/* Cancel button */}
          <button
            onClick={() => setShowCancel(true)}
            className="p-3 bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.06] hover:border-rose-500/30 rounded-2xl transition-all group"
          >
            <X size={18} className="text-slate-500 group-hover:text-rose-400 transition-colors" />
          </button>
        </div>

        {/* ── Big Progress Number ── */}
        <div className="flex items-end gap-2 -mb-2">
          <div className={`
            text-[96px] font-black leading-none tracking-tighter
            bg-gradient-to-br bg-clip-text text-transparent
            ${isSending
              ? 'from-cyan-300 via-cyan-400 to-indigo-400'
              : 'from-emerald-300 via-emerald-400 to-teal-400'
            }
          `}>
            <AnimatedNumber value={progress} />
          </div>
          <div className="pb-4">
            <span className={`text-3xl font-black ${isSending ? 'text-cyan-500/60' : 'text-emerald-500/60'}`}>
              %
            </span>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="space-y-2">
          <div className="relative h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
            <motion.div
              className={`
                absolute inset-y-0 left-0 rounded-full
                bg-gradient-to-r
                ${isSending
                  ? 'from-cyan-500 via-sky-400 to-indigo-500'
                  : 'from-emerald-500 via-teal-400 to-cyan-500'
                }
              `}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ left: `${Math.max(progress - 20, 0)}%` }}
            />
          </div>

          {/* Multi-file segments */}
          {totalFiles > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: totalFiles }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`
                    h-1 flex-1 rounded-full transition-all duration-500
                    ${i < currentFileIndex - 1
                      ? isSending ? 'bg-cyan-500/60' : 'bg-emerald-500/60'
                      : i === currentFileIndex - 1
                      ? isSending ? 'bg-cyan-400' : 'bg-emerald-400'
                      : 'bg-white/[0.06]'
                    }
                  `}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {/* Speed */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={12} className={isSending ? 'text-cyan-400' : 'text-emerald-400'} />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Speed
              </p>
            </div>

            {/* Mini sparkline graph */}
            <SpeedGraph speed={stats?.speed || '0'} />

            <p className="text-lg font-black text-white mt-2">
              {isCalculating
                ? <span className="text-sm text-slate-600">Calculating...</span>
                : <span>
                    <span className={isSending ? 'text-cyan-400' : 'text-emerald-400'}>
                      {stats.speed}
                    </span>
                    <span className="text-slate-500 text-xs font-bold ml-1">MB/s</span>
                  </span>
              }
            </p>
          </div>

          {/* Time */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isSending ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Time Left
              </p>
            </div>

            {/* Circular progress mini */}
            <div className="flex items-center justify-center flex-1">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                  <motion.circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke={isSending ? '#06b6d4' : '#10b981'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - progress / 100) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white">{progress}%</span>
                </div>
              </div>
            </div>

            <p className="text-sm font-black text-white mt-2 text-center">
              {isCalculating
                ? <span className="text-slate-600 text-xs">Estimating...</span>
                : <span className={isSending ? 'text-cyan-400' : 'text-emerald-400'}>
                    {stats.timeLeft}
                  </span>
              }
            </p>
          </div>
        </div>

        {/* ── Decorative Icon ── */}
        <div className="absolute bottom-6 right-8 opacity-[0.04] pointer-events-none">
          <Zap size={200} />
        </div>
      </div>
    </div>
  );
};

export default TransferStats;