import React from 'react';
import { cn } from '@/lib/formatters';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-dh bg-dh-surfaceElevated/80', className)}
      {...props}
    />
  );
};