import { forwardRef } from 'react'
import { useController, UseControllerProps, useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { EmailInput, type EmailInputProps } from '@/components/ui/email-input'
import { safeLog } from '@/lib/safe-log'

export interface FormEmailInputProps extends Omit<EmailInputProps, 'value' | 'onChange' | 'onBlur'> {
  name: string
  control?: UseControllerProps['control']
  rules?: UseControllerProps['rules']
  shouldValidate?: boolean
}

/**
 * Componente de Email Input integrado com React Hook Form
 * 
 * Features:
 * - Validação em tempo real com integração ao react-hook-form
 * - Impede envio de formulário com email inválido
 * - Mensagens de erro claras e específicas
 * - Log de erros para debugging
 */
export const FormEmailInput = forwardRef<HTMLInputElement, FormEmailInputProps>(
  ({ 
    name,
    control,
    rules,
    shouldValidate = true,
    validationOptions,
    onValidationChange,
    ...props 
  }, ref) => {
    const formContext = useFormContext()
    const effectiveControl = control || formContext?.control

    if (!effectiveControl) {
      safeLog('error', 'FormEmailInput deve ser usado dentro de um formulário React Hook Form ou com control prop')
      // Em vez de retornar null, vamos renderizar um input básico para não quebrar a UI
      return (
        <EmailInput
          ref={ref}
          {...props}
          error={props.error || 'Erro: FormEmailInput precisa de contexto de formulário'}
          className={cn('border-destructive', props.className)}
        />
      )
    }

    const {
      field,
      fieldState: { error, invalid }
    } = useController({
      name,
      control: effectiveControl,
      rules: shouldValidate ? {
        required: 'Email é obrigatório',
        pattern: {
          value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
          message: 'Email inválido'
        },
        validate: {
          emailFormat: (value) => {
            if (!value) return true
            
            const email = value.toString().trim().toLowerCase()
            
            // Validações adicionais
            if (!email.includes('@')) {
              const error = 'Email deve conter @'
              safeLog('error', '[AuthService] signUp error', {
                message: `Email address "${email}" is invalid`,
                status: 400,
                code: 'email_address_invalid',
                translated: error
              })
              return error
            }
            
            if (email.length < 5) {
              return 'Email muito curto'
            }
            
            if (email.length > 254) {
              return 'Email muito longo'
            }
            
            const [localPart, domainPart] = email.split('@')
            
            if (!localPart || localPart.length === 0) {
              return 'Parte antes do @ não pode estar vazia'
            }
            
            if (localPart.length > 64) {
              return 'Parte antes do @ muito longa'
            }
            
            if (!domainPart || domainPart.length === 0) {
              return 'Domínio não pode estar vazio'
            }
            
            if (domainPart.length > 255) {
              return 'Domínio muito longo'
            }
            
            if (!domainPart.includes('.')) {
              return 'Domínio deve conter um ponto (ex: .com, .com.br)'
            }
            
            if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
              return 'Domínio não pode começar ou terminar com ponto'
            }
            
            const invalidCharsPattern = /[<>()[\]\\,;:\s@\"]/
            if (invalidCharsPattern.test(localPart)) {
              return 'Caracteres inválidos na parte do email'
            }
            
            const domainParts = domainPart.split('.')
            const tld = domainParts[domainParts.length - 1]
            
            if (tld.length < 2) {
              return 'Domínio deve ter uma extensão válida (ex: .com, .com.br)'
            }
            
            return true
          }
        },
        ...rules
      } : undefined
    })

    const handleValidationChange = (isValid: boolean) => {
      onValidationChange?.(isValid)
      
      // Atualizar o estado do react-hook-form
      if (shouldValidate && effectiveControl) {
        const currentValue = field.value
        if (currentValue && !isValid) {
          // Forçar revalidação
          effectiveControl.trigger(name)
        }
      }
    }

    return (
      <EmailInput
        ref={ref}
        {...props}
        value={field.value}
        onChange={(e) => {
          field.onChange(e)
          props.onChange?.(e)
        }}
        onBlur={(e) => {
          field.onBlur()
          props.onBlur?.(e)
        }}
        error={error?.message || props.error}
        validationOptions={{
          required: rules?.required !== false,
          ...validationOptions
        }}
        onValidationChange={handleValidationChange}
        className={cn(
          invalid && 'border-destructive focus:ring-destructive',
          props.className
        )}
      />
    )
  }
)

FormEmailInput.displayName = 'FormEmailInput'