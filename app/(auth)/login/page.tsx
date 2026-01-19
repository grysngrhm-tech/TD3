'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

type LoginState = 'input' | 'checking' | 'sending' | 'verify' | 'verifying' | 'error'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<LoginState>('input')
  const [errorMessage, setErrorMessage] = useState('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '', '', ''])
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
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

      // Send OTP code (no emailRedirectTo = sends 6-digit code instead of magic link)
      // This prevents email security scanners from consuming the auth token
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
      })

      if (signInError) {
        console.error('Error sending OTP code:', signInError)
        setErrorMessage('Failed to send verification code. Please try again.')
        setState('error')
        return
      }

      setState('verify')
      toast.success('Check your email', 'We sent you an 8-digit code')

    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      setState('error')
    }
  }

  const handleRetry = () => {
    setEmail('')
    setErrorMessage('')
    setOtpCode(['', '', '', '', '', '', '', ''])
    setState('input')
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)

    const newOtp = [...otpCode]
    newOtp[index] = digit
    setOtpCode(newOtp)

    // Auto-focus next input
    if (digit && index < 7) {
      otpInputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 8 digits entered
    if (digit && index === 7 && newOtp.every(d => d !== '')) {
      handleVerifyOtp(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace - go to previous input
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
    if (pasted.length > 0) {
      const newOtp = [...otpCode]
      for (let i = 0; i < pasted.length && i < 8; i++) {
        newOtp[i] = pasted[i]
      }
      setOtpCode(newOtp)

      // Focus appropriate input
      const focusIndex = Math.min(pasted.length, 7)
      otpInputRefs.current[focusIndex]?.focus()

      // Auto-submit if 8 digits pasted
      if (pasted.length === 8) {
        handleVerifyOtp(pasted)
      }
    }
  }

  const handleVerifyOtp = async (code?: string) => {
    const verifyCode = code || otpCode.join('')

    if (verifyCode.length !== 8) {
      setErrorMessage('Please enter all 8 digits')
      setState('error')
      return
    }

    setState('verifying')

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: verifyCode,
        type: 'email',
      })

      if (verifyError) {
        console.error('OTP verification error:', verifyError)
        setErrorMessage(verifyError.message || 'Invalid or expired code. Please try again.')
        setOtpCode(['', '', '', '', '', '', '', ''])
        setState('verify')
        // Focus first input after error
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
        return
      }

      if (data.user) {
        toast.success('Signed in successfully')
        router.push(redirectTo)
      }
    } catch (err) {
      console.error('Verification error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      setState('error')
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-ios p-8"
        style={{
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-ios mx-auto mb-4 flex items-center justify-center"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 4px 16px rgba(149, 6, 6, 0.25)',
            }}
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
                    Sending code...
                  </>
                )}
                {state === 'input' && 'Continue with Email'}
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                We&apos;ll send you a verification code to sign in
              </p>
            </motion.form>
          )}

          {/* OTP Verification State */}
          {(state === 'verify' || state === 'verifying') && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--accent-muted)' }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: 'var(--accent)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Enter verification code
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                We sent an 8-digit code to<br />
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>

              {/* 8-digit OTP input */}
              <div className="flex justify-center gap-1.5 mb-6">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    disabled={state === 'verifying'}
                    autoFocus={index === 0}
                    className="w-10 h-12 text-center text-xl font-mono rounded-ios"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-secondary)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>

              {state === 'verifying' && (
                <div className="flex items-center justify-center gap-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                  <LoadingSpinner />
                  <span className="text-sm">Verifying...</span>
                </div>
              )}

              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                The code expires in 5 minutes.
              </p>

              <button
                onClick={handleRetry}
                className="btn-ghost text-sm"
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
