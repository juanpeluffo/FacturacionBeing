import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-muted-2 uppercase tracking-wider mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          className={cn(
            'w-full bg-surface-2 border border-border text-white placeholder-muted rounded-md px-3 py-2 text-sm',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none',
            error && 'border-red-500/50',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
