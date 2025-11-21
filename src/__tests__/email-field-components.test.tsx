import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmailInput } from '../components/ui/email-input'
import { FormEmailInput } from '../components/ui/form-email-input'
import { FormProvider, useForm } from 'react-hook-form'

describe('Email Field Components', () => {
  describe('EmailInput', () => {
    it('should render email input with label', () => {
      render(<EmailInput id="test-email" label="Test Email" />)
      
      const input = screen.getByLabelText('Test Email')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render email input with placeholder', () => {
      render(<EmailInput id="test-email" placeholder="Enter your email" />)
      
      const input = screen.getByPlaceholderText('Enter your email')
      expect(input).toBeInTheDocument()
    })

    it('should show error message when provided', () => {
      const errorMessage = 'Email inválido'
      render(<EmailInput id="test-email" error={errorMessage} />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  describe('FormEmailInput', () => {
    const TestForm = ({ children }: { children: React.ReactNode }) => {
      const methods = useForm({
        defaultValues: {
          email: ''
        }
      })
      
      return (
        <FormProvider {...methods}>
          <form>{children}</form>
        </FormProvider>
      )
    }

    it('should render within form context', () => {
      render(
        <TestForm>
          <FormEmailInput name="email" id="form-email" label="Form Email" />
        </TestForm>
      )
      
      const input = screen.getByLabelText('Form Email')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render with validation options', () => {
      render(
        <TestForm>
          <FormEmailInput 
            name="email" 
            id="form-email" 
            label="Email with Validation"
            validationOptions={{ required: true }}
          />
        </TestForm>
      )
      
      const input = screen.getByLabelText('Email with Validation')
      expect(input).toBeInTheDocument()
    })
  })
})