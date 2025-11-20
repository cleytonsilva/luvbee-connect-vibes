import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Auth from '../pages/Auth'

// Mock ResizeObserver for Radix UI components
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Mock do useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    isLoading: false,
    error: null,
    user: null,
    clearError: vi.fn()
  })
}))

// Mock do UserService
vi.mock('../services/user.service', () => ({
  UserService: {
    hasCompletedOnboarding: vi.fn().mockResolvedValue(false)
  }
}))

describe('Auth Page', () => {
  it('should render email field in login form', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    )
    
    // Verificar se o campo de email está presente no formulário de login
    const emailInput = screen.getByLabelText('E-mail')
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('id', 'login-email')
  })

  it('should render email field in signup form', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    )
    
    // Mudar para a aba de cadastro
    const signupTab = screen.getByRole('tab', { name: 'Criar Conta' })
    await user.click(signupTab)
    
    // Aguardar a aba de cadastro ficar visível
    await waitFor(() => {
      // Verificar se o campo de email está presente no formulário de cadastro
      const signupEmailInput = screen.getByLabelText('E-mail')
      expect(signupEmailInput).toBeInTheDocument()
      expect(signupEmailInput).toHaveAttribute('type', 'email')
      expect(signupEmailInput).toHaveAttribute('id', 'signup-email')
    })
  })

  it('should render password field in login form', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    )
    
    // Verificar se o campo de senha está presente
    const passwordInput = screen.getByLabelText('Senha')
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('id', 'login-password')
  })

  it('should render all required fields in signup form', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    )
    
    // Mudar para a aba de cadastro
    const signupTab = screen.getByRole('tab', { name: 'Criar Conta' })
    await user.click(signupTab)
    
    // Aguardar a aba de cadastro ficar visível e verificar todos os campos necessários
    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
      expect(screen.getByLabelText('Senha')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirmar Senha')).toBeInTheDocument()
      expect(screen.getByLabelText(/Termos de Uso/i)).toBeInTheDocument()
    })
  })
})