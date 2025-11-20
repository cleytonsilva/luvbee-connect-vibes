import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationCard } from '@/components/location/LocationCard'

describe('Desfazer Match Button', () => {
  it('shows confirmation and calls onDislike', async () => {
    const onDislike = vi.fn(async () => {})
    render(<LocationCard location={{ id: 'loc1', name: 'Teste', address: 'Rua', rating: 4, is_verified: false, is_active: true, created_at: '', updated_at: '' } as any} onDislike={onDislike} />)
    const btn = await screen.findByText('Desfazer Match')
    fireEvent.click(btn)
    const confirm = await screen.findByText('Desfazer')
    fireEvent.click(confirm)
    expect(onDislike).toHaveBeenCalled()
  })
})

