'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (val: number) => void
  readOnly?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showValue?: boolean
  id?: string
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = false,
  id,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const activeValue = hoverValue !== null ? hoverValue : value

  const handleKeyDown = (e: React.KeyboardEvent, starIdx: number) => {
    if (readOnly || !onChange) return

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(5, value + 1)
      onChange(next)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const prev = Math.max(1, value - 1)
      onChange(prev)
    } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault()
      onChange(parseInt(e.key, 10))
    }
  }

  if (readOnly) {
    return (
      <div className="inline-flex items-center gap-1" id={id}>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= value
            return (
              <Star
                key={star}
                className={`${sizeClasses[size]} ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 dark:text-slate-700'
                }`}
              />
            )
          })}
        </div>
        {showValue && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">
            {value.toFixed(1)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2" id={id}>
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="Peringkat Bintang"
        onMouseLeave={() => setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= activeValue
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} Bintang`}
              tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => setHoverValue(star)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              className="p-1 rounded-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <Star
                className={`${sizeClasses[size]} transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
      </div>
      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 min-w-[2.5rem]">
        {value > 0 ? `${value} / 5` : 'Pilih'}
      </span>
    </div>
  )
}

