// Test script to verify logo changes
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Auth from '@/pages/Auth'

describe('Logo Update Test', () => {
  it('should display the new abaicon.png logo', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    )
    
    // Check if the new logo is being used - get all logos and verify they use the new image
    const logos = screen.getAllByAltText('Luvbee Logo')
    expect(logos.length).toBeGreaterThan(0)
    
    logos.forEach(logo => {
      expect(logo).toHaveAttribute('src', '/abaicon.png')
      expect(logo).toHaveClass('object-contain')
    })
  })
  
  it('should maintain proper dimensions', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    )
    
    const logos = screen.getAllByAltText('Luvbee Logo')
    logos.forEach(logo => {
      expect(logo).toHaveClass('w-12 h-12 object-contain')
    })
  })
})