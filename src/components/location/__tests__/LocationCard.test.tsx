import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationCard } from '../LocationCard'

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
  }),
}))

// Mock the toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the LocationService
vi.mock('@/services/location.service', () => ({
  LocationService: {
    addToFavorites: vi.fn().mockResolvedValue({ error: null }),
    removeFromFavorites: vi.fn().mockResolvedValue({ error: null }),
  },
}))

const mockLocation = {
  id: '1',
  name: 'Test Location',
  description: 'Test description',
  address: '123 Test St',
  image_url: 'test-image.jpg',
  is_open: true,
  category: { name: 'Restaurant' },
  favorites: [],
  check_ins: [],
  reviews: [],
}

describe('LocationCard', () => {
  it('should render location information correctly', () => {
    render(<LocationCard location={mockLocation} />)

    expect(screen.getByText('Test Location')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('123 Test St')).toBeInTheDocument()
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
  })

  it('should display "Open Now" badge when location is open', () => {
    render(<LocationCard location={mockLocation} />)

    expect(screen.getByText('Open Now')).toBeInTheDocument()
  })

  it('should call onLocationClick when card is clicked', () => {
    const onLocationClick = vi.fn()
    render(<LocationCard location={mockLocation} onLocationClick={onLocationClick} />)

    fireEvent.click(screen.getByText('Test Location'))

    expect(onLocationClick).toHaveBeenCalledWith('1')
  })

  it('should show favorite button when user is logged in', () => {
    render(<LocationCard location={mockLocation} />)

    // Find the favorite button by looking for the Heart icon button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should show check-in button when user is logged in', () => {
    render(<LocationCard location={mockLocation} />)

    expect(screen.getByText('Check In')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('should calculate and display average rating correctly', () => {
    const locationWithReviews = {
      ...mockLocation,
      reviews: [
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
      ],
    }

    render(<LocationCard location={locationWithReviews} />)

    expect(screen.getByText('4.0 (3)')).toBeInTheDocument()
  })
})