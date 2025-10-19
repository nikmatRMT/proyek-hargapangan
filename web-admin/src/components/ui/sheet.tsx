'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Sheet({
  open,
  onOpenChange,
  children,
}: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onOpenChange])
  return <>{children}</>
}

export function SheetContent({
  className,
  side = 'left',
  children,
  ...props
}: (React.HTMLAttributes<HTMLDivElement> & { side?: 'left' | 'right' })) {
  return (
    <div
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
}
