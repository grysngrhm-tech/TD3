'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

type LoginState = 'input' | 'checking' | 'sending' | 'sent' | 'error'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<LoginState>('input')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const supabase = createSupabaseBrowserClient()

  // Check for errors in URL (query params or hash fragment)
  useEffect(() => {
    // Check query params
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam))
      setState('error')
      return
    }

    // Check hash fragment (Supabase implicit flow errors)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashError = hashParams.get('error_description') || hashParams.get('error')
      if (hashError) {
        setErrorMessage(decodeURIComponent(hashError.replace(/\+/g, ' ')))
        setState('error')
        // Clean up the URL
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
    }
  }, [searchParams])

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push(redirectTo)
      }
    }
    checkSession()
  }, [supabase, router, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address')
      setState('error')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address')
      setState('error')
      return
    }

    setState('checking')

    try {
      // Check if email is in the allowlist
      const { data: isAllowed, error: checkError } = await supabase
        .rpc('is_allowlisted', { check_email: trimmedEmail })

      if (checkError) {
        console.error('Error checking allowlist:', checkError)
        setErrorMessage('An error occurred. Please try again.')
        setState('error')
        return
      }

      if (!isAllowed) {
        setErrorMessage('This email is not authorized to access TD3. Please contact an administrator.')
        setState('error')
        return
      }

      setState('sending')

      // Send magic link
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (signInError) {
        console.error('Error sending magic link:', signInError)
        setErrorMessage('Failed to send login email. Please try again.')
        setState('error')
        return
      }

      setState('sent')
      toast.success('Check your email', 'We sent you a login link')

    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      setState('error')
    }
  }

  const handleRetry = () => {
    setEmail('')
    setErrorMessage('')
    setState('input')
  }

  return (
    <div className="w-full max-w-md px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-ios p-8"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-ios mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <span className="text-2xl font-bold text-white">TD3</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Welcome to TD3
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Construction Draw Management
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Email Input State */}
          {(state === 'input' || state === 'checking' || state === 'sending') && (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={state !== 'input'}
                  className="input-ios w-full"
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={state !== 'input'}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {state === 'checking' && (
                  <>
                    <LoadingSpinner />
                    Verifying...
                  </>
                )}
                {state === 'sending' && (
                  <>
                    <LoadingSpinner />
                    Sending link...
                  </>
                )}
                {state === 'input' && 'Continue with Email'}
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                We&apos;ll send you a magic link to sign in
              </p>
            </motion.form>
          )}

          {/* Success State */}
          {state === 'sent' && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--success-muted)' }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: 'var(--success)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                We sent a login link to<br />
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Click the link in the email to sign in.
                <br />
                The link expires in 1 hour.
              </p>

              <button
                onClick={handleRetry}
                className="btn-ghost mt-6 text-sm"
              >
                Use a different email
              </button>
            </motion.div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
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
                Unable to sign in
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                {errorMessage}
              </p>

              <button
                onClick={handleRetry}
                className="btn-primary"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
        Tennant Development
      </p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
  )
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-md px-4">
      <div className="card-ios p-8 animate-pulse">
        <div className="w-16 h-16 rounded-ios mx-auto mb-4" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-6 rounded mb-2 mx-auto w-48" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-4 rounded mx-auto w-32 mb-8" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-10 rounded mb-4" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-10 rounded" style={{ background: 'var(--bg-hover)' }} />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  )
}
