'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WelcomePage } from '../components/welcome'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Use hard redirect - router.push can fail after auth state changes
        window.location.href = redirectTo
      }
    }
    checkSession()
  }, [redirectTo])

  // Check for errors in URL (query params or hash fragment)
  useEffect(() => {
    // Check hash fragment (Supabase implicit flow errors)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashError = hashParams.get('error_description') || hashParams.get('error')
      if (hashError) {
        // Clean up the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [])

  return <WelcomePage redirectTo={redirectTo} />
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="card-ios p-8 animate-pulse">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 bg-background-hover" />
          <div className="h-10 rounded mb-2 mx-auto w-64 bg-background-hover" />
          <div className="h-6 rounded mx-auto w-48 mb-8 bg-background-hover" />
          <div className="h-12 rounded mb-4 bg-background-hover" />
          <div className="h-12 rounded bg-background-hover" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageContent />
    </Suspense>
  )
}
