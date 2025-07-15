const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const meetings = new Map();
const activeMeetings = new Map();
const recordings = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

router.post('/create', async (req, res) => {
  try {
    const { title, description, scheduledTime, createdBy } = req.body;
    
    const meetingId = uuidv4();
    const meeting = {
      id: meetingId,
      title,
      description,
      scheduledTime,
      createdBy,
      createdAt: new Date().toISOString(),
      status: 'scheduled',
      participants: [],
      roomId: uuidv4()
    };
    
    meetings.set(meetingId, meeting);
    
    res.status(201).json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledTime: meeting.scheduledTime,
        roomId: meeting.roomId
      }
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create meeting' 
    });
  }
});

router.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledTime: meeting.scheduledTime,
        status: meeting.status,
        roomId: meeting.roomId,
        participantCount: meeting.participants.length
      }
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch meeting' 
    });
  }
});

router.post('/:meetingId/join', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId, userName } = req.body;
    
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    const existingParticipant = meeting.participants.find(p => p.userId === userId);
    if (!existingParticipant) {
      meeting.participants.push({
        userId,
        userName,
        joinedAt: new Date().toISOString()
      });
    }
    
    if (meeting.status === 'scheduled' && meeting.participants.length === 1) {
      meeting.status = 'active';
      activeMeetings.set(meetingId, meeting);
    }
    
    res.json({
      success: true,
      roomId: meeting.roomId,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        status: meeting.status,
        participantCount: meeting.participants.length
      }
    });
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to join meeting' 
    });
  }
});

router.post('/:meetingId/leave', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId } = req.body;
    
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    meeting.participants = meeting.participants.filter(p => p.userId !== userId);
    
    if (meeting.participants.length === 0) {
      meeting.status = 'ended';
      activeMeetings.delete(meetingId);
    }
    
    res.json({
      success: true,
      message: 'Left meeting successfully'
    });
  } catch (error) {
    console.error('Error leaving meeting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to leave meeting' 
    });
  }
});

router.get('/active/all', async (req, res) => {
  try {
    const activeMeetingsList = Array.from(activeMeetings.values()).map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      participantCount: meeting.participants.length,
      status: meeting.status
    }));
    
    res.json({
      success: true,
      meetings: activeMeetingsList
    });
  } catch (error) {
    console.error('Error fetching active meetings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active meetings' 
    });
  }
});

// Recording endpoints
router.post('/recording/save', upload.single('recording'), async (req, res) => {
  try {
    console.log('Recording save request received:', {
      body: req.body,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });

    const { meetingId, duration, title } = req.body;
    
    if (!req.file) {
      console.error('No recording file provided in request');
      return res.status(400).json({
        success: false,
        error: 'No recording file provided'
      });
    }

    const recording = {
      id: uuidv4(),
      meetingId,
      filename: req.file.filename,
      originalname: req.file.originalname,
      filepath: req.file.path,
      size: req.file.size,
      duration: parseInt(duration) || 0,
      title: title || 'Untitled Meeting',
      createdAt: new Date().toISOString(),
      mimetype: req.file.mimetype
    };

    console.log('Created recording object:', recording);
    
    recordings.set(recording.id, recording);
    console.log('Recordings map now has', recordings.size, 'recordings');
    
    // Update meeting with recording info
    const meeting = meetings.get(meetingId);
    if (meeting) {
      if (!meeting.recordings) {
        meeting.recordings = [];
      }
      meeting.recordings.push(recording.id);
      console.log('Updated meeting with recording ID:', meetingId);
    } else {
      console.log('Meeting not found:', meetingId);
    }

    const response = {
      success: true,
      recording: {
        id: recording.id,
        meetingId: recording.meetingId,
        title: recording.title,
        duration: recording.duration,
        createdAt: recording.createdAt,
        size: recording.size
      }
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save recording' 
    });
  }
});

router.get('/recordings', async (req, res) => {
  try {
    console.log('Fetching recordings... Current recordings count:', recordings.size);
    
    const recordingsList = Array.from(recordings.values()).map(recording => ({
      id: recording.id,
      meetingId: recording.meetingId,
      title: recording.title,
      duration: recording.duration,
      createdAt: recording.createdAt,
      size: recording.size
    }));
    
    console.log('Returning recordings:', recordingsList);
    
    res.json({
      success: true,
      recordings: recordingsList
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recordings' 
    });
  }
});

router.get('/recording/:recordingId/download', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = recordings.get(recordingId);
    
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }
    
    if (!fs.existsSync(recording.filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Recording file not found'
      });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${recording.originalname}"`);
    res.setHeader('Content-Type', recording.mimetype);
    
    const fileStream = fs.createReadStream(recording.filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download recording' 
    });
  }
});

module.exports = router; 