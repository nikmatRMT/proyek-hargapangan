'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'icon' | 'sm' | 'lg'
}

const base =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-green-600 text-white hover:bg-green-700',
  ghost: 'bg-transparent hover:bg-sidebar-accent',
  outline: 'border border-sidebar-border hover:bg-sidebar-accent',
}
const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-3',
  icon: 'h-9 w-9 p-0',
  sm: 'h-8 px-2',
  lg: 'h-10 px-4',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'
