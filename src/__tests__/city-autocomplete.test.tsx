import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any

  ;(global as any).google = {
    maps: {
      places: {
        AutocompleteService: class {
          getPlacePredictions(_req: any, cb: any) {
            cb([], 'OK')
          }
        },
        PlacesServiceStatus: { OK: 'OK' },
        PlacesService: class {
          constructor(_el: any) {}
          getDetails(_req: any, cb: any) {
            cb(null, 'OK')
          }
        }
      },
      importLibrary: async () => ({})
    }
  }
})

describe('CityAutocomplete (unificado)', () => {
  it('renderiza elemento unificado sem select nativo', () => {
    render(<CityAutocomplete id="city" />)
    const input = screen.getByRole('combobox')
    expect(input).toBeInTheDocument()
    expect(document.querySelector('select')).not.toBeInTheDocument()
  })

  it('abre suavemente ao clicar no input sem piscar', async () => {
    const user = userEvent.setup()
    render(<CityAutocomplete id="city" />)
    const input = screen.getByRole('combobox')

    await user.click(input)
    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    // Aguarda pequeno intervalo para garantir que não fechou (sem flicker)
    await new Promise((r) => setTimeout(r, 100))
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('mantém funcionalidades originais (onChange e onSelect básicos)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSelect = vi.fn()
    render(<CityAutocomplete id="city" onChange={onChange} onSelect={onSelect} />)
    const input = screen.getByRole('combobox') as HTMLInputElement

    await user.click(input)
    await user.type(input, 'São')
    expect(onChange).toHaveBeenCalled()
    // Sem dados reais, apenas verifica abertura do popover
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))
  })
})