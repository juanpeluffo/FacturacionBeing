import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
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
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            className={cn(
              'w-full appearance-none bg-surface-2 border border-border text-white rounded-md px-3 py-2 text-sm pr-8',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors',
              error && 'border-red-500/50',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface-2">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
