'use client'

import { useRouter } from 'next/navigation'

export function NavBackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 px-3 py-2 rounded-ios-sm transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
      <span className="text-sm font-medium">Back</span>
    </button>
  )
}

