'use client'

import { ReactNode } from 'react'
import { NavigationProvider } from '@/app/context/NavigationContext'

type ProvidersProps = {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NavigationProvider>
      {children}
    </NavigationProvider>
  )
}

