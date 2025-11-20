/**
 * CompatibilityBadge Component - LuvBee Core Platform
 * 
 * Componente para exibir score de compatibilidade
 */

import { Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CompatibilityBadgeProps {
  score: number | null | undefined
  commonLocations?: number
  className?: string
  showIcon?: boolean
  variant?: "default" | "outline" | "secondary"
}

export function CompatibilityBadge({
  score,
  commonLocations,
  className,
  showIcon = true,
  variant = "default"
}: CompatibilityBadgeProps) {
  if (!score || score === 0) return null

  // Determinar cor baseada no score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    if (score >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  const scoreColor = getScoreColor(score)
  const displayScore = Math.round(score)

  return (
    <Badge
      variant={variant}
      className={cn(
        "shadow-hard text-lg px-4 py-2 font-bold",
        variant === "default" && scoreColor,
        className
      )}
    >
      {showIcon && <Heart className="w-4 h-4 mr-1 fill-current" />}
      <span>{displayScore}% Match</span>
      {commonLocations !== undefined && commonLocations > 0 && (
        <span className="ml-2 text-xs opacity-90">
          ({commonLocations} {commonLocations === 1 ? 'local' : 'locais'} em comum)
        </span>
      )}
    </Badge>
  )
}

