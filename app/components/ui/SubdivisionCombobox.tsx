'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

type SubdivisionOption = {
  name: string
  abbrev: string | null
}

type SubdivisionComboboxProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

// Generate abbreviation from subdivision name (first letters of each word)
function generateAbbrev(name: string): string {
  if (!name.trim()) return ''
  return name
    .trim()
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase() || '')
    .join('')
}

// Score how well a subdivision matches the search term
function getMatchScore(subdivision: string, searchTerm: string): number {
  const subdLower = subdivision.toLowerCase()
  const termLower = searchTerm.toLowerCase()
  
  // Exact match (highest priority)
  if (subdLower === termLower) return 100
  
  // Exact prefix match
  if (subdLower.startsWith(termLower)) return 90
  
  // Word-start match (e.g., "Disc" matches "Discovery")
  const words = subdLower.split(/\s+/)
  for (const word of words) {
    if (word.startsWith(termLower)) return 80
  }
  
  // Contains match
  if (subdLower.includes(termLower)) return 50
  
  // No match
  return 0
}

export function SubdivisionCombobox({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = 'Search or create subdivision...'
}: SubdivisionComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [subdivisions, setSubdivisions] = useState<SubdivisionOption[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Load subdivisions on mount
  useEffect(() => {
    loadSubdivisions()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset input to selected value if user clicks away without selecting
        if (inputValue !== value && !filteredOptions.some(opt => opt.name.toLowerCase() === inputValue.toLowerCase())) {
          setInputValue(value)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputValue, value])

  async function loadSubdivisions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('subdivision_name, subdivision_abbrev')
        .not('subdivision_name', 'is', null)
        .order('subdivision_name', { ascending: true })

      if (error) throw error

      // Extract unique subdivisions
      const uniqueSubdivisions = new Map<string, SubdivisionOption>()
      data?.forEach(row => {
        if (row.subdivision_name && !uniqueSubdivisions.has(row.subdivision_name)) {
          uniqueSubdivisions.set(row.subdivision_name, {
            name: row.subdivision_name,
            abbrev: row.subdivision_abbrev || null
          })
        }
      })

      setSubdivisions(Array.from(uniqueSubdivisions.values()))
    } catch (err) {
      console.error('Failed to load subdivisions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort subdivisions based on input
  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) {
      return subdivisions
    }

    const term = inputValue.trim()
    const scored = subdivisions
      .map(sub => ({
        ...sub,
        score: getMatchScore(sub.name, term)
      }))
      .filter(sub => sub.score > 0)
      .sort((a, b) => b.score - a.score)

    return scored
  }, [subdivisions, inputValue])

  // Check if current input is a new subdivision (not in existing list)
  const isNewSubdivision = useMemo(() => {
    if (!inputValue.trim()) return false
    const termLower = inputValue.trim().toLowerCase()
    return !subdivisions.some(sub => sub.name.toLowerCase() === termLower)
  }, [inputValue, subdivisions])

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length, isNewSubdivision])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
  }

  const handleSelectOption = (name: string) => {
    setInputValue(name)
    onChange(name)
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleCreateNew = () => {
    const trimmed = inputValue.trim()
    if (trimmed) {
      onChange(trimmed)
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalOptions = filteredOptions.length + (isNewSubdivision ? 1 : 0)
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setIsOpen(true)
        setHighlightedIndex(prev => (prev + 1) % totalOptions)
        break
      case 'ArrowUp':
        e.preventDefault()
        setIsOpen(true)
        setHighlightedIndex(prev => (prev - 1 + totalOptions) % totalOptions)
        break
      case 'Enter':
        e.preventDefault()
        if (isOpen && totalOptions > 0) {
          // If "Create new" option is highlighted
          if (isNewSubdivision && highlightedIndex === 0) {
            handleCreateNew()
          } else {
            const optionIndex = isNewSubdivision ? highlightedIndex - 1 : highlightedIndex
            if (filteredOptions[optionIndex]) {
              handleSelectOption(filteredOptions[optionIndex].name)
            }
          }
        } else if (inputValue.trim()) {
          // If dropdown is closed but there's input, accept it
          onChange(inputValue.trim())
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setInputValue(value)
        inputRef.current?.blur()
        break
      case 'Tab':
        if (isOpen) {
          setIsOpen(false)
          // Accept current input on tab
          if (inputValue.trim() && inputValue.trim() !== value) {
            onChange(inputValue.trim())
          }
        }
        break
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleBlur = () => {
    // Small delay to allow click events on options to fire
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
      }
    }, 150)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
        Subdivision <span style={{ color: 'var(--error)' }}>*</span>
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="input w-full pr-8"
          autoComplete="off"
        />
        
        {/* Dropdown indicator */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            if (!isOpen) inputRef.current?.focus()
          }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-opacity-50 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          tabIndex={-1}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {loading ? (
            <div className="p-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              Loading subdivisions...
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {/* Create new option - shown when input doesn't match existing */}
              {isNewSubdivision && inputValue.trim() && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  onMouseEnter={() => setHighlightedIndex(0)}
                  className="w-full p-3 text-left transition-colors flex items-center gap-2"
                  style={{ 
                    background: highlightedIndex === 0 ? 'var(--bg-hover)' : undefined,
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <svg 
                    className="w-4 h-4 flex-shrink-0" 
                    style={{ color: 'var(--accent)' }} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Create </span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      "{inputValue.trim()}"
                    </span>
                    <span 
                      className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                    >
                      {generateAbbrev(inputValue.trim())}
                    </span>
                  </div>
                </button>
              )}

              {/* Existing subdivision options */}
              {filteredOptions.length === 0 && !isNewSubdivision ? (
                <div className="p-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  {inputValue.trim() ? 'No matching subdivisions' : 'No subdivisions yet'}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const optionIndex = isNewSubdivision ? index + 1 : index
                  return (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => handleSelectOption(option.name)}
                      onMouseEnter={() => setHighlightedIndex(optionIndex)}
                      className="w-full p-3 text-left transition-colors flex items-center justify-between"
                      style={{ 
                        background: highlightedIndex === optionIndex ? 'var(--bg-hover)' : undefined 
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {option.name}
                        </span>
                        {option.abbrev && (
                          <span 
                            className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                          >
                            {option.abbrev}
                          </span>
                        )}
                      </div>
                      {option.name === value && (
                        <svg 
                          className="w-4 h-4 flex-shrink-0" 
                          style={{ color: 'var(--accent)' }} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}

          {/* Helper text at bottom */}
          <div 
            className="px-3 py-2 text-xs border-t"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
          >
            <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-hover)' }}>↑↓</kbd> to navigate, 
            <kbd className="px-1 py-0.5 rounded text-xs ml-1" style={{ background: 'var(--bg-hover)' }}>Enter</kbd> to select, 
            <kbd className="px-1 py-0.5 rounded text-xs ml-1" style={{ background: 'var(--bg-hover)' }}>Esc</kbd> to close
          </div>
        </div>
      )}
    </div>
  )
}

