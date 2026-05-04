// client/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';

import Sidebar from './layout/Sidebar';
import DropZone from './components/DropZone';
import FilePreview from './components/FilePreview';
import TransferStats from './components/TransferStats';
import ModeSelector from './components/ModeSelector';
import CloudUpload from './components/CloudUpload';
import CloudDownload from './components/CloudDownload';

import {
  Zap, Clock, Trash2, ShieldAlert, Copy, Check, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { useWebRTC } from './hooks/useWebRTC';

const DownloadPage = () => <CloudDownload />;

// ─── Ambient BG ─────────────────────────────────────────────
const AmbientBG = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-600/8 via-indigo-500/5 to-transparent blur-3xl" />
    <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-cyan-500/6 via-sky-400/4 to-transparent blur-3xl" />
    <div
      className="absolute inset-0 opacity-[0.015]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
  </div>
);

// ─── Glass Card ─────────────────────────────────────────────
const GlassCard = ({ children, className = '' }) => (
  <div className={`relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl ${className}`}>
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-3xl" />
    {children}
  </div>
);

// ─── Gradient Text ──────────────────────────────────────────
const GradientText = ({ children }) => (
  <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
    {children}
  </span>
);

// ─── P2P Left Panel ─────────────────────────────────────────
const P2PLeftPanel = ({ roomId, isPeerConnected, status, roomError, user, fileQueue, joinId, setJoinId, handleInitialize, handleConnect, sendFiles }) => {
  return (
    <GlassCard className="w-[280px] shrink-0 p-5 flex flex-col gap-4">
      {!roomId ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">P2P Transfer</p>
              <p className="text-[9px] text-slate-600">End-to-end encrypted</p>
            </div>
          </div>

          {/* Create */}
          <button
            onClick={handleInitialize}
            className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
              user
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:scale-[1.02]'
                : 'bg-white/5 text-slate-500 cursor-not-allowed'
            }`}
          >
            {user ? '⚡ Create Room' : '🔒 Login Required'}
          </button>

          {roomError && (
            <p className="text-rose-400 text-xs text-center bg-rose-500/10 p-2 rounded-xl">
              {roomError}
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">or join</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Join */}
          <input
            type="text"
            placeholder="Enter Room ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            disabled={!user}
            className="w-full bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl text-cyan-400 font-mono text-center text-sm outline-none disabled:opacity-30 focus:border-cyan-500/30 transition-all placeholder:text-slate-600"
          />
          <button
            onClick={handleConnect}
            disabled={!user || !joinId.trim()}
            className="w-full py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-20 hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all"
          >
            Join Room →
          </button>
        </>
      ) : (
        <>
          {/* Status */}
          <div className={`p-4 rounded-2xl text-center border transition-all ${
            isPeerConnected
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPeerConnected ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-amber-400 animate-pulse'}`} />
              <p className={`font-bold text-sm ${isPeerConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isPeerConnected ? 'Connected' : 'Waiting...'}
              </p>
            </div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-1">{status}</p>
          </div>

          {/* Room ID */}
          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.05] text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Room ID</p>
            <code className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tracking-widest">
              {roomId}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="mt-2 text-[9px] text-slate-500 hover:text-cyan-400 font-bold uppercase tracking-widest transition-colors block mx-auto"
            >
              Copy
            </button>
          </div>

          <div className="flex-1" />

          {/* Send */}
          {isPeerConnected && fileQueue.length > 0 && status !== 'transferring' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={sendFiles}
              className="w-full py-5 rounded-2xl font-bold text-sm uppercase bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Send size={16} /> Send Files
            </motion.button>
          )}

          {isPeerConnected && fileQueue.length === 0 && (
            <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Drop files on the right →
            </p>
          )}

          {!isPeerConnected && (
            <div className="text-center space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Share room ID with peer
              </p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
};

// ─── Main App ───────────────────────────────────────────────
function MainApp() {
  const [activeTab, setActiveTab] = useState('Transfer');
  const [joinId,    setJoinId]    = useState('');
  const [mode,      setMode]      = useState('p2p');
  const [user,      setUser]      = useState(null);

  const {
    roomId, isPeerConnected, status, roomError,
    fileQueue, setFileQueue, progress, stats,
    currentFileDisplay, currentFileIndex, totalFiles,
    bytesTransferred, currentFileSize, incomingFile,
    sentFileNames, history, setHistory,
    initializeRoom, joinRoom, sendFiles, handleManualAbort,
  } = useWebRTC();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser({ name: u.displayName, email: u.email, photo: u.photoURL, uid: u.uid });
      else setUser(null);
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) {} };
  const handleLogout     = async () => { try { await signOut(auth); setActiveTab('Transfer'); } catch (e) {} };
  const handleInitialize = useCallback(() => initializeRoom(user, setActiveTab), [user, initializeRoom]);
  const handleConnect    = useCallback(() => joinRoom(joinId, user), [joinId, user, joinRoom]);

  // ── Transfer Tab ────────────────────────────────────────
  const renderTransfer = () => (
    <motion.div
      key="transfer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col gap-4 overflow-hidden"
    >
      {/* Mode Selector - COMPACT */}
      <div className="shrink-0">
        <ModeSelector mode={mode} setMode={setMode} />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {mode === 'p2p' ? (
            <motion.div
              key="p2p"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex gap-4"
            >
              {/* Left Panel */}
              <P2PLeftPanel
                roomId={roomId}
                isPeerConnected={isPeerConnected}
                status={status}
                roomError={roomError}
                user={user}
                fileQueue={fileQueue}
                joinId={joinId}
                setJoinId={setJoinId}
                handleInitialize={handleInitialize}
                handleConnect={handleConnect}
                sendFiles={sendFiles}
              />

              {/* Right Panel */}
              <div className="flex-1 min-w-0 relative flex flex-col">
                {/* Auth Guard */}
                {!user && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-10 rounded-3xl flex flex-col items-center justify-center border border-white/5 gap-4">
                    <ShieldAlert size={36} className="text-slate-500" />
                    <p className="font-bold uppercase tracking-widest text-xs text-slate-300">Sign in to transfer files</p>
                    <button onClick={() => setActiveTab('Settings')} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
                      Sign In
                    </button>
                  </div>
                )}

                {status === 'transferring' ? (
                  <TransferStats
                    progress={progress}
                    stats={stats}
                    fileName={currentFileDisplay}
                    onCancel={handleManualAbort}
                    direction={incomingFile.name ? 'receiving' : 'sending'}
                    currentFileIndex={currentFileIndex}
                    totalFiles={totalFiles || 1}
                    bytesTransferred={bytesTransferred}
                    totalBytes={incomingFile.name ? incomingFile.size : currentFileSize}
                  />
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <DropZone isPeerConnected={isPeerConnected} fileQueue={fileQueue} setFileQueue={setFileQueue} />
                    <FilePreview fileQueue={fileQueue} setFileQueue={setFileQueue} currentFileName={currentFileDisplay} sentFiles={sentFileNames} />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cloud"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <CloudUpload user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  // ── History Tab ──────────────────────────────────────────
  const renderHistory = () => (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <GlassCard className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">
              <GradientText>Transfer History</GradientText>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              {history.length} transfer{history.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Clear all?')) setHistory([]); }}
              className="p-3 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {history.length > 0 ? (
            history.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl flex items-center justify-between hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${item.type === 'SENT' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white truncate max-w-[300px]">{item.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.date} at {item.timestamp}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">{item.size}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${item.type === 'SENT' ? 'text-cyan-500' : 'text-emerald-500'}`}>
                    {item.type === 'SENT' ? '↑ Sent' : '↓ Received'}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Clock size={40} className="text-slate-700" />
              <div className="text-center">
                <p className="font-bold text-slate-600 uppercase tracking-widest text-sm">No transfers yet</p>
                <p className="text-[10px] text-slate-700 mt-1">History appears after transfers</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );

  // ── Settings Tab ─────────────────────────────────────────
  const renderSettings = () => (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="h-full flex items-center justify-center"
    >
      <GlassCard className="w-full max-w-lg p-10 text-center">
        {!user ? (
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 rounded-3xl">
              <ShieldAlert size={40} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-white mb-2">
                Welcome to <GradientText>FluidSync</GradientText>
              </h2>
              <p className="text-slate-500 text-sm">Sign in to start transferring files</p>
            </div>
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-2xl uppercase tracking-wider text-sm hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition-all duration-300"
            >
              Continue with Google
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <img src={user.photo} className="w-20 h-20 rounded-2xl border-2 border-white/10" alt="Profile" onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] flex items-center justify-center">
                <Check size={10} className="text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{user.name}</h2>
              <p className="text-slate-500 text-sm">{user.email}</p>
            </div>
            <div className="flex gap-4">
              {[
                { label: 'Sent', value: history.filter(h => h.type === 'SENT').length, color: 'text-cyan-400 border-cyan-500/10' },
                { label: 'Received', value: history.filter(h => h.type === 'RECEIVED').length, color: 'text-emerald-400 border-emerald-500/10' },
              ].map(s => (
                <div key={s.label} className={`bg-white/[0.03] border ${s.color} px-6 py-4 rounded-2xl text-center min-w-[80px]`}>
                  <p className={`text-xl font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={handleLogout} className="mt-2 px-6 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-300">
              Sign Out
            </button>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );

  // ── Main Render ──────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0a0a0f] text-slate-100 font-sans overflow-hidden">
      <AmbientBG />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        isPeerConnected={isPeerConnected}
        roomId={roomId}
      />

      <main className="flex-1 min-w-0 flex flex-col p-5 overflow-hidden relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-500 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                <GradientText>FluidSync</GradientText>
              </h1>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest -mt-0.5">P2P File Transfer</p>
            </div>
          </div>

          {roomId && mode === 'p2p' && (
            <div className="flex items-center gap-3 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] px-4 py-2.5 rounded-2xl">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                {isPeerConnected && <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />}
              </div>
              <code className="text-cyan-400 font-mono text-sm font-bold">{roomId}</code>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'Transfer' && renderTransfer()}
            {activeTab === 'History'  && renderHistory()}
            {activeTab === 'Settings' && renderSettings()}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/"           element={<MainApp />} />
      <Route path="/download/*" element={<DownloadPage />} />
    </Routes>
  );
}

export default App;