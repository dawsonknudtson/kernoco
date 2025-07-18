import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MeetingJoinScreen from '../../components/MeetingJoinScreen'

// Mock socket.io-client
const mockSocket = testUtils.createMockSocket()
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => mockSocket)
}))

describe('MeetingJoinScreen Component', () => {
  const mockOnJoin = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset navigator.mediaDevices mock
    navigator.mediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  })

  const defaultProps = {
    meetingId: 'test-meeting-id',
    onJoin: mockOnJoin,
    onCancel: mockOnCancel,
    user: testUtils.createMockUser()
  }

  test('renders meeting join screen with user name input', () => {
    render(<MeetingJoinScreen {...defaultProps} />)
    
    expect(screen.getByText(/join meeting/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  test('shows camera and microphone preview', async () => {
    render(<MeetingJoinScreen {...defaultProps} />)
    
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true
      })
    })
    
    expect(screen.getByTestId('video-preview')).toBeInTheDocument()
  })

  test('handles camera permission denied', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(
      new Error('Permission denied')
    )
    
    render(<MeetingJoinScreen {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/camera access denied/i)).toBeInTheDocument()
    })
  })

  test('toggles camera on/off', async () => {
    const user = userEvent.setup()
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const cameraButton = screen.getByRole('button', { name: /camera/i })
    await user.click(cameraButton)
    
    expect(cameraButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('toggles microphone on/off', async () => {
    const user = userEvent.setup()
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const micButton = screen.getByRole('button', { name: /microphone/i })
    await user.click(micButton)
    
    expect(micButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('handles join meeting with valid name', async () => {
    const user = userEvent.setup()
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const nameInput = screen.getByPlaceholderText(/your name/i)
    const joinButton = screen.getByRole('button', { name: /join/i })
    
    await user.type(nameInput, 'Test User')
    await user.click(joinButton)
    
    expect(mockOnJoin).toHaveBeenCalledWith({
      meetingId: 'test-meeting-id',
      userName: 'Test User',
      userId: 'test-user-id',
      videoEnabled: true,
      audioEnabled: true
    })
  })

  test('prevents joining with empty name', async () => {
    const user = userEvent.setup()
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const joinButton = screen.getByRole('button', { name: /join/i })
    await user.click(joinButton)
    
    expect(mockOnJoin).not.toHaveBeenCalled()
    expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
  })

  test('handles cancel button click', async () => {
    const user = userEvent.setup()
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  test('pre-fills user name from user data', () => {
    const userWithName = {
      ...testUtils.createMockUser(),
      user_metadata: { full_name: 'John Doe' }
    }
    
    render(<MeetingJoinScreen {...defaultProps} user={userWithName} />)
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
  })

  test('shows loading state while joining', async () => {
    const user = userEvent.setup()
    mockOnJoin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const nameInput = screen.getByPlaceholderText(/your name/i)
    const joinButton = screen.getByRole('button', { name: /join/i })
    
    await user.type(nameInput, 'Test User')
    await user.click(joinButton)
    
    expect(joinButton).toBeDisabled()
    expect(screen.getByText(/joining/i)).toBeInTheDocument()
  })

  test('displays meeting information', () => {
    const meeting = testUtils.createMockMeeting()
    render(<MeetingJoinScreen {...defaultProps} meeting={meeting} />)
    
    expect(screen.getByText(meeting.title)).toBeInTheDocument()
    expect(screen.getByText(meeting.description)).toBeInTheDocument()
  })

  test('handles device selection', async () => {
    const user = userEvent.setup()
    
    // Mock multiple devices
    navigator.mediaDevices.enumerateDevices = jest.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Camera 2' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' },
      { deviceId: 'mic2', kind: 'audioinput', label: 'Microphone 2' }
    ])
    
    render(<MeetingJoinScreen {...defaultProps} />)
    
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsButton)
    
    expect(screen.getByText('Camera 1')).toBeInTheDocument()
    expect(screen.getByText('Microphone 1')).toBeInTheDocument()
  })

  test('cleans up media stream on unmount', () => {
    const mockTrack = { stop: jest.fn() }
    const mockStream = { getTracks: () => [mockTrack] }
    
    navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream)
    
    const { unmount } = render(<MeetingJoinScreen {...defaultProps} />)
    
    unmount()
    
    expect(mockTrack.stop).toHaveBeenCalled()
  })
})
