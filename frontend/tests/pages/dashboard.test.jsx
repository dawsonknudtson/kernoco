import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../pages/dashboard'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard'
  })
}))

// Mock API calls
global.fetch = jest.fn()

describe('Dashboard Page', () => {
  const mockUser = testUtils.createMockUser()

  beforeEach(() => {
    jest.clearAllMocks()
    fetch.mockClear()
  })

  test('renders dashboard with user information', async () => {
    // Mock successful meetings fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: [testUtils.createMockMeeting()]
      })
    })

    render(<Dashboard user={mockUser} />)
    
    expect(screen.getByText(`Welcome, ${mockUser.user_metadata.full_name}`)).toBeInTheDocument()
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
  })

  test('loads and displays meetings list', async () => {
    const mockMeetings = [
      testUtils.createMockMeeting(),
      { ...testUtils.createMockMeeting(), id: 'meeting-2', title: 'Another Meeting' }
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: mockMeetings
      })
    })

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument()
      expect(screen.getByText('Another Meeting')).toBeInTheDocument()
    })
  })

  test('handles create new meeting', async () => {
    const user = userEvent.setup()
    
    // Mock meetings fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, meetings: [] })
    })

    // Mock create meeting
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meeting: testUtils.createMockMeeting()
      })
    })

    render(<Dashboard user={mockUser} />)
    
    const createButton = screen.getByRole('button', { name: /create meeting/i })
    await user.click(createButton)
    
    // Fill in meeting details
    const titleInput = screen.getByPlaceholderText(/meeting title/i)
    const descriptionInput = screen.getByPlaceholderText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create/i })
    
    await user.type(titleInput, 'New Test Meeting')
    await user.type(descriptionInput, 'Test Description')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/meetings/create', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Test Meeting',
          description: 'Test Description',
          scheduledTime: expect.any(String),
          createdBy: mockUser.id
        })
      }))
    })
  })

  test('handles join meeting by ID', async () => {
    const user = userEvent.setup()
    
    // Mock meetings fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, meetings: [] })
    })

    // Mock join meeting
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        roomId: 'test-room-id'
      })
    })

    render(<Dashboard user={mockUser} />)
    
    const meetingIdInput = screen.getByPlaceholderText(/meeting id/i)
    const joinButton = screen.getByRole('button', { name: /join meeting/i })
    
    await user.type(meetingIdInput, 'test-meeting-123')
    await user.click(joinButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/meetings/join', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: 'test-meeting-123',
          userId: mockUser.id,
          userName: mockUser.user_metadata.full_name
        })
      }))
    })
  })

  test('displays meeting statistics', async () => {
    const mockMeetings = [
      { ...testUtils.createMockMeeting(), status: 'completed' },
      { ...testUtils.createMockMeeting(), status: 'scheduled' },
      { ...testUtils.createMockMeeting(), status: 'active' }
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: mockMeetings
      })
    })

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText(/3 total meetings/i)).toBeInTheDocument()
      expect(screen.getByText(/1 completed/i)).toBeInTheDocument()
      expect(screen.getByText(/1 scheduled/i)).toBeInTheDocument()
      expect(screen.getByText(/1 active/i)).toBeInTheDocument()
    })
  })

  test('handles meeting actions (edit, delete, start)', async () => {
    const user = userEvent.setup()
    const mockMeeting = testUtils.createMockMeeting()

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: [mockMeeting]
      })
    })

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText(mockMeeting.title)).toBeInTheDocument()
    })

    // Test start meeting
    const startButton = screen.getByRole('button', { name: /start/i })
    await user.click(startButton)
    
    expect(mockPush).toHaveBeenCalledWith(`/meeting/${mockMeeting.roomId}`)
  })

  test('handles search and filter functionality', async () => {
    const user = userEvent.setup()
    const mockMeetings = [
      testUtils.createMockMeeting(),
      { ...testUtils.createMockMeeting(), id: 'meeting-2', title: 'Important Meeting' }
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: mockMeetings
      })
    })

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument()
      expect(screen.getByText('Important Meeting')).toBeInTheDocument()
    })

    // Test search
    const searchInput = screen.getByPlaceholderText(/search meetings/i)
    await user.type(searchInput, 'Important')
    
    await waitFor(() => {
      expect(screen.getByText('Important Meeting')).toBeInTheDocument()
      expect(screen.queryByText('Test Meeting')).not.toBeInTheDocument()
    })
  })

  test('handles error states', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load meetings/i)).toBeInTheDocument()
    })
  })

  test('redirects to login if user is not authenticated', () => {
    render(<Dashboard user={null} />)
    
    expect(mockReplace).toHaveBeenCalledWith('/auth/login')
  })

  test('handles pagination for large meeting lists', async () => {
    const user = userEvent.setup()
    const mockMeetings = Array.from({ length: 25 }, (_, i) => ({
      ...testUtils.createMockMeeting(),
      id: `meeting-${i}`,
      title: `Meeting ${i + 1}`
    }))

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: mockMeetings
      })
    })

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText('Meeting 1')).toBeInTheDocument()
    })

    // Test pagination
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    expect(screen.getByText('Meeting 21')).toBeInTheDocument()
  })

  test('displays upcoming meetings section', async () => {
    const upcomingMeeting = {
      ...testUtils.createMockMeeting(),
      scheduledTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meetings: [upcomingMeeting]
      })
    })

    render(<Dashboard user={mockUser} />)
    
    await waitFor(() => {
      expect(screen.getByText(/upcoming meetings/i)).toBeInTheDocument()
      expect(screen.getByText(/in 1 hour/i)).toBeInTheDocument()
    })
  })
})
