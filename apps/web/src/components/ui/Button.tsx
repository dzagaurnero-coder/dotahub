import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/formatters';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-dh-lime text-dh-bg font-semibold hover:bg-dh-limeHover shadow-dh-lime disabled:bg-dh-lime/50',
  secondary:
    'bg-dh-indigo/15 text-dh-indigo border border-dh-indigo/35 font-semibold hover:bg-dh-indigo/25',
  outline:
    'bg-dh-surface text-dh-text border border-dh-border font-medium hover:bg-dh-surfaceElevated hover:border-dh-textMuted/50',
  ghost:
    'bg-transparent text-dh-textMuted font-medium hover:bg-dh-surfaceElevated hover:text-dh-text',
  danger:
    'bg-dh-danger/15 text-dh-danger border border-dh-danger/35 font-semibold hover:bg-dh-danger/25',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-dh gap-2',
  lg: 'h-12 px-6 text-base rounded-dh gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';