const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const meetings = new Map();
const activeMeetings = new Map();

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

module.exports = router; 