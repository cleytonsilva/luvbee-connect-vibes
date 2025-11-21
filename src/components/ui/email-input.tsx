import { forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEmailValidation } from '@/hooks/useEmailValidation'
import type { EmailValidationOptions } from '@/hooks/useEmailValidation'

export interface EmailInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  containerClassName?: string
  validationOptions?: EmailValidationOptions
  onValidationChange?: (isValid: boolean) => void
  showValidationIcons?: boolean
  debounceMs?: number
}

/**
 * Componente de Input de Email com validação em tempo real
 * 
 * Features:
 * - Validação instantânea com debounce
 * - Mensagens de erro claras e específicas
 * - Ícones visuais de validação
 * - Acessibilidade aprimorada
 * - Responsividade total
 */
export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ 
    label = 'Email',
    error: externalError,
    containerClassName,
    validationOptions,
    onValidationChange,
    showValidationIcons = true,
    debounceMs = 300,
    className,
    onChange,
    onBlur,
    value,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState(value || '')
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
    const [hasInteracted, setHasInteracted] = useState(false)

    const { validation, validateEmail } = useEmailValidation({
      ...validationOptions,
      onValidation: (result) => {
        onValidationChange?.(result.isValid)
      }
    })

    // Validação com debounce
    const handleValidation = async (email: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      const timer = setTimeout(async () => {
        if (email.trim() && hasInteracted) {
          await validateEmail(email)
        }
      }, debounceMs)

      setDebounceTimer(timer)
    }

    // Limpar timer ao desmontar
    useEffect(() => {
      return () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
      }
    }, [debounceTimer])

    // Atualizar valor quando prop value mudar
    useEffect(() => {
      setInputValue(value || '')
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      onChange?.(e)
      handleValidation(newValue)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setHasInteracted(true)
      const email = e.target.value
      if (email.trim()) {
        validateEmail(email)
      }
      onBlur?.(e)
    }

    // Determinar se deve mostrar erro
    const shouldShowError = hasInteracted && validation.error && !externalError
    const displayError = externalError || (shouldShowError ? validation.error : null)
    const isValid = hasInteracted && validation.isValid && !externalError

    return (
      <div className={cn('space-y-2', containerClassName)}>
        <Label htmlFor={props.id} className={cn(
          'text-sm font-medium',
          'sm:text-base',
          displayError && 'text-destructive'
        )}>
          {label}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            type="email"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'pr-10 transition-colors',
              'text-sm sm:text-base',
              'placeholder:text-xs sm:placeholder:text-sm',
              displayError && 'border-destructive focus:ring-destructive',
              isValid && 'border-green-500 focus:ring-green-500',
              className
            )}
            aria-invalid={!!displayError}
            aria-describedby={displayError ? `${props.id}-error` : undefined}
            {...props}
          />
          
          {showValidationIcons && hasInteracted && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {isValid && (
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              )}
              {displayError && (
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
              )}
            </div>
          )}
        </div>

        {displayError && (
          <p 
            id={`${props.id}-error`}
            className="text-xs sm:text-sm text-destructive flex items-start gap-1 leading-relaxed"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="break-words">{displayError}</span>
          </p>
        )}

        {isValid && (
          <p className="text-xs sm:text-sm text-green-600 flex items-start gap-1 leading-relaxed">
            <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="break-words">Email válido</span>
          </p>
        )}
      </div>
    )
  }
)

EmailInput.displayName = 'EmailInput'