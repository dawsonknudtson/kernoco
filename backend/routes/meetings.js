const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const RecordingManager = require('../utils/recordingManager');
const router = express.Router();

// In-memory storage for meetings (in production, use a database)
const meetings = new Map();
const activeMeetings = new Map();

// Initialize recording manager
const recordingManager = new RecordingManager();

// In-memory storage for recordings (in production, use Supabase)
const recordings = new Map();

// Create a new meeting
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

// Get meeting details
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

// Join meeting endpoint
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
    
    // Add participant if not already present
    const existingParticipant = meeting.participants.find(p => p.userId === userId);
    if (!existingParticipant) {
      meeting.participants.push({
        userId,
        userName,
        joinedAt: new Date().toISOString()
      });
    }
    
    // Mark meeting as active if it's the first participant
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

// Leave meeting endpoint
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
    
    // Remove participant
    meeting.participants = meeting.participants.filter(p => p.userId !== userId);
    
    // End meeting if no participants left
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

// Get all active meetings
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

// Start recording for a meeting
router.post('/:meetingId/recordings/start', async (req, res) => {
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

    // Check if meeting is active
    if (meeting.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Can only record active meetings'
      });
    }

    const result = await recordingManager.startRecording(meetingId);
    
    if (result.success) {
      // Store recording metadata with complete meeting information
      const recordingData = {
        id: result.recordingId,
        meetingId,
        filename: result.filename,
        status: result.status,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        meetingTitle: meeting.title,
        meetingDescription: meeting.description,
        scheduledTime: meeting.scheduledTime,
        actualStartTime: new Date().toISOString(),
        participants: meeting.participants.map(p => p.userName),
        participantCount: meeting.participants.length
      };
      
      recordings.set(result.recordingId, recordingData);
      
      // Update meeting with recording info
      meeting.recordingId = result.recordingId;
      meeting.isRecording = true;
      meeting.actualStartTime = new Date().toISOString();
    }

    res.json(result);
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start recording' 
    });
  }
});

// Stop recording for a meeting
router.post('/:meetingId/recordings/stop', async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = meetings.get(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    const result = await recordingManager.stopRecording(meetingId);
    
    if (result.success) {
      // Update recording metadata with complete meeting information
      const recordingData = recordings.get(result.recordingId);
      if (recordingData) {
        recordingData.status = result.status;
        recordingData.duration = result.duration;
        recordingData.fileSize = result.fileSize;
        recordingData.completedAt = new Date().toISOString();
        recordingData.meetingTitle = meeting.title;
        recordingData.meetingDescription = meeting.description;
        recordingData.scheduledTime = meeting.scheduledTime;
        recordingData.actualStartTime = meeting.actualStartTime || recordingData.createdAt;
        recordingData.actualEndTime = new Date().toISOString();
        recordingData.participantCount = meeting.participants.length;
      }
      
      // Update meeting status and recording info
      meeting.isRecording = false;
      meeting.status = 'completed';
      meeting.endedAt = new Date().toISOString();
      
      // Move to completed meetings if not already there
      if (!activeMeetings.has(meetingId)) {
        activeMeetings.delete(meetingId);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stop recording' 
    });
  }
});

// Get recording info for a meeting
router.get('/:meetingId/recordings', async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = meetings.get(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Get all recordings for this meeting
    const meetingRecordings = [];
    recordings.forEach((recording, recordingId) => {
      if (recording.meetingId === meetingId) {
        meetingRecordings.push({
          id: recordingId,
          filename: recording.filename,
          status: recording.status,
          duration: recording.duration,
          fileSize: recording.fileSize,
          createdAt: recording.createdAt,
          completedAt: recording.completedAt,
          participants: recording.participants
        });
      }
    });

    res.json({
      success: true,
      recordings: meetingRecordings
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recordings' 
    });
  }
});

// Download recording file
router.get('/recordings/:recordingId/download', async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    const recording = recordings.get(recordingId);
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    const fileResult = await recordingManager.getRecordingFile(recording.filename);
    
    if (!fileResult.success) {
      return res.status(404).json({
        success: false,
        error: fileResult.error
      });
    }

    // Update download count
    recording.downloadCount = (recording.downloadCount || 0) + 1;
    recording.lastDownloadedAt = new Date().toISOString();

    // Set appropriate headers for file download
    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader('Content-Length', fileResult.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(fileResult.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download recording' 
    });
  }
});

// Get all recordings (for meeting history)
router.get('/recordings/history', async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;
    
    // Get all recordings (filter by user if needed)
    const allRecordings = [];
    recordings.forEach((recording, recordingId) => {
      if (!userId || recording.createdBy === userId) {
        const meeting = meetings.get(recording.meetingId);
        allRecordings.push({
          id: recordingId,
          meetingId: recording.meetingId,
          meetingTitle: recording.meetingTitle || (meeting ? meeting.title : 'Unknown Meeting'),
          meetingDescription: recording.meetingDescription || (meeting ? meeting.description : null),
          filename: recording.filename,
          status: recording.status,
          duration: recording.duration,
          fileSize: recording.fileSize,
          createdAt: recording.createdAt,
          completedAt: recording.completedAt,
          actualStartTime: recording.actualStartTime || recording.createdAt,
          actualEndTime: recording.actualEndTime,
          scheduledTime: recording.scheduledTime || (meeting ? meeting.scheduledTime : null),
          participants: recording.participants || [],
          participantCount: recording.participantCount || (recording.participants ? recording.participants.length : 0),
          downloadCount: recording.downloadCount || 0,
          lastDownloadedAt: recording.lastDownloadedAt,
          createdBy: recording.createdBy
        });
      }
    });

    // Sort by creation date (newest first)
    allRecordings.sort((a, b) => new Date(b.actualStartTime || b.createdAt) - new Date(a.actualStartTime || a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecordings = allRecordings.slice(startIndex, endIndex);

    res.json({
      success: true,
      recordings: paginatedRecordings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allRecordings.length,
        totalPages: Math.ceil(allRecordings.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recording history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recording history' 
    });
  }
});

// Delete recording
router.delete('/recordings/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    const recording = recordings.get(recordingId);
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    // Delete the file
    const deleteResult = await recordingManager.deleteRecording(recording.filename);
    
    if (deleteResult.success) {
      // Remove from memory
      recordings.delete(recordingId);
    }

    res.json(deleteResult);
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete recording' 
    });
  }
});

module.exports = router; 