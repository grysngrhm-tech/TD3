'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useTheme } from '@/app/hooks/useTheme'
import { loadPreferences, savePreferences, setLocalPreferences } from '@/lib/preferences'
import { toast } from '@/app/components/ui/Toast'
import type { UserPreferences, Theme, FontSize, DefaultDashboard } from '@/types/custom'
import { DEFAULT_PREFERENCES } from '@/types/custom'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; preview: string }[] = [
  { value: 'small', label: 'Small', preview: 'Aa' },
  { value: 'medium', label: 'Medium', preview: 'Aa' },
  { value: 'large', label: 'Large', preview: 'Aa' },
]

const DASHBOARD_OPTIONS: { value: DefaultDashboard; label: string; description: string }[] = [
  { value: 'portfolio', label: 'Portfolio', description: 'Active loans overview' },
  { value: 'draws', label: 'Draws', description: 'Draw processing queue' },
]

export function PreferencesTab() {
  const { user } = useAuth()
  const { theme: currentTheme, setTheme } = useTheme()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load preferences from database
  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const prefs = await loadPreferences(user.id)
        setPreferences(prefs)
        // Sync theme with loaded preferences
        if (prefs.theme !== currentTheme) {
          setTheme(prefs.theme)
        }
      } catch (err) {
        console.error('Error loading preferences:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!user) return

    const newPrefs = { ...preferences, [key]: value }
    setPreferences(newPrefs)

    // Apply immediately to UI
    if (key === 'theme') {
      setTheme(value as Theme)
    }
    if (key === 'fontSize') {
      applyFontSize(value as FontSize)
    }
    if (key === 'reducedMotion') {
      applyReducedMotion(value as boolean)
    }

    // Save to localStorage for immediate persistence
    setLocalPreferences(newPrefs)

    // Save to database
    setIsSaving(true)
    try {
      const success = await savePreferences(user.id, newPrefs)
      if (!success) {
        toast.error('Failed to save preference')
      }
    } catch (err) {
      console.error('Error saving preference:', err)
      toast.error('Failed to save preference')
    } finally {
      setIsSaving(false)
    }
  }

  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
    root.classList.add(`font-size-${size}`)
  }

  const applyReducedMotion = (reduced: boolean) => {
    const root = document.documentElement
    if (reduced) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }
  }

  // Apply preferences on load
  useEffect(() => {
    if (!isLoading) {
      applyFontSize(preferences.fontSize)
      applyReducedMotion(preferences.reducedMotion)
    }
  }, [isLoading, preferences.fontSize, preferences.reducedMotion])

  if (isLoading) {
    return (
      <div className="card-ios">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 rounded" style={{ background: 'var(--bg-hover)' }} />
          <div className="space-y-3">
            <div className="h-10 rounded" style={{ background: 'var(--bg-hover)' }} />
            <div className="h-10 rounded" style={{ background: 'var(--bg-hover)' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Appearance Section */}
      <div className="card-ios">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Appearance
        </h2>

        {/* Theme Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Theme
          </label>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updatePreference('theme', option.value)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  preferences.theme === option.value
                    ? 'border-[var(--accent)]'
                    : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                }`}
                style={{
                  background: preferences.theme === option.value ? 'var(--accent-muted)' : 'var(--bg-secondary)',
                  color: preferences.theme === option.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {option.icon}
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Font Size
          </label>
          <div className="flex gap-2">
            {FONT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updatePreference('fontSize', option.value)}
                className={`flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-lg border-2 transition-all ${
                  preferences.fontSize === option.value
                    ? 'border-[var(--accent)]'
                    : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                }`}
                style={{
                  background: preferences.fontSize === option.value ? 'var(--accent-muted)' : 'var(--bg-secondary)',
                  color: preferences.fontSize === option.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <span
                  className="font-serif"
                  style={{
                    fontSize: option.value === 'small' ? '14px' : option.value === 'medium' ? '18px' : '22px',
                  }}
                >
                  {option.preview}
                </span>
                <span className="text-xs mt-1">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reduced Motion Toggle */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Reduce Motion
              </label>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Minimize animations throughout the app
              </p>
            </div>
            <button
              onClick={() => updatePreference('reducedMotion', !preferences.reducedMotion)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.reducedMotion ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'
              }`}
              role="switch"
              aria-checked={preferences.reducedMotion}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Default Dashboard Section */}
      <div className="card-ios">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Default View
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Choose which dashboard to show when you first sign in
        </p>

        <div className="space-y-2">
          {DASHBOARD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updatePreference('defaultDashboard', option.value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                preferences.defaultDashboard === option.value
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--border)] hover:border-[var(--text-muted)]'
              }`}
              style={{
                background: preferences.defaultDashboard === option.value ? 'var(--accent-muted)' : 'var(--bg-secondary)',
              }}
            >
              <div>
                <span
                  className="text-sm font-medium"
                  style={{ color: preferences.defaultDashboard === option.value ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {option.label}
                </span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {option.description}
                </p>
              </div>
              {preferences.defaultDashboard === option.value && (
                <svg className="w-5 h-5" fill="var(--accent)" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--bg-card)', boxShadow: 'var(--elevation-3)' }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
        </div>
      )}
    </div>
  )
}
