'use client'

import { cn } from '@/lib/utils'
import { Globe } from 'lucide-react'
import { Toggle } from './ui/toggle'

interface SearchModeToggleProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}

export function SearchModeToggle({
  enabled,
  onEnabledChange
}: SearchModeToggleProps) {
  return (
    <Toggle
      aria-label="Toggle search mode"
      pressed={enabled}
      onPressedChange={onEnabledChange}
      variant="outline"
      className={cn(
        'gap-1 px-3 border border-input text-muted-foreground bg-background',
        'data-[state=on]:bg-accent-blue',
        'data-[state=on]:text-accent-blue-foreground',
        'data-[state=on]:border-accent-blue-border',
        'hover:bg-accent hover:text-accent-foreground rounded-full'
      )}
    >
      <Globe className="size-4" />
      <span className="text-xs">Search</span>
    </Toggle>
  )
}
