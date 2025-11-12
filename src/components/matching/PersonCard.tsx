/**
 * PersonCard Component - LuvBee Core Platform
 * 
 * Componente atualizado para usar os novos tipos e dados de PotentialMatch
 */

import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CompatibilityBadge } from "./CompatibilityBadge"
import type { PotentialMatch } from "@/services/match.service"

interface PersonCardProps {
  user: PotentialMatch
  onLike?: (userId: string) => void
  onDislike?: (userId: string) => void
}

export const PersonCard = ({
  user,
  onLike,
  onDislike,
}: PersonCardProps) => {
  if (!user) {
    return (
      <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Perfil não disponível</p>
      </div>
    )
  }

  const imageUrl = user.avatar_url || '/placeholder-person.jpg'
  const name = user.name || 'Sem nome'
  const age = user.age
  const bio = user.bio || 'Sem descrição'
  const compatibility = user.compatibility_score ?? 0
  const commonLocations = user.common_locations_count ?? 0

  // Combinar preferências para exibir como interesses
  const preferences = [
    ...(user.drink_preferences || []),
    ...(user.food_preferences || []),
    ...(user.music_preferences || [])
  ].slice(0, 6) // Limitar a 6 para não sobrecarregar

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card">
      {/* Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-person.jpg'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>

      {/* Compatibility Badge */}
      {compatibility > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <CompatibilityBadge
            score={compatibility}
            commonLocations={commonLocations}
            variant="default"
          />
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white z-10">
        <div className="mb-3">
          <h2 className="text-3xl font-bold mb-2">
            {name}{age ? `, ${age}` : ''}
          </h2>
          {user.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              {user.location}
            </div>
          )}
        </div>

        <p className="text-sm mb-4 line-clamp-2 opacity-90">{bio}</p>

        {/* Common Locations Badge */}
        {commonLocations > 0 && (
          <div className="mb-2">
            <Badge variant="outline" className="bg-white/10 text-white border-white/40">
              {commonLocations} {commonLocations === 1 ? 'local' : 'locais'} em comum
            </Badge>
          </div>
        )}

        {/* Preferences */}
        {preferences.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {preferences.map((pref, index) => (
              <Badge
                key={`${pref}-${index}`}
                variant="outline"
                className="bg-white/10 text-white border-white/40"
              >
                {pref}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
