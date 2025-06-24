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

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import routes
const meetingRoutes = require('./routes/meetings');
const RecordingManager = require('./utils/recordingManager');

// Initialize recording manager
const recordingManager = new RecordingManager();

// Use routes
app.use('/api/meetings', meetingRoutes);

// WebSocket connection handling
const connectedUsers = new Map();
const meetingRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins a meeting room
  socket.on('join-meeting', async (data) => {
    const { roomId, userId, userName } = data;
    
    socket.join(roomId);
    
    // Store user info
    connectedUsers.set(socket.id, { userId, userName, roomId });
    
    // Add to meeting room tracking
    if (!meetingRooms.has(roomId)) {
      meetingRooms.set(roomId, new Set());
    }
    const wasEmpty = meetingRooms.get(roomId).size === 0;
    meetingRooms.get(roomId).add(socket.id);
    
    // Start recording if this is the first participant
    if (wasEmpty) {
      try {
        const recordingResult = await recordingManager.startRecording(roomId);
        if (recordingResult.success) {
          io.to(roomId).emit('recording-started', {
            recordingId: recordingResult.recordingId,
            filename: recordingResult.filename,
            startedBy: 'system'
          });
          console.log(`Recording started automatically for room ${roomId}`);
        }
      } catch (error) {
        console.error('Error starting automatic recording:', error);
        io.to(roomId).emit('recording-error', {
          error: 'Failed to start recording',
          message: 'Recording could not be started for this meeting'
        });
      }
    }
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      userId,
      userName,
      socketId: socket.id
    });
    
    // Send current participants to the new user
    const roomParticipants = Array.from(meetingRooms.get(roomId))
      .map(socketId => connectedUsers.get(socketId))
      .filter(Boolean);
    
    socket.emit('room-participants', roomParticipants);
    
    console.log(`User ${userName} joined room ${roomId}`);
  });

  // Handle WebRTC signaling
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

  // Handle chat messages
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

  // Handle media state changes
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

  // Handle disconnect
  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const { roomId, userId, userName } = user;
      
      // Remove from meeting room
      if (meetingRooms.has(roomId)) {
        meetingRooms.get(roomId).delete(socket.id);
        
        // Stop recording if this was the last participant
        if (meetingRooms.get(roomId).size === 0) {
          try {
            // Call the recording stop endpoint to ensure all metadata is properly stored
            const stopRecordingResponse = await fetch(`http://localhost:3001/api/meetings/${roomId}/recordings/stop`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: 'system'
              })
            });
            
            if (stopRecordingResponse.ok) {
              const recordingResult = await stopRecordingResponse.json();
              if (recordingResult.success) {
                io.to(roomId).emit('recording-stopped', {
                  recordingId: recordingResult.recordingId,
                  filename: recordingResult.filename,
                  duration: recordingResult.duration,
                  fileSize: recordingResult.fileSize,
                  status: recordingResult.status
                });
                console.log(`Recording stopped automatically for room ${roomId}`);
              }
            } else {
              // Fallback to direct recording manager call
              const recordingResult = await recordingManager.stopRecording(roomId);
              if (recordingResult.success) {
                io.to(roomId).emit('recording-stopped', {
                  recordingId: recordingResult.recordingId,
                  filename: recordingResult.filename,
                  duration: recordingResult.duration,
                  fileSize: recordingResult.fileSize,
                  status: recordingResult.status
                });
                console.log(`Recording stopped automatically for room ${roomId}`);
              }
            }
          } catch (error) {
            console.error('Error stopping automatic recording:', error);
            // Try direct recording manager as fallback
            try {
              const recordingResult = await recordingManager.stopRecording(roomId);
              if (recordingResult.success) {
                io.to(roomId).emit('recording-stopped', {
                  recordingId: recordingResult.recordingId,
                  filename: recordingResult.filename,
                  duration: recordingResult.duration,
                  fileSize: recordingResult.fileSize,
                  status: recordingResult.status
                });
              }
            } catch (fallbackError) {
              console.error('Fallback recording stop also failed:', fallbackError);
            }
          }
          
          meetingRooms.delete(roomId);
        }
      }
      
      // Notify others in the room
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

// Google OAuth endpoint
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

    // Return success status with minimal data
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