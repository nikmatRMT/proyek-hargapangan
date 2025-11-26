'use client'
import { useEffect, useState } from 'react'
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const m = () => setIsMobile(window.innerWidth < breakpoint)
    m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m)
  }, [breakpoint])
  return isMobile
}
