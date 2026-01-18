'use client'

import { ReactNode } from 'react'
import { NavigationProvider } from '@/app/context/NavigationContext'
import { AuthProvider } from '@/app/context/AuthContext'
import { FirstLoginModal } from '@/app/components/auth/FirstLoginModal'

type ProvidersProps = {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <NavigationProvider>
        {children}
        <FirstLoginModal />
      </NavigationProvider>
    </AuthProvider>
  )
}

