"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SelectCtx = {
  value?: string
  setValue: (v: string) => void
  open: boolean
  setOpen: (v: boolean) => void
  placeholder?: string
}
const Ctx = React.createContext<SelectCtx | null>(null)

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (v: any) => void
  children: React.ReactNode
}) {
  const [internal, setInternal] = React.useState<string | undefined>(value)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (value !== undefined) setInternal(value)
  }, [value])

  const setValue = (v: string) => {
    setInternal(v)
    onValueChange?.(v as any)
    setOpen(false)
  }

  return (
    <Ctx.Provider value={{ value: internal, setValue, open, setOpen }}>
      <div className="relative w-full">{children}</div>
    </Ctx.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(Ctx)
  if (!ctx) return null
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600",
        className
      )}
      onClick={(e) => {
        props.onClick?.(e)
        ctx.setOpen(!ctx.open)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export function SelectValue({
  placeholder,
  className,
}: { placeholder?: string; className?: string }) {
  const ctx = React.useContext(Ctx)
  if (!ctx) return null
  return (
    <span className={cn("truncate", className)}>
      {ctx.value ?? placeholder ?? "Pilih"}
    </span>
  )
}

export function SelectContent({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(Ctx)
  if (!ctx || !ctx.open) return null
  return (
    <div
      className={cn(
        "absolute z-50 mt-2 w-full rounded-md border bg-white p-1 shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
}

export function SelectItem({
  value,
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(Ctx)
  if (!ctx) return null
  const active = ctx.value === value
  return (
    <div
      role="option"
      aria-selected={active}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-green-50 hover:text-green-700",
        active && "bg-green-50 text-green-700 font-medium",
        className
      )}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </div>
  )
}
