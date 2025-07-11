const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3001;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const meetingRoutes = require('./routes/meetings');

app.use('/api/meetings', meetingRoutes);

const connectedUsers = new Map();
const meetingRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-meeting', (data) => {
    const { roomId, userId, userName } = data;
    
    socket.join(roomId);
    
    connectedUsers.set(socket.id, { userId, userName, roomId });
    
    if (!meetingRooms.has(roomId)) {
      meetingRooms.set(roomId, new Set());
    }
    meetingRooms.get(roomId).add(socket.id);
    
    socket.to(roomId).emit('user-joined', {
      userId,
      userName,
      socketId: socket.id
    });
    
    const roomParticipants = Array.from(meetingRooms.get(roomId))
      .map(socketId => connectedUsers.get(socketId))
      .filter(Boolean);
    
    socket.emit('room-participants', roomParticipants);
    
    console.log(`User ${userName} joined room ${roomId}`);
  });

  socket.on('webrtc-offer', (data) => {
    socket.to(data.target).emit('webrtc-offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.target).emit('webrtc-answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.target).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('chat-message', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      io.to(user.roomId).emit('chat-message', {
        message: data.message,
        userName: user.userName,
        userId: user.userId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('media-state-change', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('user-media-state-change', {
        userId: user.userId,
        socketId: socket.id,
        isVideoEnabled: data.isVideoEnabled,
        isAudioEnabled: data.isAudioEnabled
      });
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const { roomId, userId, userName } = user;
      
      if (meetingRooms.has(roomId)) {
        meetingRooms.get(roomId).delete(socket.id);
        if (meetingRooms.get(roomId).size === 0) {
          meetingRooms.delete(roomId);
        }
      }
      
      socket.to(roomId).emit('user-left', {
        userId,
        userName,
        socketId: socket.id
      });
      
      console.log(`User ${userName} left room ${roomId}`);
    }
    
    connectedUsers.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

app.post('/auth/google', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket server ready for connections`);
}); 