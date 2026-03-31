'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Dialog({ open, onClose, title, description, children, className, size = 'md' }: DialogProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          'relative w-full bg-surface border border-border rounded-xl shadow-2xl animate-fade-in',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-4">
            <div>
              {title && (
                <h2 className="font-syne font-bold text-lg text-white">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-white transition-colors ml-4 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={cn(!title && !description && 'pt-6', 'px-6 pb-6')}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border', className)}>
      {children}
    </div>
  )
}
