'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNavigation } from '@/app/context/NavigationContext'

export default function ApproveDrawPage() {
  const params = useParams()
  const router = useRouter()
  const { setCurrentPageTitle } = useNavigation()
  const drawId = params.id as string

  useEffect(() => {
    // This page is legacy. Canonical workflow uses `/draws/[id]` to stage/fund draws.
    // Keep the route but redirect so old links don’t break.
    router.replace(`/draws/${drawId}`)
  }, [drawId])

  useEffect(() => {
    setCurrentPageTitle('Redirecting…')
  }, [setCurrentPageTitle])

  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

