import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userRegisterSchema, type UserRegisterInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const navigate = useNavigate()
  const { signUp, isLoading, error, user } = useAuth()
  const [localError, setLocalError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<UserRegisterInput & { confirmPassword: string }>({
    resolver: zodResolver(userRegisterSchema.extend({
      confirmPassword: userRegisterSchema.shape.password
    }))
  })

  const password = watch('password')

  // Limpar erro local quando error do hook mudar
  useEffect(() => {
    if (error) {
      setLocalError(error)
      toast.error('Erro ao criar conta', {
        description: error
      })
    } else {
      setLocalError(null)
    }
  }, [error])

  // Redirecionar quando registro for bem-sucedido
  useEffect(() => {
    if (user && !isLoading && !error) {
      toast.success('Conta criada com sucesso!')
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/onboarding')
      }
    }
  }, [user, isLoading, error, navigate, onSuccess])

  const onSubmit = async (data: UserRegisterInput & { confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      const errorMsg = 'As senhas não coincidem'
      setLocalError(errorMsg)
      toast.error('Erro de validação', {
        description: errorMsg
      })
      return
    }

    setLocalError(null)

    try {
      await signUp(data.email, data.password, data.name)
      // O redirecionamento será feito pelo useEffect quando user for definido
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conta'
      setLocalError(errorMessage)
      toast.error('Erro ao criar conta', {
        description: errorMessage
      })
    }
  }

  const displayError = localError || error

  return (
    <Card className="w-full max-w-md mx-auto shadow-hard border-2">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create account</CardTitle>
        <CardDescription className="text-center">
          Enter your information to create your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {displayError && (
            <Alert variant="destructive">
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              {...register('confirmPassword', {
                validate: (value) => value === password || 'Passwords do not match'
              })}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary hover:text-primary/80 font-medium"
              disabled={isLoading}
            >
              Sign in
            </button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}