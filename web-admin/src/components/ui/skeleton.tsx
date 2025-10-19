'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} style={style} />
}
