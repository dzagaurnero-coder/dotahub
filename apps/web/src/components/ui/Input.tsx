import React, { useId } from 'react';
import { cn } from '@/lib/formatters';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-dh-textMuted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 text-dh-textMuted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'h-10 w-full rounded-dh border border-dh-border bg-dh-bgSecondary px-3.5 text-sm text-dh-text placeholder:text-dh-textMuted/60 transition-colors focus:border-dh-lime focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightElement && 'pr-10',
              error && 'border-dh-danger focus:border-dh-danger',
              className
            )}
            {...props}
          />
          {rightElement && <div className="absolute right-2.5 flex items-center">{rightElement}</div>}
        </div>
        {error ? (
          <p id={errorId} className="text-xs font-medium text-dh-danger">
            {error}
          </p>
        ) : (
          hint && <p className="text-xs text-dh-textMuted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';