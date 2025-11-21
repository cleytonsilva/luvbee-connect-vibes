// Test for responsive behavior and dark/light mode
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Auth from '@/pages/Auth'

describe('Logo Responsive Behavior Test', () => {
  it('should maintain responsive dimensions', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    )
    
    const logos = screen.getAllByAltText('Luvbee Logo')
    
    logos.forEach(logo => {
      // Check responsive classes
      expect(logo).toHaveClass('object-contain')
      
      // Auth page uses w-12 h-12
      if (logo.parentElement?.closest('h1, h2, h3, h4, h5, h6, .font-display')) {
        expect(logo).toHaveClass('w-12 h-12')
      }
    })
  })
  
  it('should work in both light and dark modes', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    )
    
    const logos = screen.getAllByAltText('Luvbee Logo')
    
    // Should have both light and dark mode variants
    const lightModeLogos = logos.filter(logo => 
      logo.classList.contains('dark:hidden')
    )
    const darkModeLogos = logos.filter(logo => 
      logo.classList.contains('hidden') && logo.classList.contains('dark:block')
    )
    
    expect(lightModeLogos.length).toBeGreaterThan(0)
    expect(darkModeLogos.length).toBeGreaterThan(0)
    
    // Both should use the same new logo
    lightModeLogos.forEach(logo => {
      expect(logo).toHaveAttribute('src', '/abaicon.png')
    })
    darkModeLogos.forEach(logo => {
      expect(logo).toHaveAttribute('src', '/abaicon.png')
    })
  })
  
  it('should be accessible with proper alt text', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    )
    
    const logos = screen.getAllByAltText('Luvbee Logo')
    expect(logos.length).toBeGreaterThan(0)
    
    logos.forEach(logo => {
      expect(logo).toHaveAttribute('alt', 'Luvbee Logo')
    })
  })
})