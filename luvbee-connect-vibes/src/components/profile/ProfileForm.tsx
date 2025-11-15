import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Camera, MapPin, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { UserProfile } from '@/types/app.types'
import { UserService } from '@/services/user.service'
import { DRINK_OPTIONS, FOOD_OPTIONS, MUSIC_OPTIONS } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'
import { toast } from 'sonner'
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete'
import { supabase } from '@/integrations/supabase'

export function ProfileForm() {
  const { user, profile, updateProfile, loadUserProfile } = useAuth()
  console.log('🖼️ ProfileForm - user:', user?.id, 'profile:', profile?.id) // Debug
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const hasLoadedRef = useRef(false)
  
  // Estado para 3 fotos
  const [photos, setPhotos] = useState<string[]>([])
  
  // Estado para preferências clicáveis
  const [preferences, setPreferences] = useState({
    drink_preferences: [] as string[],
    food_preferences: [] as string[],
    music_preferences: [] as string[],
  })
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    bio: '',
    age: undefined,
    location: '',
    interests: [],
    avatar_url: '',
    preferences: {}
  })

  // Carregar perfil e preferências
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadUserProfile().catch(err => console.warn('Erro ao carregar perfil:', err))
      loadUserPreferences()
    }
  }, [user, loadUserProfile])

  // Carregar preferências da tabela user_preferences
  const loadUserPreferences = async () => {
    if (!user) return
    
    setIsLoadingPreferences(true)
    try {
      const result = await UserService.getUserPreferences(user.id)
      if (result.data) {
        setPreferences({
          drink_preferences: result.data.drink_preferences || [],
          food_preferences: result.data.food_preferences || [],
          music_preferences: result.data.music_preferences || [],
        })
      }
    } catch (error) {
      console.warn('Erro ao carregar preferências:', error)
    } finally {
      setIsLoadingPreferences(false)
    }
  }

  // Carregar fotos do perfil
  useEffect(() => {
    if (!user?.id) {
      console.log('Usuário não autenticado, não carregando fotos') // Debug
      return
    }
    
    if (profile) {
      console.log('Profile encontrado:', profile) // Debug
      // Converter location de JSONB para string se necessário
      let locationString = ''
      if (profile.location) {
        if (typeof profile.location === 'string') {
          locationString = profile.location
        } else if (typeof profile.location === 'object') {
          locationString = (profile.location as any).address || 
                          (profile.location as any).city || 
                          JSON.stringify(profile.location)
        }
      }

      // Carregar fotos do campo photos (array) - buscar diretamente do banco
      const loadPhotos = async () => {
        if (!user?.id) return
        // Usar primeiro as fotos já presentes no perfil
        const existingPhotos = Array.isArray(profile.photos) ? profile.photos : []
        if (existingPhotos.length > 0) {
          setPhotos(existingPhotos.slice(0, 3))
          return
        }
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('photos')
            .eq('id', user.id)
            .single()
          const profilePhotos = userData?.photos || []
          if (profilePhotos.length > 0) {
            setPhotos(profilePhotos.slice(0, 3))
          } else if (profile.avatar_url) {
            setPhotos([profile.avatar_url])
          }
        } catch (error) {
          console.warn('Erro ao carregar fotos:', error)
          if (profile.avatar_url) {
            setPhotos([profile.avatar_url])
          }
        }
      }
      
      loadPhotos()

      setFormData({
        name: profile.name || user?.email?.split('@')[0] || '',
        bio: profile.bio || '',
        age: profile.age || undefined,
        location: locationString,
        interests: profile.interests || [],
        avatar_url: profile.avatar_url || '',
        preferences: profile.preferences || {}
      })
    } else if (user) {
      // Se não tem profile mas tem user, usar dados básicos do user
      setFormData({
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        bio: '',
        age: user.user_metadata?.age || undefined,
        location: '',
        interests: [],
        avatar_url: user.user_metadata?.avatar_url || '',
        preferences: {}
      })
      // Se tem avatar_url no metadata, usar como primeira foto
      if (user.user_metadata?.avatar_url) {
        setPhotos([user.user_metadata.avatar_url])
      }
    }
  }, [profile, user])

  const handleInputChange = useCallback((field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Toggle preferência clicável
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

  // Upload de foto (até 3 fotos)
  const handlePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (photos.length >= 3 && index >= photos.length) {
      toast.error('Máximo de 3 fotos permitidas')
      return
    }

    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo de 5MB permitido.')
      return
    }

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPEG, PNG ou WebP.')
      return
    }

    try {
      setIsLoading(true)
      
      // Se está substituindo uma foto existente, deletar a antiga do storage
      if (index < photos.length && photos[index]) {
        const oldPhotoUrl = photos[index]
        // Extrair o caminho do arquivo da URL
        if (oldPhotoUrl.includes('supabase.co/storage')) {
          try {
            const urlParts = oldPhotoUrl.split('/storage/v1/object/public/profile-photos/')
            if (urlParts.length > 1) {
              const filePath = urlParts[1]
              await supabase.storage
                .from('profile-photos')
                .remove([filePath])
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar foto antiga:', deleteError)
            // Continuar mesmo se não conseguir deletar
          }
        }
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}-${index}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Substituir se já existir
          contentType: file.type
        })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        throw uploadError
      }

      // Obter URL pública da foto
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath)

      // Validar acessibilidade da URL e tentar assinar se necessário
      let finalUrl = publicUrl
      try {
        const headResp = await fetch(publicUrl, { method: 'HEAD' })
        if (!headResp.ok) {
          const { data: signed } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(filePath, 60 * 60)
          if (signed?.signedUrl) {
            finalUrl = signed.signedUrl
          }
        }
      } catch {
        const { data: signed } = await supabase.storage
          .from('profile-photos')
          .createSignedUrl(filePath, 60 * 60)
        if (signed?.signedUrl) {
          finalUrl = signed.signedUrl
        }
      }

      // Atualizar array de fotos
      const newPhotos = [...photos]
      if (index < newPhotos.length) {
        // Substituir foto existente
        newPhotos[index] = finalUrl
      } else {
        // Adicionar nova foto
        newPhotos.push(finalUrl)
      }
      
      // Garantir máximo de 3 fotos
      const updatedPhotos = newPhotos.slice(0, 3)
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('users')
        .update({ photos: updatedPhotos })
        .eq('id', user.id)

      if (updateError) {
        console.error('Erro ao atualizar fotos no banco:', updateError)
        throw updateError
      }

      // Atualizar estado local
      setPhotos(updatedPhotos)
      
      // Recarregar perfil para garantir sincronização
      await loadUserProfile()
      
      toast.success('Foto atualizada com sucesso!')
    } catch (error) {
      console.error('Error uploading photo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload da foto'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      event.target.value = ''
    }
  }

  // Remover foto
  const handleRemovePhoto = async (index: number) => {
    if (!user) return
    
    const photoToRemove = photos[index]
    if (!photoToRemove) return
    
    try {
      setIsLoading(true)
      
      // Deletar foto do storage se for uma URL do Supabase
      if (photoToRemove.includes('supabase.co/storage')) {
        try {
          const urlParts = photoToRemove.split('/storage/v1/object/public/profile-photos/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1]
            const { error: deleteError } = await supabase.storage
              .from('profile-photos')
              .remove([filePath])
            
            if (deleteError) {
              console.warn('Erro ao deletar foto do storage:', deleteError)
              // Continuar mesmo se não conseguir deletar do storage
            }
          }
        } catch (deleteError) {
          console.warn('Erro ao processar URL da foto:', deleteError)
        }
      }
      
      // Remover do array
      const newPhotos = photos.filter((_, i) => i !== index)
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('users')
        .update({ photos: newPhotos })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Erro ao atualizar fotos no banco:', updateError)
        throw updateError
      }
      
      // Atualizar estado local
      setPhotos(newPhotos)
      
      // Recarregar perfil para garantir sincronização
      await loadUserProfile()
      
      toast.success('Foto removida com sucesso!')
    } catch (error) {
      console.error('Error removing photo:', error)
      toast.error('Erro ao remover foto')
      // Reverter em caso de erro
      setPhotos(photos)
    } finally {
      setIsLoading(false)
    }
  }

  // Callback para quando um lugar é selecionado no campo de localização
  const handleLocationSelect = useCallback((place: {
    formatted_address: string
    place_id?: string
    geometry?: {
      lat: number
      lng: number
    }
  }) => {
    handleInputChange('location', place.formatted_address)
  }, [handleInputChange])

  // Autocomplete para campo de localização
  usePlacesAutocomplete({
    inputId: 'location',
    onPlaceSelect: handleLocationSelect,
    types: ['geocode'],
    componentRestrictions: { country: 'br' },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      // ✅ Sanitizar dados antes de enviar
      const sanitizedFormData = {
        ...formData,
        name: formData.name ? sanitizeText(formData.name) : formData.name,
        bio: formData.bio ? sanitizeText(formData.bio) : formData.bio,
      }
      
      // Preparar dados para atualização
      const updateData: Partial<UserProfile> = {
        ...sanitizedFormData,
        location: sanitizedFormData.location 
          ? (typeof sanitizedFormData.location === 'string' 
              ? { address: sanitizedFormData.location } 
              : sanitizedFormData.location)
          : null,
        // Incluir fotos atuais para não perdê-las ao salvar
        photos: photos,
      }

      // Atualizar perfil básico
      await updateProfile(updateData)
      
      // Atualizar preferências na tabela user_preferences
      await UserService.saveUserPreferences(user.id, preferences)
      
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar perfil'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  console.log('🖼️ Estado atual das fotos antes do render:', photos)
  console.log('👤 Usuário atual:', user?.id)
  console.log('📋 Profile atual:', profile?.id, 'photos:', profile?.photos)
  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção de Fotos - 3 fotos */}
        <div className="space-y-4">
          <Label>Fotos do Perfil (máximo 3)</Label>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg overflow-hidden group">
                {photos[index] ? (
                  <>
                    <img 
                      src={photos[index]} 
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      fetchpriority="low"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg' }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Label htmlFor={`photo-upload-${index}`} className="cursor-pointer">
                        <div className="bg-white p-2 rounded-full hover:bg-gray-100">
                          <Camera className="h-4 w-4 text-gray-900" />
                        </div>
                      </Label>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="bg-white p-2 rounded-full hover:bg-gray-100"
                      >
                        <X className="h-4 w-4 text-gray-900" />
                      </button>
                    </div>
                    <Input
                      id={`photo-upload-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(index, e)}
                      className="hidden"
                    />
                  </>
                ) : (
                  <Label htmlFor={`photo-upload-${index}`} className="cursor-pointer w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">Adicionar foto</span>
                    </div>
                    <Input
                      id={`photo-upload-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(index, e)}
                      className="hidden"
                    />
                  </Label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              type="number"
              value={formData.age || ''}
              onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Sua idade"
              min="18"
              max="100"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Localização</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Sua localização"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Conte um pouco sobre você..."
            rows={4}
          />
        </div>

        {/* Preferências Clicáveis */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Suas Preferências</h3>
          
          {/* Preferências de Bebidas */}
          <div className="space-y-3">
            <Label>Bebidas Preferidas</Label>
            <div className="flex flex-wrap gap-2">
              {DRINK_OPTIONS.map((drink) => (
                <Badge
                  key={drink}
                  variant={preferences.drink_preferences.includes(drink) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => togglePreference('drink', drink)}
                >
                  {drink}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preferências de Comidas */}
          <div className="space-y-3">
            <Label>Comidas Preferidas</Label>
            <div className="flex flex-wrap gap-2">
              {FOOD_OPTIONS.map((food) => (
                <Badge
                  key={food}
                  variant={preferences.food_preferences.includes(food) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => togglePreference('food', food)}
                >
                  {food}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preferências Musicais */}
          <div className="space-y-3">
            <Label>Estilos Musicais Preferidos</Label>
            <div className="flex flex-wrap gap-2">
              {MUSIC_OPTIONS.map((music) => (
                <Badge
                  key={music}
                  variant={preferences.music_preferences.includes(music) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => togglePreference('music', music)}
                >
                  {music}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="submit" disabled={isLoading || isLoadingPreferences}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function ProfileStats() {
  const { profile } = useAuth()

  const stats = [
    {
      label: 'Conexões',
      value: profile?.connections_count || 0,
      icon: '❤️',
      color: 'text-red-600'
    },
    {
      label: 'Check-ins',
      value: profile?.checkins_count || 0,
      icon: '📍',
      color: 'text-blue-600'
    },
    {
      label: 'Membro desde',
      value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : 'Recentemente',
      icon: '📅',
      color: 'text-green-600'
    }
  ]

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-4 text-center">
          <div className="text-3xl mb-2">{stat.icon}</div>
          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </Card>
      ))}
    </div>
  )
}
