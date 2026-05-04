// client/src/layout/Sidebar.jsx
import React, { useCallback, useState } from 'react';
import {
  LayoutGrid, History, Settings,
  Zap, LogOut, Wifi, WifiOff, User, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'Transfer', icon: LayoutGrid, label: 'Transfer', description: 'Send & receive files', color: 'cyan' },
  { id: 'History',  icon: History,    label: 'History',  description: 'Transfer log',         color: 'violet' },
  { id: 'Settings', icon: Settings,   label: 'Settings', description: 'Account',              color: 'indigo' },
];

const COLOR_MAP = {
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',   glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',   dot: 'bg-cyan-400'   },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',   dot: 'bg-violet-400' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]',   dot: 'bg-indigo-400' },
};

// ─── Avatar ─────────────────────────────────────────────────
const UserAvatar = ({ user }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError || !user.photo) {
    const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-cyan-400 font-black text-sm">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={user.photo}
      alt={user.name ?? 'Avatar'}
      onError={() => setImgError(true)}
      className="w-10 h-10 rounded-xl border border-white/10 object-cover"
    />
  );
};

// ─── Nav Button ─────────────────────────────────────────────
const NavButton = ({ item, isActive, onClick }) => {
  const Icon  = item.icon;
  const color = COLOR_MAP[item.color];

  return (
    <button
      onClick={() => onClick(item.id)}
      aria-label={item.description}
      aria-current={isActive ? 'page' : undefined}
      className={`
        relative w-full flex items-center gap-3.5
        px-4 py-3.5 rounded-2xl
        transition-all duration-300
        focus:outline-none group
        ${isActive ? `${color.text} ${color.glow}` : 'text-slate-500 hover:text-slate-200'}
      `}
    >
      {/* Active pill background */}
      {isActive && (
        <motion.div
          layoutId="activeNavBg"
          className={`absolute inset-0 rounded-2xl ${color.bg} border ${color.border}`}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      {/* Hover bg */}
      {!isActive && (
        <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-200" />
      )}

      {/* Icon container */}
      <div className={`
        relative z-10 p-2 rounded-xl transition-all duration-300
        ${isActive
          ? `${color.bg} ${color.text}`
          : 'text-slate-600 group-hover:text-slate-300 group-hover:bg-white/5'
        }
      `}>
        <Icon size={16} />
      </div>

      {/* Label + description */}
      <div className="relative z-10 flex-1 text-left">
        <p className="text-sm font-bold leading-none">{item.label}</p>
        <p className={`text-[9px] mt-0.5 transition-colors ${
          isActive ? 'opacity-60' : 'text-slate-700 group-hover:text-slate-500'
        }`}>
          {item.description}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight
        size={14}
        className={`relative z-10 transition-all duration-300 ${
          isActive
            ? `${color.text} opacity-60`
            : 'text-slate-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
        }`}
      />

      {/* Active dot */}
      {isActive && (
        <motion.div
          layoutId="activeNavDot"
          className={`absolute right-3 w-1.5 h-1.5 rounded-full ${color.dot} shadow-[0_0_8px_currentColor]`}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
    </button>
  );
};

// ─── Connection Badge ────────────────────────────────────────
const ConnectionStatus = ({ isPeerConnected, roomId }) => {
  if (!roomId) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isPeerConnected ? 'on' : 'off'}
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1,  y:  0, scale: 1    }}
        exit={{    opacity: 0,  y:  8, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`
          flex items-center gap-3 px-4 py-3.5
          rounded-2xl border mb-3
          ${isPeerConnected
            ? 'bg-emerald-500/[0.07] border-emerald-500/15'
            : 'bg-amber-500/[0.07]  border-amber-500/15'
          }
        `}
      >
        {/* Status dot */}
        <div className="relative shrink-0">
          <div className={`w-2 h-2 rounded-full ${
            isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
          }`} />
          {isPeerConnected && (
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`text-[9px] font-black uppercase tracking-widest ${
            isPeerConnected ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {isPeerConnected ? 'Tunnel Active' : 'Awaiting Peer'}
          </p>
          <p className="text-[8px] text-slate-600 font-mono truncate mt-0.5">
            {roomId}
          </p>
        </div>

        {/* Wifi icon */}
        {isPeerConnected
          ? <Wifi    size={12} className="text-emerald-400/60 shrink-0" />
          : <WifiOff size={12} className="text-amber-400/60  shrink-0" />
        }
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Sidebar ────────────────────────────────────────────────
const Sidebar = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  isPeerConnected = false,
  roomId          = '',
}) => {
  const handleNavClick = useCallback((tabId) => setActiveTab(tabId), [setActiveTab]);

  return (
    <aside
      className="
        relative w-64 shrink-0
        bg-[#0d0d14] border-r border-white/[0.04]
        flex flex-col p-5 z-30
        overflow-hidden
      "
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Sidebar ambient glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />

      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-2 mb-8 relative">
        <div className="
          w-9 h-9 rounded-xl
          bg-gradient-to-br from-cyan-400 to-indigo-500
          flex items-center justify-center
          shadow-[0_0_20px_rgba(6,182,212,0.25)]
          shrink-0
        ">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-base font-black tracking-tight text-white leading-none">
            FluidSync
          </p>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
            Pro
          </p>
        </div>
      </div>

      {/* ── Connection Status ── */}
      <ConnectionStatus isPeerConnected={isPeerConnected} roomId={roomId} />

      {/* ── Nav ── */}
      <nav className="flex-1 space-y-1 relative">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={handleNavClick}
          />
        ))}
      </nav>

      {/* ── Divider ── */}
      <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── User Section ── */}
      {user ? (
        <div className="space-y-3">
          {/* User card */}
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
            <div className="relative shrink-0">
              <UserAvatar user={user} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d0d14]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="
              w-full flex items-center justify-center gap-2
              py-2.5 rounded-xl
              bg-rose-500/[0.06] hover:bg-rose-500
              border border-rose-500/10 hover:border-rose-500
              text-rose-400 hover:text-white
              transition-all duration-300
              text-[9px] font-black uppercase tracking-widest
            "
          >
            <LogOut size={11} />
            Sign Out
          </button>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-br from-cyan-500/5 to-indigo-500/5 border border-white/[0.04] rounded-2xl text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <User size={18} className="text-slate-600" />
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Not signed in
          </p>
          <button
            onClick={() => setActiveTab('Settings')}
            className="
              w-full py-2.5
              bg-gradient-to-r from-cyan-500 to-indigo-500
              text-white font-bold rounded-xl
              text-[9px] uppercase tracking-widest
              hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]
              transition-all duration-300
            "
          >
            Sign In
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;