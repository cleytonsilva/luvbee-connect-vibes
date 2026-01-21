
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '../components/auth/RegisterForm'
import { LoginForm } from '../components/auth/LoginForm'
import { BrowserRouter } from 'react-router-dom'

// Mock Auth Hook
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signIn: mockSignIn,
    isLoading: false,
    error: null,
    user: null
  })
}))

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('User Flow Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('simulates new user registration flow', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    )

    // 1. Fill Registration Form
    const nameInput = screen.getByLabelText(/Full Name/i)
    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/^Password/i)
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i)
    const acceptTermsCheckbox = screen.getByRole('checkbox', { name: /Aceito os/i })
    const submitButton = screen.getByRole('button', { name: /Create Account/i })

    await user.type(nameInput, 'Test User')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(acceptTermsCheckbox)

    // 2. Toggle Password Visibility (Verify it exists)
    // We look for the eye icon button. It's an absolute positioned button inside the relative div.
    const toggleButtons = screen.getAllByRole('button', { hidden: true }).filter(b => b.className.includes('absolute'))
    expect(toggleButtons.length).toBeGreaterThan(0) // Should have toggles for password and confirm

    // 3. Submit
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })
  })

  it('simulates user login flow', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    )

    // 1. Fill Login Form
    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    // 2. Submit
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })
})

