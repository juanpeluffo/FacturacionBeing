import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
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
        <input
          type={type}
          id={inputId}
          className={cn(
            'w-full bg-surface-2 border border-border text-white placeholder-muted rounded-md px-3 py-2 text-sm',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
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
Input.displayName = 'Input'

export { Input }
