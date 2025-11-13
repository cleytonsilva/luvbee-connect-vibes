/**
 * Página de Confirmação de Email
 * 
 * Exibida após o signup quando o email precisa ser confirmado.
 * Monitora a confirmação do email e redireciona para o onboarding quando confirmado.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ConfirmEmail() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Verificar se o email já foi confirmado
  useEffect(() => {
    if (!user || loading) return

    // Se o email já está confirmado, redirecionar para onboarding
    if (user.email_confirmed_at || user.confirmed_at) {
      navigate('/onboarding', { replace: true })
      return
    }

    // Verificar periodicamente se o email foi confirmado
    const checkEmailConfirmation = async () => {
      setIsChecking(true)
      try {
        const { data: { user: updatedUser } } = await supabase.auth.getUser()
        
        if (updatedUser?.email_confirmed_at || updatedUser?.confirmed_at) {
          toast.success('Email confirmado com sucesso!', {
            description: 'Redirecionando para o onboarding...'
          })
          navigate('/onboarding', { replace: true })
        }
      } catch (error) {
        console.error('[ConfirmEmail] Erro ao verificar confirmação:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Verificar imediatamente
    checkEmailConfirmation()

    // Verificar a cada 3 segundos
    const interval = setInterval(checkEmailConfirmation, 3000)

    return () => clearInterval(interval)
  }, [user, loading, navigate])

  // Se não há usuário, redirecionar para auth
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, loading, navigate])

  const handleResendEmail = async () => {
    if (!user?.email) return

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      })

      if (error) {
        toast.error('Erro ao reenviar email', {
          description: error.message
        })
      } else {
        setEmailSent(true)
        toast.success('Email reenviado!', {
          description: 'Verifique sua caixa de entrada'
        })
        
        // Resetar após 5 segundos
        setTimeout(() => setEmailSent(false), 5000)
      }
    } catch (error) {
      console.error('[ConfirmEmail] Erro ao reenviar email:', error)
      toast.error('Erro ao reenviar email', {
        description: 'Tente novamente mais tarde'
      })
    } finally {
      setIsResending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Confirme seu email</CardTitle>
          <CardDescription className="mt-2">
            Enviamos um link de confirmação para
          </CardDescription>
          <CardDescription className="font-semibold text-foreground">
            {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Próximos passos:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Verifique sua caixa de entrada</li>
              <li>Clique no link de confirmação no email</li>
              <li>Você será redirecionado automaticamente</li>
            </ol>
          </div>

          {isChecking && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando confirmação...</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleResendEmail}
              disabled={isResending || emailSent}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : emailSent ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Email reenviado!
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Reenviar email de confirmação
                </>
              )}
            </Button>

            <Button
              onClick={() => navigate('/auth')}
              variant="ghost"
              className="w-full"
            >
              Voltar para login
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Não recebeu o email? Verifique sua pasta de spam ou tente reenviar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

