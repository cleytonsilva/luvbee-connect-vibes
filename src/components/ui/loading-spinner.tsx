import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'h-6 w-6 border-b',
  md: 'h-12 w-12 border-b-2',
  lg: 'h-16 w-16 border-b-2',
}

export function LoadingSpinner({ 
  className, 
  size = 'md',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const spinner = (
    <div 
      className={cn(
        'animate-spin rounded-full border-primary',
        sizeClasses[size],
        className
      )} 
    />
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}

