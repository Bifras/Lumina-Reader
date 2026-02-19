import { useState, memo, useCallback } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  interactive?: boolean
  onRate?: (rating: number) => void
  className?: string
}

const StarRating = memo(function StarRating({ 
  rating = 0, 
  maxRating = 5, 
  size = 16,
  interactive = false,
  onRate,
  className = ''
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseEnter = useCallback((starIndex: number) => {
    if (!interactive) return
    setHoverRating(starIndex)
    setIsHovering(true)
  }, [interactive])

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return
    setHoverRating(0)
    setIsHovering(false)
  }, [interactive])

  const handleClick = useCallback((starIndex: number) => {
    if (!interactive || !onRate) return
    onRate(starIndex)
  }, [interactive, onRate])

  const displayRating = isHovering ? hoverRating : rating

  return (
    <div 
      className={`star-rating ${interactive ? 'star-rating--interactive' : ''} ${className}`}
      onMouseLeave={handleMouseLeave}
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Valuta questo libro" : `Valutazione: ${rating} su ${maxRating}`}
    >
      {Array.from({ length: maxRating }, (_, index) => {
        const starIndex = index + 1
        const isFilled = starIndex <= displayRating
        const isHalf = !isFilled && starIndex - 0.5 <= displayRating

        return (
          <button
            key={index}
            type="button"
            className={`star-rating__star ${isFilled ? 'star-rating__star--filled' : ''} ${isHalf ? 'star-rating__star--half' : ''}`}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onClick={() => handleClick(starIndex)}
            disabled={!interactive}
            aria-label={interactive ? `${starIndex} stelle` : undefined}
            aria-checked={interactive ? rating === starIndex : undefined}
            role={interactive ? "radio" : undefined}
          >
            <Star 
              size={size} 
              className="star-rating__icon"
              fill={isFilled ? "currentColor" : isHalf ? "url(#half)" : "none"}
              strokeWidth={isFilled ? 0 : 2}
            />
            {/* Hidden SVG for half-star gradient */}
            {index === 0 && (
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <linearGradient id="half">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </button>
        )
      })}
      {interactive && rating > 0 && (
        <span className="star-rating__value">{rating}/5</span>
      )}
    </div>
  )
})

export default StarRating
