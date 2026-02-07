'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Debug: Log the full URL and all params
      console.log('=== AUTH CALLBACK DEBUG ===')
      console.log('Full URL:', window.location.href)
      console.log('Search params:', window.location.search)
      console.log('Hash:', window.location.hash)

      const code = searchParams.get('code')
      const redirect = searchParams.get('redirect') || '/'

      console.log('Code from searchParams:', code)
      console.log('Redirect:', redirect)
      console.log('All params:', Object.fromEntries(searchParams.entries()))

      // Check if there's an error in the URL (Supabase might send error params)
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      if (errorParam || errorDescription) {
        console.error('Supabase returned error:', errorParam, errorDescription)
        setError(errorDescription || errorParam || 'Authentication error from provider')
        return
      }

      if (!code) {
        console.error('No code parameter in callback URL')
        console.error('This usually means: 1) Old/expired link clicked, 2) Link already used, 3) Verification failed')
        setError('Missing authentication code. Please request a new login link.')
        return
      }

      try {
        console.log('Exchanging code for session...')
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError.message)
          setError(exchangeError.message)
          return
        }

        console.log('Successfully authenticated:', data.user?.email)

        // Redirect to the intended destination
        // Use window.location.href for reliable auth redirect
        window.location.href = redirect
      } catch (err) {
        console.error('Unexpected error during auth callback:', err)
        setError('An unexpected error occurred')
      }
    }

    handleAuthCallback()
  }, [searchParams])

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center p-8 max-w-md">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-error-muted"
          >
            <svg
              className="w-8 h-8 text-error"
              
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2 text-text-primary">
            Authentication Failed
          </h2>
          <p className="text-sm mb-6 text-text-muted">
            {error}
          </p>
          <button
            onClick={() => { window.location.href = '/login' }}
            className="btn-primary"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  // Show loading state while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-text-muted">Completing sign in...</p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-text-muted">Loading...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
