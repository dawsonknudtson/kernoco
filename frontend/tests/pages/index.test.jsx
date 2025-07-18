import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../../pages/index'

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

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  }
}

jest.mock('../../lib/supabase', () => ({
  __esModule: true,
  default: mockSupabase
}))

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders home page with landing component', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    render(<Home />)
    
    expect(screen.getByText(/kernoco/i)).toBeInTheDocument()
    expect(screen.getByText(/video conferencing/i)).toBeInTheDocument()
  })

  test('shows authenticated state when user is logged in', async () => {
    const mockUser = testUtils.createMockUser()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  test('handles authentication state changes', async () => {
    let authCallback
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    render(<Home />)
    
    // Simulate user login
    const mockUser = testUtils.createMockUser()
    authCallback('SIGNED_IN', mockUser)
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  test('redirects to dashboard when user clicks dashboard button', async () => {
    const user = userEvent.setup()
    const mockUser = testUtils.createMockUser()
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    const dashboardButton = screen.getByRole('button', { name: /dashboard/i })
    await user.click(dashboardButton)
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  test('handles loading state during authentication check', () => {
    mockSupabase.auth.getUser.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<Home />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('handles authentication errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Authentication failed' }
    })

    render(<Home />)
    
    await waitFor(() => {
      // Should still render the landing page even with auth errors
      expect(screen.getByText(/kernoco/i)).toBeInTheDocument()
    })
  })
})
