import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Landing from '../../components/landing'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/',
    query: {},
    asPath: '/'
  })
}))

describe('Landing Component', () => {
  const mockOnAuthRequired = jest.fn()
  const mockOnCreateMeeting = jest.fn()
  const mockOnJoinMeeting = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    user: null,
    onAuthRequired: mockOnAuthRequired,
    onCreateMeeting: mockOnCreateMeeting,
    onJoinMeeting: mockOnJoinMeeting
  }

  test('renders landing page with main sections', () => {
    render(<Landing {...defaultProps} />)
    
    expect(screen.getByText(/kernoco/i)).toBeInTheDocument()
    expect(screen.getByText(/video conferencing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  test('shows sign in button when user is not authenticated', () => {
    render(<Landing {...defaultProps} />)
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  test('shows user menu when user is authenticated', () => {
    const authenticatedUser = testUtils.createMockUser()
    render(<Landing {...defaultProps} user={authenticatedUser} />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create meeting/i })).toBeInTheDocument()
  })

  test('handles sign in button click', async () => {
    const user = userEvent.setup()
    render(<Landing {...defaultProps} />)
    
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(signInButton)
    
    expect(mockOnAuthRequired).toHaveBeenCalled()
  })

  test('handles get started button click when not authenticated', async () => {
    const user = userEvent.setup()
    render(<Landing {...defaultProps} />)
    
    const getStartedButton = screen.getByRole('button', { name: /get started/i })
    await user.click(getStartedButton)
    
    expect(mockOnAuthRequired).toHaveBeenCalled()
  })

  test('handles create meeting button click when authenticated', async () => {
    const user = userEvent.setup()
    const authenticatedUser = testUtils.createMockUser()
    render(<Landing {...defaultProps} user={authenticatedUser} />)
    
    const createMeetingButton = screen.getByRole('button', { name: /create meeting/i })
    await user.click(createMeetingButton)
    
    expect(mockOnCreateMeeting).toHaveBeenCalled()
  })

  test('handles join meeting with meeting ID', async () => {
    const user = userEvent.setup()
    const authenticatedUser = testUtils.createMockUser()
    render(<Landing {...defaultProps} user={authenticatedUser} />)
    
    const meetingIdInput = screen.getByPlaceholderText(/meeting id/i)
    const joinButton = screen.getByRole('button', { name: /join meeting/i })
    
    await user.type(meetingIdInput, 'test-meeting-123')
    await user.click(joinButton)
    
    expect(mockOnJoinMeeting).toHaveBeenCalledWith('test-meeting-123')
  })

  test('prevents joining meeting with empty ID', async () => {
    const user = userEvent.setup()
    const authenticatedUser = testUtils.createMockUser()
    render(<Landing {...defaultProps} user={authenticatedUser} />)
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i })
    await user.click(joinButton)
    
    expect(mockOnJoinMeeting).not.toHaveBeenCalled()
    expect(screen.getByText(/please enter a meeting id/i)).toBeInTheDocument()
  })

  test('displays features section', () => {
    render(<Landing {...defaultProps} />)
    
    expect(screen.getByText(/features/i)).toBeInTheDocument()
    expect(screen.getByText(/hd video/i)).toBeInTheDocument()
    expect(screen.getByText(/screen sharing/i)).toBeInTheDocument()
    expect(screen.getByText(/recording/i)).toBeInTheDocument()
  })

  test('displays how it works section', () => {
    render(<Landing {...defaultProps} />)
    
    expect(screen.getByText(/how it works/i)).toBeInTheDocument()
    expect(screen.getByText(/create or join/i)).toBeInTheDocument()
    expect(screen.getByText(/invite participants/i)).toBeInTheDocument()
    expect(screen.getByText(/start meeting/i)).toBeInTheDocument()
  })

  test('handles navigation to dashboard', async () => {
    const user = userEvent.setup()
    const authenticatedUser = testUtils.createMockUser()
    render(<Landing {...defaultProps} user={authenticatedUser} />)
    
    const dashboardButton = screen.getByRole('button', { name: /dashboard/i })
    await user.click(dashboardButton)
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  test('shows recent meetings for authenticated users', () => {
    const authenticatedUser = testUtils.createMockUser()
    const recentMeetings = [
      testUtils.createMockMeeting(),
      { ...testUtils.createMockMeeting(), id: 'meeting-2', title: 'Another Meeting' }
    ]
    
    render(<Landing {...defaultProps} user={authenticatedUser} recentMeetings={recentMeetings} />)
    
    expect(screen.getByText(/recent meetings/i)).toBeInTheDocument()
    expect(screen.getByText('Test Meeting')).toBeInTheDocument()
    expect(screen.getByText('Another Meeting')).toBeInTheDocument()
  })

  test('handles quick join from recent meetings', async () => {
    const user = userEvent.setup()
    const authenticatedUser = testUtils.createMockUser()
    const recentMeetings = [testUtils.createMockMeeting()]
    
    render(<Landing {...defaultProps} user={authenticatedUser} recentMeetings={recentMeetings} />)
    
    const quickJoinButton = screen.getByRole('button', { name: /join/i })
    await user.click(quickJoinButton)
    
    expect(mockOnJoinMeeting).toHaveBeenCalledWith('test-meeting-id')
  })

  test('displays footer with links', () => {
    render(<Landing {...defaultProps} />)
    
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument()
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument()
    expect(screen.getByText(/support/i)).toBeInTheDocument()
  })

  test('handles responsive design elements', () => {
    render(<Landing {...defaultProps} />)
    
    // Check for mobile menu button (usually hidden on desktop)
    const mobileMenuButton = screen.queryByRole('button', { name: /menu/i })
    // This might not be visible depending on screen size
    expect(mobileMenuButton).toBeInTheDocument()
  })

  test('shows loading state during authentication check', () => {
    render(<Landing {...defaultProps} isLoading={true} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('handles error states gracefully', () => {
    render(<Landing {...defaultProps} error="Failed to load user data" />)
    
    expect(screen.getByText(/failed to load user data/i)).toBeInTheDocument()
  })
})
