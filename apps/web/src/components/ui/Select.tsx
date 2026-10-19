import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/formatters';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-dh-textMuted">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-10 w-full appearance-none rounded-dh border border-dh-border bg-dh-bgSecondary pl-3.5 pr-9 text-sm text-dh-text transition-colors focus:border-dh-lime focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-dh-danger',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-dh-surface text-dh-text">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-textMuted"
            aria-hidden="true"
          />
        </div>
        {error && <p className="text-xs font-medium text-dh-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';