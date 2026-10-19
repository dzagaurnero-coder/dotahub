import React, { useState } from 'react';
import { cn } from '@/lib/formatters';

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  fallbackSrc = '/images/item-fallback.svg',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const activeSrc = !src || hasError ? fallbackSrc : src;

  return (
    <img
      src={activeSrc}
      alt={alt || 'Предмет DotaHub'}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      className={cn('object-contain transition-transform duration-300', className)}
      {...props}
    />
  );
};