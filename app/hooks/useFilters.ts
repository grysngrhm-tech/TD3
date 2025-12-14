'use client'

import { useState, useCallback } from 'react'

export type FilterState = Record<string, string[]>

export function useFilters(initialState: FilterState = {}) {
  const [filters, setFilters] = useState<FilterState>(initialState)

  const toggleFilter = useCallback((sectionId: string, optionId: string) => {
    setFilters(prev => {
      const currentSelection = prev[sectionId] || []
      const isSelected = currentSelection.includes(optionId)
      
      return {
        ...prev,
        [sectionId]: isSelected
          ? currentSelection.filter(id => id !== optionId)
          : [...currentSelection, optionId]
      }
    })
  }, [])

  const setFilter = useCallback((sectionId: string, optionIds: string[]) => {
    setFilters(prev => ({
      ...prev,
      [sectionId]: optionIds
    }))
  }, [])

  const clearAll = useCallback(() => {
    setFilters({})
  }, [])

  const clearSection = useCallback((sectionId: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[sectionId]
      return newFilters
    })
  }, [])

  return {
    filters,
    toggleFilter,
    setFilter,
    clearAll,
    clearSection
  }
}
