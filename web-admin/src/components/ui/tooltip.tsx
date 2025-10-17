'use client'
import * as React from 'react'
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
export function TooltipTrigger({ asChild, children }: any) {
  return asChild ? children : <span>{children}</span>
}
export function TooltipContent(props: React.HTMLAttributes<HTMLDivElement>) {
  // Versi minimal (tanpa popper). Boleh diperkaya nanti.
  if ((props as any).hidden) return null
  return (
    <div className="absolute left-full ml-2 rounded bg-black px-2 py-1 text-xs text-white">
      {props.children}
    </div>
  )
}
