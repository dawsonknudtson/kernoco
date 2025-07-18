// Test setup file
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
process.env.PORT = '3002';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createMockMeeting: () => ({
    title: 'Test Meeting',
    description: 'Test Description',
    scheduledTime: new Date().toISOString(),
    createdBy: 'test-user-id'
  }),
  
  createMockSocket: () => ({
    id: 'test-socket-id',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    broadcast: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    }
  })
};
