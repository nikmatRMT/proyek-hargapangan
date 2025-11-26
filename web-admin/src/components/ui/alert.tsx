import * as React from "react"
import { cn } from "@/lib/utils"

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }) {
  const base =
    "flex items-start gap-2 rounded-md border p-3 text-sm"
  const variants = {
    default: "border-gray-200 bg-gray-50 text-gray-800",
    destructive: "border-red-200 bg-red-50 text-red-800",
  }
  return <div className={cn(base, variants[variant], className)} {...props} />
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed", className)} {...props} />
}
