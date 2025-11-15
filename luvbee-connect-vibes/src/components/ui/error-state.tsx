import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
  variant?: 'card' | 'alert'
}

export function ErrorState({
  title = 'Algo deu errado',
  message = 'Ocorreu um erro ao carregar os dados. Tente novamente.',
  onRetry,
  className,
  variant = 'card',
}: ErrorStateProps) {
  if (variant === 'alert') {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {message}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={cn('p-8 text-center', className)}>
      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </Card>
  )
}

