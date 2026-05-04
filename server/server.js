const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Room tracking
const rooms = new Map();
// Structure: roomId -> { peers: Set(socketIds), createdAt: Date }

// ICE servers endpoint
app.get('/ice-servers', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN server here for production
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'user',
      //   credential: 'password'
      // }
    ]
  });
});

// Room info endpoint
app.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.json({ exists: false, peerCount: 0 });
  }
  
  res.json({
    exists: true,
    peerCount: room.peers.size,
    isFull: room.peers.size >= 2
  });
});

io.on('connection', (socket) => {
  console.log(`✅ User Connected: ${socket.id}`);

  // Join room with validation
  socket.on('join-room', (roomId) => {
    try {
      // Validate roomId
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }

      // Sanitize roomId
      const sanitizedRoomId = roomId.trim().slice(0, 50);

      // Check room capacity
      if (!rooms.has(sanitizedRoomId)) {
        rooms.set(sanitizedRoomId, {
          peers: new Set(),
          createdAt: new Date()
        });
      }

      const room = rooms.get(sanitizedRoomId);

      // Max 2 peers per room
      if (room.peers.size >= 2) {
        socket.emit('room-full', { 
          message: 'Room is full. Maximum 2 peers allowed.' 
        });
        return;
      }

      // Join the room
      socket.join(sanitizedRoomId);
      room.peers.add(socket.id);
      socket.roomId = sanitizedRoomId; // Store for cleanup

      console.log(`👥 User ${socket.id} joined room: ${sanitizedRoomId} (${room.peers.size}/2 peers)`);

      // Notify others in room
      socket.to(sanitizedRoomId).emit('user-joined', {
        peerId: socket.id,
        peerCount: room.peers.size
      });

      // Confirm join to socket
      socket.emit('room-joined', {
        roomId: sanitizedRoomId,
        peerCount: room.peers.size,
        isInitiator: room.peers.size === 1
      });

    } catch (err) {
      console.error('Join room error:', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Signal relay with validation
  socket.on('signal', (data) => {
    try {
      // Validate signal data
      if (!data || !data.roomId || !data.signal) {
        return;
      }

      // Verify socket is in that room
      if (!socket.rooms.has(data.roomId)) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }

      // Relay signal to other peer
      socket.to(data.roomId).emit('signal', {
        signal: data.signal,
        peerId: socket.id
      });

    } catch (err) {
      console.error('Signal error:', err);
    }
  });

  // Transfer progress tracking (optional)
  socket.on('transfer-progress', (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit('transfer-progress', {
      progress: data.progress,
      speed: data.speed,
      fileName: data.fileName
    });
  });

  // Transfer complete notification
  socket.on('transfer-complete', (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit('transfer-complete', {
      fileName: data.fileName,
      fileSize: data.fileSize
    });
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    console.log(`❌ User Disconnected: ${socket.id}`);

    // Clean up room
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.peers.delete(socket.id);
        
        // Notify remaining peer
        socket.to(socket.roomId).emit('peer-disconnected', {
          peerId: socket.id
        });

        // Delete empty room
        if (room.peers.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`🗑️ Room ${socket.roomId} deleted (empty)`);
        }
      }
    }
  });
});

// Room cleanup - delete rooms older than 1 hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  rooms.forEach((room, roomId) => {
    if (room.createdAt < oneHourAgo && room.peers.size === 0) {
      rooms.delete(roomId);
      console.log(`🧹 Cleaned up stale room: ${roomId}`);
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is in use. Try another port.`);
  } else {
    console.error('❌ Server Error:', err);
  }
});