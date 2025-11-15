import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ rating, onRatingChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value)
    }
  }

  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= (hoverRating || rating)
        return (
          <button
            key={star}
            type="button"
            className={`${sizeClasses[size]} ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'} ${
              isActive ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}