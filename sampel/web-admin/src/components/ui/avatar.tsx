// src/components/ui/avatar.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Avatar sederhana (tanpa Radix).
 * Menyediakan API kompatibel: <Avatar><AvatarImage /><AvatarFallback /></Avatar>
 */

export type AvatarProps = React.HTMLAttributes<HTMLDivElement>;
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Avatar.displayName = 'Avatar';

export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;
export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = '', ...props }, ref) => (
    <img
      ref={ref}
      alt={alt}
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  )
);
AvatarImage.displayName = 'AvatarImage';

export type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement>;
export const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-gray-600',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
AvatarFallback.displayName = 'AvatarFallback';
