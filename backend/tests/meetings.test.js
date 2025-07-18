const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Mock dependencies
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

jest.mock('fs');
jest.mock('path');

describe('Meetings Routes', () => {
  let app;
  let meetingsRouter;

  beforeEach(() => {
    // Clear module cache
    delete require.cache[require.resolve('../routes/meetings.js')];
    
    // Create fresh express app
    app = express();
    app.use(express.json());
    
    // Mock fs methods
    fs.existsSync = jest.fn(() => true);
    fs.mkdirSync = jest.fn();
    
    // Mock path methods
    path.join = jest.fn((...args) => args.join('/'));
    path.extname = jest.fn((filename) => '.webm');
    
    // Load the meetings router
    meetingsRouter = require('../routes/meetings.js');
    app.use('/api/meetings', meetingsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /create', () => {
    test('should create a new meeting successfully', async () => {
      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/meetings/create')
        .send(meetingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.meeting).toBeDefined();
      expect(response.body.meeting.id).toBe('mock-uuid-123');
      expect(response.body.meeting.title).toBe('Test Meeting');
      expect(response.body.meeting.status).toBe('scheduled');
      expect(response.body.meeting.roomId).toBeDefined();
    });

    test('should return 400 for missing required fields', async () => {
      const incompleteData = {
        title: 'Test Meeting'
        // Missing description, scheduledTime, createdBy
      };

      const response = await request(app)
        .post('/api/meetings/create')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should handle server errors gracefully', async () => {
      // Mock UUID to throw an error
      const { v4 } = require('uuid');
      v4.mockImplementationOnce(() => {
        throw new Error('UUID generation failed');
      });

      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/meetings/create')
        .send(meetingData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create meeting');
    });
  });

  describe('GET /list', () => {
    test('should return empty list when no meetings exist', async () => {
      const response = await request(app)
        .get('/api/meetings/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meetings).toEqual([]);
    });

    test('should return list of meetings', async () => {
      // First create a meeting
      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      await request(app)
        .post('/api/meetings/create')
        .send(meetingData);

      const response = await request(app)
        .get('/api/meetings/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meetings).toHaveLength(1);
      expect(response.body.meetings[0].title).toBe('Test Meeting');
    });
  });

  describe('GET /:id', () => {
    test('should return meeting details for valid ID', async () => {
      // First create a meeting
      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      await request(app)
        .post('/api/meetings/create')
        .send(meetingData);

      const response = await request(app)
        .get('/api/meetings/mock-uuid-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meeting.id).toBe('mock-uuid-123');
      expect(response.body.meeting.title).toBe('Test Meeting');
    });

    test('should return 404 for non-existent meeting', async () => {
      const response = await request(app)
        .get('/api/meetings/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Meeting not found');
    });
  });

  describe('POST /join', () => {
    test('should join meeting successfully', async () => {
      // First create a meeting
      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      await request(app)
        .post('/api/meetings/create')
        .send(meetingData);

      const joinData = {
        meetingId: 'mock-uuid-123',
        userId: 'user-456',
        userName: 'Test User'
      };

      const response = await request(app)
        .post('/api/meetings/join')
        .send(joinData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.roomId).toBeDefined();
    });

    test('should return 404 for non-existent meeting', async () => {
      const joinData = {
        meetingId: 'non-existent-id',
        userId: 'user-456',
        userName: 'Test User'
      };

      const response = await request(app)
        .post('/api/meetings/join')
        .send(joinData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Meeting not found');
    });

    test('should return 400 for missing required fields', async () => {
      const incompleteData = {
        meetingId: 'mock-uuid-123'
        // Missing userId and userName
      };

      const response = await request(app)
        .post('/api/meetings/join')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /start', () => {
    test('should start meeting successfully', async () => {
      // First create a meeting
      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      await request(app)
        .post('/api/meetings/create')
        .send(meetingData);

      const startData = {
        meetingId: 'mock-uuid-123',
        startedBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/meetings/start')
        .send(startData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meeting.status).toBe('active');
      expect(response.body.meeting.startedAt).toBeDefined();
    });

    test('should return 404 for non-existent meeting', async () => {
      const startData = {
        meetingId: 'non-existent-id',
        startedBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/meetings/start')
        .send(startData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Meeting not found');
    });
  });

  describe('POST /end', () => {
    test('should end meeting successfully', async () => {
      // First create and start a meeting
      const meetingData = {
        title: 'Test Meeting',
        description: 'Test Description',
        scheduledTime: '2024-01-01T10:00:00Z',
        createdBy: 'user-123'
      };

      await request(app)
        .post('/api/meetings/create')
        .send(meetingData);

      await request(app)
        .post('/api/meetings/start')
        .send({ meetingId: 'mock-uuid-123', startedBy: 'user-123' });

      const endData = {
        meetingId: 'mock-uuid-123',
        endedBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/meetings/end')
        .send(endData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meeting.status).toBe('ended');
      expect(response.body.meeting.endedAt).toBeDefined();
    });

    test('should return 404 for non-existent meeting', async () => {
      const endData = {
        meetingId: 'non-existent-id',
        endedBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/meetings/end')
        .send(endData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Meeting not found');
    });
  });

  describe('POST /recording/save', () => {
    test('should handle recording save with missing file', async () => {
      const recordingData = {
        meetingId: 'mock-uuid-123',
        recordingId: 'recording-123'
      };

      const response = await request(app)
        .post('/api/meetings/recording/save')
        .send(recordingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No recording file provided');
    });
  });

  describe('GET /recording/:recordingId', () => {
    test('should return 404 for non-existent recording', async () => {
      const response = await request(app)
        .get('/api/meetings/recording/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recording not found');
    });
  });

  describe('GET /recordings/:meetingId', () => {
    test('should return empty list for meeting with no recordings', async () => {
      const response = await request(app)
        .get('/api/meetings/recordings/mock-uuid-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recordings).toEqual([]);
    });
  });
});
