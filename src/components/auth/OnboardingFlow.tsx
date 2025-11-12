import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserService } from '@/services/user.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DRINK_PREFERENCES, FOOD_PREFERENCES, MUSIC_PREFERENCES } from '@/lib/constants'
import { preferencesSchema, formatZodErrors } from '@/lib/validations'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface OnboardingFlowProps {
  onComplete?: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [preferences, setPreferences] = useState({
    drink_preferences: [] as string[],
    food_preferences: [] as string[],
    music_preferences: [] as string[],
    vibe_ambiente: 'eclético' as 'calmo' | 'animado' | 'eclético',
    vibe_horario: 'noite' as 'manhã' | 'tarde' | 'noite' | 'madrugada',
    vibe_frequencia: 'semanal' as 'diária' | 'semanal' | 'quinzenal' | 'mensal',
  })

  const togglePreference = (category: 'drink' | 'food' | 'music', value: string) => {
    setPreferences(prev => {
      const key = `${category}_preferences` as keyof typeof prev
      const current = prev[key] as string[]
      
      if (current.includes(value)) {
        return {
          ...prev,
          [key]: current.filter(p => p !== value)
        }
      } else {
        if (current.length >= 10) {
          toast.error('Máximo de 10 preferências por categoria')
          return prev
        }
        return {
          ...prev,
          [key]: [...current, value]
        }
      }
    })
  }

  const handleNext = () => {
    if (step === 1) {
      if (preferences.drink_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de bebida')
        return
      }
      setStep(2)
      setError(null)
    } else if (step === 2) {
      if (preferences.food_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de comida')
        return
      }
      setStep(3)
      setError(null)
    } else if (step === 3) {
      if (preferences.music_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de música')
        return
      }
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setError(null)
    }
  }

  const handleComplete = async () => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Preparar dados no formato correto do banco
      const preferencesData = {
        drink_preferences: preferences.drink_preferences,
        food_preferences: preferences.food_preferences,
        music_preferences: preferences.music_preferences,
        vibe_preferences: {
          ambiente: preferences.vibe_ambiente,
          horario_preferido: preferences.vibe_horario,
          frequencia: preferences.vibe_frequencia,
        }
      }

      // Validar com Zod
      const validatedData = preferencesSchema.parse(preferencesData)

      // Salvar preferências
      const result = await UserService.saveUserPreferences(user.id, validatedData)

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      toast.success('Preferências salvas com sucesso!')
      
      // Redirecionar
      if (onComplete) {
        onComplete()
      } else {
        navigate('/dashboard/vibe-local', { replace: true })
      }
    } catch (err) {
      // Zod validation errors: show detailed messages
      if (err instanceof Error && err.name === 'ZodError') {
        try {
          // @ts-expect-error - zod error typing
          const messages = formatZodErrors(err)
          setError(messages.join('\n'))
        } catch {
          setError(err.message)
        }
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao salvar preferências')
      }
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Bebidas Favoritas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione suas bebidas preferidas (mínimo 1, máximo 10)
        </p>
        <div className="flex flex-wrap gap-2">
          {DRINK_PREFERENCES.map(drink => (
            <Badge
              key={drink}
              variant={preferences.drink_preferences.includes(drink) ? 'default' : 'outline'}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => togglePreference('drink', drink)}
            >
              {drink}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Comidas Favoritas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione seus tipos de comida preferidos (mínimo 1, máximo 10)
        </p>
        <div className="flex flex-wrap gap-2">
          {FOOD_PREFERENCES.map(food => (
            <Badge
              key={food}
              variant={preferences.food_preferences.includes(food) ? 'default' : 'outline'}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => togglePreference('food', food)}
            >
              {food}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Música Favorita</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione seus estilos musicais preferidos (mínimo 1, máximo 10)
        </p>
        <div className="flex flex-wrap gap-2">
          {MUSIC_PREFERENCES.map(music => (
            <Badge
              key={music}
              variant={preferences.music_preferences.includes(music) ? 'default' : 'outline'}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => togglePreference('music', music)}
            >
              {music}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-hard border-2">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">
          Configure suas Preferências
        </CardTitle>
        <CardDescription className="text-center">
          Passo {step} de 3 - Isso nos ajuda a encontrar os melhores matches para você
        </CardDescription>
        <div className="flex gap-2 justify-center mt-4">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isLoading}
          >
            Voltar
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : step === 3 ? (
              'Finalizar'
            ) : (
              'Próximo'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

