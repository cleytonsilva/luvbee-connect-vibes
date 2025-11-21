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
import { preferencesSchema, formatZodErrors, IDENTITY_OPTIONS, WHO_TO_SEE_OPTIONS } from '@/lib/validations'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Upload, X, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { safeLog } from '@/lib/safe-log'
import LocationSelect from '@/components/ui/location-select'
import { LATAM_COUNTRIES } from '@/lib/location-data'

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
    country: '',
    state: '',
    city: '',
  })
  
  // Preferências de Descoberta
  const [discoveryPreferences, setDiscoveryPreferences] = useState({
    identity: '' as '' | 'woman_cis' | 'man_cis' | 'non_binary' | 'other',
    who_to_see: [] as string[],
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

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de imagem não suportado')
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

      const sessionRes = await supabase.auth.getSession?.()
      const session = sessionRes?.data?.session
      if (!session?.user) {
        toast.error('Sessão inválida. Por favor, faça login e confirme seu email.')
        safeLog('error', '[Onboarding] Sessão inválida antes do upload', { userId: user.id })
        return
      }

      // Upload para Supabase Storage com fallback de bucket
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      let uploadError: any = null
      let bucketUsed = 'avatars'
      const uploadRes1 = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })
      uploadError = uploadRes1.error

      if (uploadError) {
        const msg = String(uploadError.message || uploadError)
        const isRlsOrPerm = msg.includes('row-level security') || msg.includes('permission') || msg.includes('bucket')
        if (isRlsOrPerm) {
          const uploadRes2 = await supabase.storage
            .from('profile-photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            })
          uploadError = uploadRes2.error
          if (!uploadError) bucketUsed = 'profile-photos'
        }
      }

      if (uploadError) {
        safeLog('error', '[Onboarding] Upload falhou', { error: uploadError?.message || uploadError, bucket: bucketUsed, filePath })
        throw uploadError
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketUsed)
        .getPublicUrl(filePath)

      // Atualizar com URL real
      setProfileData(prev => ({
        ...prev,
        photos: [publicUrl]
      }))

      toast.success('Foto enviada com sucesso!')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('row-level security') || message.includes('permission')) {
        toast.error('Permissão negada pelo RLS. Confirme seu email e tente novamente.')
      } else {
        toast.error('Erro ao enviar foto. Tente novamente.')
      }
      safeLog('error', '[Onboarding] Erro ao fazer upload da foto', { message })
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
      // Validar preferências de descoberta
      if (!discoveryPreferences.identity) {
        setError('Por favor, selecione como você se identifica')
        return
      }
      if (discoveryPreferences.who_to_see.length === 0) {
        setError('Por favor, selecione quem você quer ver')
        return
      }
      setStep(4)
      setError(null)
    } else if (step === 4) {
      if (preferences.drink_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de bebida')
        return
      }
      setStep(5)
      setError(null)
    } else if (step === 5) {
      if (preferences.food_preferences.length === 0) {
        setError('Selecione pelo menos uma preferência de comida')
        return
      }
      setStep(6)
      setError(null)
    } else if (step === 6) {
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
      // Verificar se o email foi confirmado antes de continuar
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email_confirmed_at && !authUser?.confirmed_at) {
        setError('Por favor, confirme seu email antes de completar o cadastro. Verifique sua caixa de entrada.')
        setIsLoading(false)
        return
      }

      // 1. Atualizar perfil do usuário (foto, bio, idade, localização)
      const ageNum = parseInt(profileData.age)
      // Formatar localização: "Cidade, Estado, País"
      let location = profileData.city.trim()
      if (profileData.state) {
        location = `${profileData.city.trim()}, ${profileData.state}`
      }
      if (profileData.country) {
        const countryName = LATAM_COUNTRIES.find(c => c.code === profileData.country)?.name || profileData.country
        location = `${location}, ${countryName}`
      }
      
      const updateResult = await UserService.updateUser(user.id, {
        photos: profileData.photos,
        bio: profileData.bio.trim(),
        age: ageNum,
        location: location,
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
        },
        identity: discoveryPreferences.identity,
        who_to_see: discoveryPreferences.who_to_see,
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
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="text-lg md:text-xl font-bold mb-2">Adicione sua foto</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-4">
          Escolha uma foto para seu perfil (máximo 5MB)
        </p>
        
        <div className="flex flex-col items-center gap-4">
          {profileData.photos.length > 0 ? (
            <div className="relative">
              <img
                src={profileData.photos[0]}
                alt="Preview"
                className="w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-primary"
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
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/50">
              <Camera className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/50" />
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
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {profileData.photos.length > 0 ? 'Trocar foto' : 'Escolher foto'}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="text-lg md:text-xl font-bold mb-2">Conte um pouco sobre você</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-4">
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

          <div className="space-y-4">
            <div className="w-full">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                placeholder="18"
                value={profileData.age}
                onChange={(e) => setProfileData(prev => ({ ...prev, age: e.target.value }))}
                min={18}
                max={120}
                className="w-full"
              />
            </div>

            <LocationSelect
              country={profileData.country}
              state={profileData.state}
              city={profileData.city}
              onCountryChange={(value) => setProfileData(prev => ({ ...prev, country: value }))}
              onStateChange={(value) => setProfileData(prev => ({ ...prev, state: value }))}
              onCityChange={(value) => setProfileData(prev => ({ ...prev, city: value }))}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const identityLabels: Record<string, string> = {
      'woman_cis': 'Mulher Cis',
      'man_cis': 'Homem Cis',
      'non_binary': 'Pessoa Não-Binária',
      'other': 'Outro'
    }

    const whoToSeeLabels: Record<string, string> = {
      'women_cis': 'Mulheres Cis',
      'men_cis': 'Homens Cis',
      'lgbtqiapn+': 'Público LGBTQIAPN+',
      'all': 'Todos'
    }

    const toggleWhoToSee = (value: string) => {
      setDiscoveryPreferences(prev => {
        const current = prev.who_to_see
        if (current.includes(value)) {
          return {
            ...prev,
            who_to_see: current.filter(v => v !== value)
          }
        } else {
          if (current.length >= 4) {
            toast.error('Máximo 4 opções')
            return prev
          }
          return {
            ...prev,
            who_to_see: [...current, value]
          }
        }
      })
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-2">Preferências de Descoberta</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Ajude-nos a encontrar as pessoas certas para você
          </p>
          
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Como você se identifica?
              </Label>
              <RadioGroup
                value={discoveryPreferences.identity}
                onValueChange={(value) => setDiscoveryPreferences(prev => ({ ...prev, identity: value as any }))}
                className="space-y-3"
              >
                {IDENTITY_OPTIONS.map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="cursor-pointer font-normal">
                      {identityLabels[option]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">
                Quem você quer ver? (Selecione uma ou mais opções)
              </Label>
              <div className="space-y-3">
                {WHO_TO_SEE_OPTIONS.map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`who-to-see-${option}`}
                      checked={discoveryPreferences.who_to_see.includes(option)}
                      onCheckedChange={() => toggleWhoToSee(option)}
                    />
                    <Label htmlFor={`who-to-see-${option}`} className="cursor-pointer font-normal">
                      {whoToSeeLabels[option]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStep4 = () => (
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

  const renderStep5 = () => (
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

  const renderStep6 = () => (
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
    <Card className="w-full max-w-2xl mx-auto shadow-hard border-2 m-4 md:m-6">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-2xl md:text-3xl font-bold text-center">Configure seu Perfil</CardTitle>
        <CardDescription className="text-center text-sm md:text-base">Vamos conhecer você melhor para personalizar sua experiência</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-6">
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
        {step === 6 && renderStep6()}

        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isLoading}
            className="w-full sm:w-auto"
          >
            Voltar
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : step === 6 ? (
              'Finalizar'
            ) : (
              'Próximo'
            )}
          </Button>
        </div>

        <div className="pt-6 border-t border-muted">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Passo {step} de 6</p>
            <div className="flex gap-4 text-sm">
              <a href="/termos-de-uso" className="underline hover:no-underline">Termos de Serviço</a>
              <a href="/termos-de-uso#privacidade" className="underline hover:no-underline">Política de Privacidade</a>
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
