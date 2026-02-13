/**
 * PersonCard Component - LuvBee Core Platform
 * 
 * Componente atualizado para usar os novos tipos e dados de PotentialMatch
 * Exibe foto, nome, idade, bio, compatibilidade e interesses
 */

import { MapPin, Heart, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CompatibilityBadge } from "./CompatibilityBadge"
import type { PotentialMatch } from "@/services/match.service"
import { motion } from "framer-motion"

interface PersonCardProps {
  user: PotentialMatch
  onLike?: (userId: string) => void
  onDislike?: (userId: string) => void
  onClick?: () => void
  showActions?: boolean
}

export const PersonCard = ({
  user,
  onLike,
  onDislike,
  onClick,
  showActions = false,
}: PersonCardProps) => {
  if (!user) {
    return (
      <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Perfil não disponível</p>
      </div>
    )
  }

  const imageUrl = user.avatar_url || user.photos?.[0] || '/placeholder-person.jpg'
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
  ].slice(0, 6)

  // Usar interesses do perfil se disponíveis
  const interests = user.interests || preferences

  return (
    <motion.div
      className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Compatibility Badge */}
      {compatibility > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-primary text-white px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
            <Star className="w-4 h-4 fill-white" />
            {compatibility}% match
          </div>
        </div>
      )}

      {/* Common Locations Badge */}
      {commonLocations > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-white/90 text-black font-bold shadow-lg">
            <MapPin className="w-3 h-3 mr-1" />
            {commonLocations} locais em comum
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white z-10">
        <div className="mb-3">
          <h2 className="text-3xl font-bold mb-1">
            {name}{age ? `, ${age}` : ''}
          </h2>
          {user.location && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <MapPin className="w-4 h-4" />
              {user.location}
            </div>
          )}
        </div>

        <p className="text-sm mb-4 line-clamp-3 opacity-90">{bio}</p>

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          {compatibility > 0 && (
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-primary fill-primary" />
              <span>{compatibility}% compatível</span>
            </div>
          )}
        </div>

        {/* Interests */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {interests.slice(0, 6).map((interest, index) => (
              <Badge
                key={`${interest}-${index}`}
                variant="outline"
                className="bg-white/10 text-white border-white/40 backdrop-blur-sm"
              >
                {interest}
              </Badge>
            ))}
            {interests.length > 6 && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/40">
                +{interests.length - 6}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Action overlay on hover */}
      {showActions && (
        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDislike?.(user.id)
            }}
            className="w-16 h-16 rounded-full bg-destructive text-white flex items-center justify-center hover:scale-110 transition-transform"
          >
            <span className="text-2xl">✕</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLike?.(user.id)
            }}
            className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart className="w-8 h-8" />
          </button>
        </div>
      )}
    </motion.div>
  )
}
