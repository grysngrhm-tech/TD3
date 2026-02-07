'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'

type LoginState = 'input' | 'checking' | 'sending' | 'verify' | 'verifying' | 'error'

interface LoginFormProps {
  redirectTo?: string
  compact?: boolean
  className?: string
  onStateChange?: (state: LoginState) => void
}

export function LoginForm({
  redirectTo = '/',
  compact = false,
  className = '',
  onStateChange
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<LoginState>('input')
  const [errorMessage, setErrorMessage] = useState('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '', '', ''])
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const updateState = (newState: LoginState) => {
    setState(newState)
    onStateChange?.(newState)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address')
      updateState('error')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address')
      updateState('error')
      return
    }

    updateState('checking')

    try {
      const { data: isAllowed, error: checkError } = await supabase
        .rpc('is_allowlisted', { check_email: trimmedEmail })

      if (checkError) {
        console.error('Error checking allowlist:', checkError)
        setErrorMessage('An error occurred. Please try again.')
        updateState('error')
        return
      }

      if (!isAllowed) {
        setErrorMessage('This email is not authorized to access TD3. Please contact an administrator.')
        updateState('error')
        return
      }

      updateState('sending')

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
      })

      if (signInError) {
        console.error('Error sending OTP code:', signInError)
        setErrorMessage('Failed to send verification code. Please try again.')
        updateState('error')
        return
      }

      updateState('verify')
      toast.success('Check your email', 'We sent you an 8-digit code')

    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      updateState('error')
    }
  }

  const handleRetry = () => {
    setEmail('')
    setErrorMessage('')
    setOtpCode(['', '', '', '', '', '', '', ''])
    updateState('input')
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)

    const newOtp = [...otpCode]
    newOtp[index] = digit
    setOtpCode(newOtp)

    if (digit && index < 7) {
      otpInputRefs.current[index + 1]?.focus()
    }

    if (digit && index === 7 && newOtp.every(d => d !== '')) {
      handleVerifyOtp(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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

      const focusIndex = Math.min(pasted.length, 7)
      otpInputRefs.current[focusIndex]?.focus()

      if (pasted.length === 8) {
        handleVerifyOtp(pasted)
      }
    }
  }

  const handleVerifyOtp = async (code?: string) => {
    const verifyCode = code || otpCode.join('')

    if (verifyCode.length !== 8) {
      setErrorMessage('Please enter all 8 digits')
      updateState('error')
      return
    }

    updateState('verifying')

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: verifyCode,
        type: 'email',
      })

      if (verifyError) {
        console.error('OTP verification failed:', verifyError)

        let userMessage = 'Invalid or expired code. Please try again.'
        if (verifyError.message?.toLowerCase().includes('expired')) {
          userMessage = 'Code expired. Please request a new one.'
        } else if (verifyError.message?.toLowerCase().includes('invalid')) {
          userMessage = 'Invalid code. Please check and try again.'
        } else if (verifyError.message) {
          userMessage = verifyError.message
        }

        setErrorMessage(userMessage)
        setOtpCode(['', '', '', '', '', '', '', ''])
        updateState('verify')
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
        return
      }

      if (data.session || data.user) {
        const userId = data.session?.user?.id || data.user?.id
        const userEmail = data.session?.user?.email || data.user?.email

        if (userId && userEmail) {
          try {
            await supabase
              .from('profiles')
              .upsert(
                { id: userId, email: userEmail },
                { onConflict: 'id', ignoreDuplicates: true }
              )
          } catch (profileErr) {
            console.warn('Profile creation fallback failed:', profileErr)
          }

          try {
            fetch('/api/activity/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              }),
            }).catch(() => {})
          } catch {
            // Ignore
          }
        }

        toast.success('Signed in successfully')
        window.location.href = redirectTo
      } else {
        console.warn('Verification returned no error but no session:', data)
        setErrorMessage('Verification succeeded but session was not created. Please try again.')
        updateState('error')
      }
    } catch (err) {
      console.error('Verification error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      updateState('error')
    }
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {/* Email Input State */}
        {(state === 'input' || state === 'checking' || state === 'sending') && (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className={compact ? 'flex gap-3' : 'space-y-4'}
          >
            <div className={compact ? 'flex-1' : ''}>
              {!compact && (
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5 text-text-secondary"
                  
                >
                  Email address
                </label>
              )}
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={compact ? 'Enter your email' : 'you@tennantdevelopments.com'}
                disabled={state !== 'input'}
                className="input-ios w-full"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={state !== 'input'}
              className={`btn-primary flex items-center justify-center gap-2 ${compact ? 'px-6 whitespace-nowrap' : 'w-full'}`}
            >
              {state === 'checking' && (
                <>
                  <LoadingSpinner size="sm" variant="white" />
                  {!compact && 'Verifying...'}
                </>
              )}
              {state === 'sending' && (
                <>
                  <LoadingSpinner size="sm" variant="white" />
                  {!compact && 'Sending code...'}
                </>
              )}
              {state === 'input' && (compact ? 'Sign In' : 'Continue with Email')}
            </button>

            {!compact && (
              <p className="text-xs text-center text-text-muted">
                We&apos;ll send you a verification code to sign in
              </p>
            )}
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
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-accent-muted"
            >
              <svg
                className="w-6 h-6 text-accent"
                
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
            <h2 className="text-base font-semibold mb-1 text-text-primary">
              Enter verification code
            </h2>
            <p className="text-sm mb-4 text-text-muted">
              Sent to <strong className="text-text-primary">{email}</strong>
            </p>

            <div className="flex justify-center gap-1.5 mb-4">
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
                  className="w-9 h-11 text-center text-lg font-mono rounded-ios"
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
              <div className="flex items-center justify-center gap-2 mb-3 text-text-muted">
                <LoadingSpinner size="sm" variant="white" />
                <span className="text-sm">Verifying...</span>
              </div>
            )}

            <p className="text-xs mb-3 text-text-muted">
              Code expires in 5 minutes
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
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-error-muted"
            >
              <svg
                className="w-6 h-6 text-error"
                
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
            <h2 className="text-base font-semibold mb-1 text-text-primary">
              Unable to sign in
            </h2>
            <p className="text-sm mb-4 text-text-muted">
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
    </div>
  )
}

export default LoginForm
