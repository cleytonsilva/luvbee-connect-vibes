/**
 * PersonProfileModal - Modal de perfil detalhado
 * Exibe informações completas do perfil ao clicar no card
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Heart, X, ChevronLeft, ChevronRight, MapPinned } from 'lucide-react'
import { CompatibilityBadge } from './CompatibilityBadge'
import type { PotentialMatch } from '@/services/match.service'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCommonLocations } from '@/hooks/useCommonLocations'
import { useAuth } from '@/hooks/useAuth'

interface PersonProfileModalProps {
    user: PotentialMatch | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onLike?: () => void
    onDislike?: () => void
}

// Componente para exibir círculo de local com fallback
function LocationCircle({ location }: { location: { id: string; name: string; photo_url?: string } }) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!location.photo_url) {
            setImageUrl(null)
            return
        }

        // Verificar se a URL retorna uma imagem válida antes de renderizar
        const checkAndLoadImage = async () => {
            try {
                const img = new Image()
                img.crossOrigin = 'anonymous'

                img.onload = () => {
                    // Imagens de erro do Google Maps têm 100x100 pixels
                    // Só aceitar imagens com largura > 0 e diferente de 100
                    if (img.naturalWidth > 0 && img.naturalWidth !== 100) {
                        setImageUrl(location.photo_url!)
                    } else {
                        setImageUrl(null)
                    }
                }

                img.onerror = () => {
                    setImageUrl(null)
                }

                img.src = location.photo_url!
            } catch (error) {
                setImageUrl(null)
            }
        }

        checkAndLoadImage()
    }, [location.photo_url, location.name])

    const handleClick = () => {
        // Navegar para /dashboard/locations com o ID do local como query param
        navigate(`/dashboard/locations?highlight=${location.id}`)
    }

    return (
        <div
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
            title={location.name}
            onClick={handleClick}
        >
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 group-hover:border-primary transition-colors shadow-md bg-primary/10 flex items-center justify-center">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={location.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <MapPin className="w-8 h-8 text-primary" />
                )}
            </div>
            <span className="text-xs text-center max-w-[70px] truncate">
                {location.name}
            </span>
        </div>
    )
}

export function PersonProfileModal({
    user,
    open,
    onOpenChange,
    onLike,
    onDislike,
}: PersonProfileModalProps) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
    const { user: currentUser } = useAuth()

    // Buscar locais em comum entre o usuário logado e o perfil sendo visualizado
    const { data: commonLocationsList = [], isLoading: isLoadingLocations } = useCommonLocations(user?.id || null)

    if (!user) return null

    const photos = user.photos && user.photos.length > 0 ? user.photos : [user.avatar_url || '/placeholder-person.jpg']
    const name = user.name || 'Sem nome'
    const age = user.age
    const bio = user.bio || 'Sem descrição'
    const compatibility = user.compatibility_score ?? 0
    const commonLocations = user.common_locations_count ?? 0

    // Organizar preferências por categoria
    const drinkPrefs = user.drink_preferences || []
    const foodPrefs = user.food_preferences || []
    const musicPrefs = user.music_preferences || []

    const nextPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
    }

    const prevPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }

    const handleLike = () => {
        onLike?.()
        onOpenChange(false)
    }

    const handleDislike = () => {
        onDislike?.()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
                <div className="flex flex-col h-full">
                    {/* Header com foto */}
                    <div className="relative h-96 bg-black">
                        <img
                            src={photos[currentPhotoIndex]}
                            alt={`${name} - foto ${currentPhotoIndex + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-person.jpg'
                            }}
                        />

                        {/* Gradiente inferior */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Navegação de fotos */}
                        {photos.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                    onClick={prevPhoto}
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                    onClick={nextPhoto}
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </Button>

                                {/* Indicadores de foto */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                    {photos.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`h-2 rounded-full transition-all ${index === currentPhotoIndex
                                                ? 'w-8 bg-white'
                                                : 'w-2 bg-white/50'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Compatibility Badge */}
                        {compatibility > 0 && (
                            <div className="absolute top-4 right-4">
                                <CompatibilityBadge
                                    score={compatibility}
                                    commonLocations={commonLocations}
                                    variant="default"
                                />
                            </div>
                        )}

                        {/* Nome e idade */}
                        <div className="absolute bottom-6 left-6 text-white">
                            <h2 className="text-4xl font-bold mb-1">
                                {name}{age ? `, ${age}` : ''}
                            </h2>
                            {user.location && (
                                <div className="flex items-center gap-2 text-sm opacity-90">
                                    <MapPin className="w-4 h-4" />
                                    {user.location}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conteúdo scrollável */}
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {/* Bio */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Sobre</h3>
                                <p className="text-muted-foreground leading-relaxed">{bio}</p>
                            </div>

                            {/* Compatibilidade e Locais em Comum */}
                            {commonLocations > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <MapPinned className="w-5 h-5 text-primary" />
                                        Locais em Comum
                                    </h3>
                                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
                                        <p className="text-center">
                                            <span className="text-3xl font-bold text-primary">{commonLocations}</span>
                                            <span className="text-muted-foreground ml-2">
                                                {commonLocations === 1 ? 'local curtido' : 'locais curtidos'} por ambos
                                            </span>
                                        </p>
                                        <p className="text-sm text-center text-muted-foreground">
                                            Vocês têm {compatibility}% de compatibilidade baseado em gostos e locais em comum
                                        </p>

                                        {/* Grid de locais em comum */}
                                        {commonLocationsList.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium mb-3 text-center">Locais que vocês curtiram:</p>
                                                <div className="flex flex-wrap justify-center gap-3">
                                                    {commonLocationsList.slice(0, 6).map((location) => (
                                                        <LocationCircle key={location.id} location={location} />
                                                    ))}
                                                    {commonLocationsList.length > 6 && (
                                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                                                                <span className="text-sm font-bold text-primary">+{commonLocationsList.length - 6}</span>
                                                            </div>
                                                            <span className="text-xs text-center max-w-[70px]">
                                                                mais
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Preferências de Bebidas */}
                            {drinkPrefs.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">🍹 Bebidas Favoritas</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {drinkPrefs.map((pref, index) => (
                                            <Badge
                                                key={`drink-${index}`}
                                                variant="secondary"
                                                className="px-3 py-1.5"
                                            >
                                                {pref}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preferências de Comida */}
                            {foodPrefs.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">🍽️ Comidas Favoritas</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {foodPrefs.map((pref, index) => (
                                            <Badge
                                                key={`food-${index}`}
                                                variant="secondary"
                                                className="px-3 py-1.5"
                                            >
                                                {pref}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preferências de Música */}
                            {musicPrefs.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">🎵 Músicas Favoritas</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {musicPrefs.map((pref, index) => (
                                            <Badge
                                                key={`music-${index}`}
                                                variant="secondary"
                                                className="px-3 py-1.5"
                                            >
                                                {pref}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Botões de ação fixos no rodapé */}
                    <div className="border-t p-4 bg-background">
                        <div className="flex justify-center gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleDislike}
                                className="rounded-full w-16 h-16 shadow-hard border-2"
                            >
                                <X className="w-6 h-6" />
                            </Button>

                            <Button
                                variant="default"
                                size="lg"
                                onClick={handleLike}
                                className="rounded-full w-16 h-16 shadow-hard border-2 bg-primary"
                            >
                                <Heart className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
