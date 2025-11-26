'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

type SheetProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export function Sheet({
  open,
  onOpenChange,
  children,
  ...props
}: SheetProps) {
  React.useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onOpenChange])
  return <>{children}</>
}

type SheetContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: 'left' | 'right'
}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = 'left', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'fixed inset-y-0 z-50 w-72 bg-sidebar text-sidebar-foreground shadow-lg p-4',
        side === 'left' ? 'left-0' : 'right-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
SheetContent.displayName = 'SheetContent'
