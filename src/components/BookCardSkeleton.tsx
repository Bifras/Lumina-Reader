import { memo } from 'react'
import { motion } from 'framer-motion'

interface BookCardSkeletonProps {
  viewMode?: 'grid' | 'list' | 'compact'
  cardSize?: number
}

const BookCardSkeleton = memo(function BookCardSkeleton({
  viewMode = 'grid',
  cardSize = 180
}: BookCardSkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div 
        className="book-card book-card--list skeleton"
        style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr auto',
          gap: 'var(--space-md)',
          alignItems: 'center',
          padding: '0.75rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px'
        }}
      >
        <div 
          className="skeleton-pulse" 
          style={{ height: '100px', width: '80px', borderRadius: '6px', background: 'var(--surface-hover)' }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-pulse" style={{ height: '18px', width: '60%', borderRadius: '4px', background: 'var(--surface-hover)' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '40%', borderRadius: '4px', background: 'var(--surface-hover)' }} />
        </div>
      </div>
    )
  }

  const coverHeight = viewMode === 'compact' ? 160 : Math.round(cardSize * 1.5)

  return (
    <div 
      className="book-card skeleton"
      style={{ width: viewMode === 'compact' ? 'auto' : `${cardSize}px` }}
    >
      <div 
        className="skeleton-pulse" 
        style={{ 
          height: `${coverHeight}px`, 
          width: '100%', 
          borderRadius: '12px', 
          background: 'var(--surface-hover)',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)'
        }} 
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <div className="skeleton-pulse" style={{ height: '16px', width: '80%', borderRadius: '4px', background: 'var(--surface-hover)' }} />
        <div className="skeleton-pulse" style={{ height: '12px', width: '50%', borderRadius: '4px', background: 'var(--surface-hover)' }} />
      </div>
    </div>
  )
})

export default BookCardSkeleton
