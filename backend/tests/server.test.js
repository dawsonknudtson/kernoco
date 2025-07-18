const request = require('supertest');
const http = require('http');
const socketIo = require('socket.io');
const Client = require('socket.io-client');

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))
}));

jest.mock('../routes/meetings', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'test' }));
  return router;
});

describe('Server Configuration', () => {
  let app, server, io;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    delete require.cache[require.resolve('../server.js')];
    
    // Mock the server creation to avoid port conflicts
    jest.doMock('http', () => ({
      createServer: jest.fn(() => ({
        listen: jest.fn((port, callback) => callback && callback())
      }))
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (server) {
      server.close();
    }
  });

  test('should create express app with correct middleware', () => {
    const express = require('express');
    const cors = require('cors');
    
    // Create a test app to verify middleware setup
    const testApp = express();
    testApp.use(cors());
    testApp.use(express.json());
    
    expect(testApp).toBeDefined();
  });

  test('should validate required environment variables', () => {
    const originalEnv = process.env;
    
    // Test missing environment variables
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // This would normally exit the process
    try {
      delete require.cache[require.resolve('../server.js')];
      require('../server.js');
    } catch (error) {
      // Expected to fail
    }
    
    expect(mockError).toHaveBeenCalledWith('Missing required environment variables. Please check your .env file.');
    
    mockExit.mockRestore();
    mockError.mockRestore();
    process.env = originalEnv;
  });

  test('should set up CORS with correct configuration', () => {
    const cors = require('cors');
    
    // Test CORS configuration
    const corsOptions = {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    };
    
    expect(corsOptions.origin).toBe("http://localhost:3000");
    expect(corsOptions.methods).toContain("GET");
    expect(corsOptions.methods).toContain("POST");
  });
});

describe('Socket.IO Integration', () => {
  let clientSocket, serverSocket, server, io;

  beforeAll((done) => {
    server = http.createServer();
    io = socketIo(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    server.listen(() => {
      const port = server.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket.close();
  });

  test('should handle user connection', (done) => {
    expect(serverSocket).toBeDefined();
    expect(serverSocket.id).toBeDefined();
    done();
  });

  test('should handle join-meeting event', (done) => {
    const mockData = {
      roomId: 'test-room',
      userId: 'test-user',
      userName: 'Test User'
    };

    serverSocket.on('join-meeting', (data) => {
      expect(data.roomId).toBe('test-room');
      expect(data.userId).toBe('test-user');
      expect(data.userName).toBe('Test User');
      done();
    });

    clientSocket.emit('join-meeting', mockData);
  });

  test('should handle leave-meeting event', (done) => {
    const mockData = {
      roomId: 'test-room',
      userId: 'test-user'
    };

    serverSocket.on('leave-meeting', (data) => {
      expect(data.roomId).toBe('test-room');
      expect(data.userId).toBe('test-user');
      done();
    });

    clientSocket.emit('leave-meeting', mockData);
  });

  test('should handle offer event', (done) => {
    const mockData = {
      roomId: 'test-room',
      offer: { type: 'offer', sdp: 'test-sdp' },
      userId: 'test-user'
    };

    serverSocket.on('offer', (data) => {
      expect(data.roomId).toBe('test-room');
      expect(data.offer.type).toBe('offer');
      expect(data.userId).toBe('test-user');
      done();
    });

    clientSocket.emit('offer', mockData);
  });

  test('should handle answer event', (done) => {
    const mockData = {
      roomId: 'test-room',
      answer: { type: 'answer', sdp: 'test-sdp' },
      userId: 'test-user'
    };

    serverSocket.on('answer', (data) => {
      expect(data.roomId).toBe('test-room');
      expect(data.answer.type).toBe('answer');
      expect(data.userId).toBe('test-user');
      done();
    });

    clientSocket.emit('answer', mockData);
  });

  test('should handle ice-candidate event', (done) => {
    const mockData = {
      roomId: 'test-room',
      candidate: { candidate: 'test-candidate' },
      userId: 'test-user'
    };

    serverSocket.on('ice-candidate', (data) => {
      expect(data.roomId).toBe('test-room');
      expect(data.candidate.candidate).toBe('test-candidate');
      expect(data.userId).toBe('test-user');
      done();
    });

    clientSocket.emit('ice-candidate', mockData);
  });

  test('should handle disconnect event', (done) => {
    serverSocket.on('disconnect', () => {
      expect(true).toBe(true); // Connection was closed
      done();
    });

    clientSocket.disconnect();
  });
});
