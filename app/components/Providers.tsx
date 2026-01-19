'use client'

import { ReactNode } from 'react'
import { NavigationProvider } from '@/app/context/NavigationContext'
import { AuthProvider } from '@/app/context/AuthContext'

type ProvidersProps = {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <NavigationProvider>
        {children}
      </NavigationProvider>
    </AuthProvider>
  )
}

