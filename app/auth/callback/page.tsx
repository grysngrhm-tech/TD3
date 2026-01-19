'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code')
      const redirect = searchParams.get('redirect') || '/'

      if (!code) {
        console.error('No code parameter in callback URL')
        setError('Missing authentication code')
        return
      }

      try {
        const supabase = createSupabaseBrowserClient()

        console.log('Exchanging code for session...')
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError.message)
          setError(exchangeError.message)
          return
        }

        console.log('Successfully authenticated:', data.user?.email)

        // Redirect to the intended destination
        router.push(redirect)
      } catch (err) {
        console.error('Unexpected error during auth callback:', err)
        setError('An unexpected error occurred')
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center p-8 max-w-md">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--error-muted)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--error)' }}
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
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Authentication Failed
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/login')}
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-4"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <p style={{ color: 'var(--text-muted)' }}>Completing sign in...</p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-4"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
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
