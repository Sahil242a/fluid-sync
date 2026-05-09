// client/src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer/simplepeer.min.js';
import { v4 as uuidv4 } from 'uuid';

// ─── Constants ─────────────────────────────────────────────
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://fluid-sync-server.onrender.com');

const CHUNK_SIZE = 256 * 1024;       // 256KB
const MAX_BUFFER = 4 * 1024 * 1024;   // 4MB backpressure
const HISTORY_LIMIT = 50;

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ─── Size Formatter ────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
};

// ─── Hook ──────────────────────────────────────────────────
export const useWebRTC = () => {
  // ── Connection State ──────────────────────────────────
  const [roomId, setRoomId] = useState('');
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [status, setStatus] = useState('idle');
  // idle | waiting | connected | transferring | error
  const [roomError, setRoomError] = useState('');

  // ── Transfer State ────────────────────────────────────
  const [fileQueue, setFileQueue] = useState([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    speed: '0',
    timeLeft: '0:00 min',
  });
  const [currentFileDisplay, setCurrentFileDisplay] = useState('');
  const [currentFileIndex, setCurrentFileIndex] = useState(1);
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const [currentFileSize, setCurrentFileSize] = useState(0);
  const [incomingFile, setIncomingFile] = useState({
    name: '',
    size: 0,
    received: 0,
    buffer: [],
  });
  const [sentFileNames, setSentFileNames] = useState([]);

  // ── History State ─────────────────────────────────────
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('fluid_sync_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ── Refs ──────────────────────────────────────────────
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const roomIdRef = useRef('');
  const cancelRef = useRef(false);
  const startTime = useRef(null);
  const errorTimer = useRef(null);

  // ── Sync roomIdRef ────────────────────────────────────
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // ── Sync History to localStorage ──────────────────────
  useEffect(() => {
    localStorage.setItem('fluid_sync_history', JSON.stringify(history));
  }, [history]);

  // ── History Logger ────────────────────────────────────
  const logToHistory = useCallback((name, size, type) => {
    const entry = {
      id: uuidv4(),
      name,
      size: formatSize(size),
      type,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: new Date().toLocaleDateString(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  // ── Stats Updater ─────────────────────────────────────
  const updateStats = useCallback((bytesProcessed, totalSize) => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed < 0.5) return;

    const speedBytes = bytesProcessed / elapsed;
    const speedMBps = speedBytes / (1024 * 1024);
    const remaining = Math.max(0, (totalSize - bytesProcessed) / speedBytes);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);

    setStats({
      speed: speedMBps.toFixed(2),
      timeLeft: `${mins}:${secs < 10 ? '0' : ''}${secs} min`,
    });

    setBytesTransferred(bytesProcessed);
  }, []);

  // ── Incoming Data Handler ─────────────────────────────
  const handleData = useCallback((data) => {
    if (cancelRef.current) return;

    // Try metadata parse
    try {
      const decoded = new TextDecoder().decode(data);
      if (decoded.startsWith('{"type":"metadata"')) {
        const meta = JSON.parse(decoded);
        setIncomingFile({
          name: meta.name,
          size: meta.size,
          received: 0,
          buffer: [],
        });
        setCurrentFileDisplay(meta.name);
        setCurrentFileSize(meta.size);
        setBytesTransferred(0);
        setStatus('transferring');
        startTime.current = Date.now();
        return;
      }
    } catch (_) {
      // binary chunk
    }

    // Handle binary chunk
    setIncomingFile((prev) => {
      if (!prev.name || cancelRef.current) return prev;

      const newReceived = prev.received + data.byteLength;
      const newBuffer = [...prev.buffer, data];

      updateStats(newReceived, prev.size);
      setProgress(Math.round((newReceived / prev.size) * 100));

      // ── Transfer Complete ──
      if (newReceived >= prev.size) {
        const blob = new Blob(newBuffer);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = prev.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        logToHistory(prev.name, prev.size, 'RECEIVED');
        setStatus('connected');
        setProgress(0);
        setBytesTransferred(0);
        return { name: '', size: 0, received: 0, buffer: [] };
      }

      return { ...prev, received: newReceived, buffer: newBuffer };
    });
  }, [updateStats, logToHistory]);

  // ── Peer Creator ──────────────────────────────────────
  const createPeer = useCallback((initiator, incomingSignal = null) => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    console.log(`🔗 Creating peer | initiator: ${initiator}`);

    const peer = new Peer({
      initiator,
      trickle: true,
      config: ICE_CONFIG,
    });

    peer.on('signal', (data) => {
      socketRef.current?.emit('signal', {
        roomId: roomIdRef.current,
        signal: data,
      });
    });

    peer.on('connect', () => {
      console.log('🟢 Peer connected');
      setIsPeerConnected(true);
      setStatus('connected');
    });

    peer.on('data', handleData);

    peer.on('close', () => {
      console.log('🔴 Peer closed');
      setIsPeerConnected(false);
      setStatus('waiting');
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err.message);
      setIsPeerConnected(false);
      setStatus('error');
      setRoomError('Connection error. Try reconnecting.');
    });

    if (incomingSignal) peer.signal(incomingSignal);
    peerRef.current = peer;
  }, [handleData]);

  // ── Force Reset ───────────────────────────────────────
  const forceReset = useCallback(() => {
    cancelRef.current = true;

    setStatus('waiting');
    setProgress(0);
    setStats({ speed: '0', timeLeft: '0:00 min' });
    setFileQueue([]);
    setSentFileNames([]);
    setCurrentFileDisplay('');
    setBytesTransferred(0);
    setCurrentFileSize(0);
    setIncomingFile({ name: '', size: 0, received: 0, buffer: [] });

    peerRef.current?.destroy();
    peerRef.current = null;
    setIsPeerConnected(false);

    setTimeout(() => {
      cancelRef.current = false;
      if (roomIdRef.current) createPeer(false);
    }, 1500);
  }, [createPeer]);

  // ── Manual Abort ──────────────────────────────────────
  const handleManualAbort = useCallback(() => {
    socketRef.current?.emit('signal', {
      roomId: roomIdRef.current,
      signal: { type: 'abort-sync' },
    });
    forceReset();
  }, [forceReset]);

  // ── Socket Initialization ─────────────────────────────
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      secure: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setRoomError('');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket error:', err.message);
      setRoomError(
        import.meta.env.PROD
          ? 'Cannot reach server. Please check backend deployment.'
          : 'Cannot reach server'
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Socket Room Listeners ─────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    const onUserJoined = () => {
      console.log('👤 Peer joined → creating offer');
      createPeer(true);
    };

    const onSignal = (data) => {
      if (data?.signal?.type === 'abort-sync') {
        forceReset();
        return;
      }
      const signal = data?.signal ?? data;
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.signal(signal);
      } else if (!cancelRef.current) {
        createPeer(false, signal);
      }
    };

    const onRoomFull = ({ message }) => {
      setRoomError(message ?? 'Room is full');
      setRoomId('');
      setStatus('idle');
    };

    const onRoomJoined = ({ peerCount }) => {
      console.log(`🏠 Room joined | peers: ${peerCount}`);
      setStatus('waiting');
      setRoomError('');
    };

    const onPeerDisconnected = () => {
      console.log('👋 Peer disconnected');
      setIsPeerConnected(false);
      setStatus('waiting');
      createPeer(false);
    };

    socket.on('user-joined', onUserJoined);
    socket.on('signal', onSignal);
    socket.on('room-full', onRoomFull);
    socket.on('room-joined', onRoomJoined);
    socket.on('peer-disconnected', onPeerDisconnected);

    return () => {
      socket.off('user-joined', onUserJoined);
      socket.off('signal', onSignal);
      socket.off('room-full', onRoomFull);
      socket.off('room-joined', onRoomJoined);
      socket.off('peer-disconnected', onPeerDisconnected);
    };
  }, [roomId, createPeer, forceReset]);

  // ── Room Handlers ─────────────────────────────────────
  const initializeRoom = useCallback((user, setActiveTab) => {
    if (!user) {
      setActiveTab('Settings');
      return;
    }
    const id = uuidv4().split('-')[0];
    setRoomId(id);
    setRoomError('');
    socketRef.current?.emit('join-room', id);
  }, []);

  const joinRoom = useCallback((joinId, user) => {
    if (!user || !joinId?.trim()) return;
    const id = joinId.trim();
    setRoomId(id);
    setRoomError('');
    socketRef.current?.emit('join-room', id);
  }, []);

  // ── File Sender ───────────────────────────────────────
  const sendFiles = useCallback(async () => {
    if (!fileQueue.length || !peerRef.current || !isPeerConnected) return;

    setStatus('transferring');
    cancelRef.current = false;
    startTime.current = Date.now();
    setSentFileNames([]);

    for (let i = 0; i < fileQueue.length; i++) {
      const file = fileQueue[i];
      if (cancelRef.current) break;

      setCurrentFileDisplay(file.name);
      setCurrentFileIndex(i + 1);
      setCurrentFileSize(file.size);
      setBytesTransferred(0);
      setProgress(0);
      startTime.current = Date.now();

      // Send metadata
      peerRef.current.send(JSON.stringify({
        type: 'metadata',
        name: file.name,
        size: file.size,
        mimeType: file.type,
      }));

      // Small delay for metadata to arrive
      await new Promise((r) => setTimeout(r, 100));

      let offset = 0;

      // Send chunks
      while (offset < file.size) {
        if (cancelRef.current || !peerRef.current?.connected) break;

        // Backpressure check
        if (peerRef.current._channel?.bufferedAmount > MAX_BUFFER) {
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const chunk = await slice.arrayBuffer();

        peerRef.current.send(chunk);
        offset += chunk.byteLength;

        updateStats(offset, file.size);
        setProgress(Math.round((offset / file.size) * 100));
      }

      if (!cancelRef.current) {
        logToHistory(file.name, file.size, 'SENT');
        setSentFileNames((prev) => [...prev, file.name]);
      }
    }

    if (!cancelRef.current) {
      setStatus('connected');
      setFileQueue([]);
      setSentFileNames([]);
      setProgress(0);
    }
  }, [fileQueue, isPeerConnected, updateStats, logToHistory]);

  // ── Cleanup on Unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(errorTimer.current);
      peerRef.current?.destroy();
    };
  }, []);

  // ── Return API ────────────────────────────────────────
  return {
    // Connection
    roomId,
    isPeerConnected,
    status,
    roomError,

    // Transfer
    fileQueue,
    setFileQueue,
    progress,
    stats,
    currentFileDisplay,
    currentFileIndex,
    totalFiles: fileQueue.length,
    bytesTransferred,
    currentFileSize,
    incomingFile,
    sentFileNames,

    // History
    history,
    setHistory,

    // Actions
    initializeRoom,
    joinRoom,
    sendFiles,
    handleManualAbort,
  };
};