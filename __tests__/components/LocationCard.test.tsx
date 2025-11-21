import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LocationCard } from '@/components/location/LocationCard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } })
}))

vi.mock('@/services/location.service', () => ({
  LocationService: {
    hasLocationMatch: vi.fn(async () => true),
    removeLocationMatch: vi.fn(async () => ({ data: undefined }))
  }
}))

const sampleLocation: any = {
  id: 'loc-123',
  name: 'Local Teste',
  address: 'Rua X, 123',
  rating: 4.5,
  place_id: 'place-abc',
}

describe('LocationCard - botão Desfazer Match', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe o botão em /locations quando há match', async () => {
    const { findByRole } = render(
      <MemoryRouter initialEntries={["/dashboard/locations"]}>
        <LocationCard location={sampleLocation} />
      </MemoryRouter>
    )

    const button = await findByRole('button', { name: /Desfazer Match/i })
    expect(button).toBeInTheDocument()
  })

  it('não exibe o botão em /vibe-local mesmo com match', async () => {
    const { queryByRole } = render(
      <MemoryRouter initialEntries={["/vibe-local"]}>
        <LocationCard location={sampleLocation} />
      </MemoryRouter>
    )

    const button = queryByRole('button', { name: /Desfazer Match/i })
    expect(button).toBeNull()
  })

  it('não exibe o botão quando não há match', async () => {
    const { LocationService } = await import('@/services/location.service') as any
    LocationService.hasLocationMatch.mockResolvedValueOnce(false)

    const { queryByRole } = render(
      <MemoryRouter initialEntries={["/dashboard/locations"]}>
        <LocationCard location={sampleLocation} />
      </MemoryRouter>
    )

    // A verificação roda async, aguardar um ciclo
    await new Promise(r => setTimeout(r, 0))
    const button = queryByRole('button', { name: /Desfazer Match/i })
    expect(button).toBeNull()
  })

  it('ao confirmar, chama removeLocationMatch e oculta o botão', async () => {
    const { LocationService } = await import('@/services/location.service') as any
    const { findByRole, queryByRole } = render(
      <MemoryRouter initialEntries={["/dashboard/locations"]}>
        <LocationCard location={sampleLocation} />
      </MemoryRouter>
    )

    const button = await findByRole('button', { name: /Desfazer Match/i })
    fireEvent.click(button)

    const confirm = await findByRole('button', { name: /Desfazer/i })
    fireEvent.click(confirm)

    expect(LocationService.removeLocationMatch).toHaveBeenCalled()
    // aguardar estado ser atualizado
    await new Promise(r => setTimeout(r, 0))
    expect(queryByRole('button', { name: /Desfazer Match/i })).toBeNull()
  })
})

