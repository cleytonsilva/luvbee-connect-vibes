import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserService } from '@/services/user.service'
import { supabase } from '@/integrations/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DRINK_PREFERENCES, FOOD_PREFERENCES, MUSIC_PREFERENCES } from '@/lib/constants'
import { preferencesSchema, formatZodErrors } from '@/lib/validations'
import { Loader2, Upload, X, Camera } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Dados do perfil
  const [profileData, setProfileData] = useState({
    photos: [] as string[],
    bio: '',
    age: '',
    city: '',
  })
  
  // Preferências
  const [preferences, setPreferences] = useState({
    drink_preferences: [] as string[],
    food_preferences: [] as string[],
    music_preferences: [] as string[],
    vibe_ambiente: 'eclético' as 'calmo' | 'animado' | 'eclético',
    vibe_horario: 'noite' as 'manhã' | 'tarde' | 'noite' | 'madrugada',
    vibe_frequencia: 'semanal' as 'diária' | 'semanal' | 'quinzenal' | 'mensal',
  })

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB')
      return
    }

    try {
      setIsLoading(true)
      
      // Criar preview local
      const reader = new FileReader()
      reader.onloadend = () => {
        const previewUrl = reader.result as string
        setProfileData(prev => ({
          ...prev,
          photos: [previewUrl]
        }))
      }
      reader.readAsDataURL(file)

      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        throw uploadError
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Atualizar com URL real
      setProfileData(prev => ({
        ...prev,
        photos: [publicUrl]
      }))

      toast.success('Foto enviada com sucesso!')
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err)
      toast.error('Erro ao enviar foto. Tente novamente.')
    } finally {
      setIsLoading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePhoto = () => {
    setProfileData(prev => ({
      ...prev,
      photos: []
    }))
  }

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
      // Validar foto
      if (profileData.photos.length === 0) {
        setError('Por favor, adicione pelo menos uma foto')
        return
      }
      setStep(2)
      setError(null)
    } else if (step === 2) {
      // Validar bio, idade e cidade
      if (!profileData.bio.trim()) {
        setError('Por favor, escreva uma bio')
        return
      }
      if (profileData.bio.trim().length < 10) {
        setError('A bio deve ter pelo menos 10 caracteres')
        return
      }
      if (!profileData.age) {
        setError('Por favor, informe sua idade')
        return
      }
      const ageNum = parseInt(profileData.age)
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        setError('Idade deve ser entre 18 e 120 anos')
        return
      }
      if (!profileData.city.trim()) {
        setError('Por favor, informe sua cidade')
        return
      }
      setStep(3)
      setError(null)
    } else if (step === 3) {
      if (preferences.drink_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de bebida')
        return
      }
      setStep(4)
      setError(null)
    } else if (step === 4) {
      if (preferences.food_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de comida')
        return
      }
      setStep(5)
      setError(null)
    } else if (step === 5) {
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
      // 1. Atualizar perfil do usuário (foto, bio, idade, cidade)
      const ageNum = parseInt(profileData.age)
      const updateResult = await UserService.updateUser(user.id, {
        photos: profileData.photos,
        bio: profileData.bio.trim(),
        age: ageNum,
        location: profileData.city.trim(),
      })

      if (updateResult.error) {
        setError(updateResult.error)
        setIsLoading(false)
        return
      }

      // 2. Salvar preferências
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

      const validatedData = preferencesSchema.parse(preferencesData)
      const result = await UserService.saveUserPreferences(user.id, validatedData)

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      toast.success('Perfil criado com sucesso!')
      
      // Redirecionar
      if (onComplete) {
        onComplete()
      } else {
        navigate('/dashboard/vibe-local', { replace: true })
      }
    } catch (err) {
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
        setError('Erro ao salvar dados')
      }
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Adicione sua foto</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha uma foto para seu perfil (máximo 5MB)
        </p>
        
        <div className="flex flex-col items-center gap-4">
          {profileData.photos.length > 0 ? (
            <div className="relative">
              <img
                src={profileData.photos[0]}
                alt="Preview"
                className="w-48 h-48 rounded-full object-cover border-4 border-primary"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 rounded-full"
                onClick={removePhoto}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="w-48 h-48 rounded-full border-4 border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/50">
              <Camera className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
            id="photo-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {profileData.photos.length > 0 ? 'Trocar foto' : 'Escolher foto'}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Conte um pouco sobre você</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Escreva uma bio e informe sua idade e cidade
        </p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você, seus hobbies, o que você gosta de fazer..."
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {profileData.bio.length}/500 caracteres (mínimo 10)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                placeholder="18"
                value={profileData.age}
                onChange={(e) => setProfileData(prev => ({ ...prev, age: e.target.value }))}
                min={18}
                max={120}
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                type="text"
                placeholder="São Paulo"
                value={profileData.city}
                onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
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

  const renderStep4 = () => (
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

  const renderStep5 = () => (
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
          Configure seu Perfil
        </CardTitle>
        <CardDescription className="text-center">
          Passo {step} de 5 - Vamos conhecer você melhor
        </CardDescription>
        <div className="flex gap-2 justify-center mt-4">
          {[1, 2, 3, 4, 5].map(s => (
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
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

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
            ) : step === 5 ? (
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
