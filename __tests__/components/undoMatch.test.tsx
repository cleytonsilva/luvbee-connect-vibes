import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LocationCard } from '@/components/location/LocationCard'

// Mock do hook useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    profile: { location: 'São Paulo, SP' }
  })
}))

// Mock do LocationService
vi.mock('@/services/location.service', () => ({
  LocationService: {
    hasLocationMatch: vi.fn().mockResolvedValue(true),
    removeLocationMatch: vi.fn().mockResolvedValue({ data: undefined })
  }
}))

describe('Desfazer Match Button', () => {
  it('shows confirmation and calls onDislike', async () => {
    const onDislike = vi.fn(async () => {})
    
    render(
      <MemoryRouter initialEntries={['/locations']}>
        <Routes>
          <Route path="/locations" element={<LocationCard location={{ id: 'loc1', name: 'Teste', address: 'Rua', rating: 4, is_verified: false, is_active: true, created_at: '', updated_at: '' } as any} onDislike={onDislike} />} />
        </Routes>
      </MemoryRouter>
    )
    
    // O botão é "Desfazer" e não "Desfazer Match" - usar waitFor para aguardar renderização
    const btn = await waitFor(() => screen.getByText('Desfazer'))
    fireEvent.click(btn)
    
    // Aguardar o diálogo de confirmação aparecer e clicar no segundo botão "Desfazer"
    const confirms = await waitFor(() => screen.getAllByText('Desfazer'))
    fireEvent.click(confirms[1])
    
    expect(onDislike).toHaveBeenCalled()
  })
})

