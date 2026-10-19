import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/formatters';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="h-10 w-10 text-dh-textMuted" />,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-dh-lg border border-dashed border-dh-border bg-dh-surface/40 p-10 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dh-surfaceElevated">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-dh-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-dh-textMuted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};