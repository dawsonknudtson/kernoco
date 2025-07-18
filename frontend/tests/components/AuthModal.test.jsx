import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthModal from '../../components/AuthModal'

// Mock Supabase
const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn()
  }
}

jest.mock('../../lib/supabase', () => ({
  __esModule: true,
  default: mockSupabase
}))

describe('AuthModal Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess
  }

  test('renders login form by default', () => {
    render(<AuthModal {...defaultProps} />)
    
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  test('switches to signup form when clicking signup link', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    
    const signupLink = screen.getByText(/don't have an account/i).closest('button') || 
                      screen.getByText(/sign up/i)
    
    await user.click(signupLink)
    
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument()
  })

  test('handles successful login', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: testUtils.createMockUser() },
      error: null
    })

    render(<AuthModal {...defaultProps} />)
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  test('handles login error', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' }
    })

    render(<AuthModal {...defaultProps} />)
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  test('handles successful signup', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: testUtils.createMockUser() },
      error: null
    })

    render(<AuthModal {...defaultProps} />)
    
    // Switch to signup form
    const signupLink = screen.getByText(/don't have an account/i).closest('button') || 
                      screen.getByText(/sign up/i)
    await user.click(signupLink)
    
    await user.type(screen.getByPlaceholderText(/full name/i), 'Test User')
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  test('handles signup error', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' }
    })

    render(<AuthModal {...defaultProps} />)
    
    // Switch to signup form
    const signupLink = screen.getByText(/don't have an account/i).closest('button') || 
                      screen.getByText(/sign up/i)
    await user.click(signupLink)
    
    await user.type(screen.getByPlaceholderText(/full name/i), 'Test User')
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  })

  test('validates required fields', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should show validation errors or prevent submission
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  test('closes modal when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    
    const closeButton = screen.getByRole('button', { name: /close/i }) ||
                       screen.getByText('×')
    
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  test('does not render when isOpen is false', () => {
    render(<AuthModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  test('shows loading state during authentication', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<AuthModal {...defaultProps} />)
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Should show loading state
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })
})
