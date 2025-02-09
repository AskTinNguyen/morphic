'use client'

import { Link } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { SourceQuickInsertProps } from './types'

export function SourceQuickInsert({
  sources,
  onSourceClick,
  searchMode
}: SourceQuickInsertProps) {
  const [open, setOpen] = useState(false)

  if (sources.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            searchMode && 'bg-primary/10 hover:bg-primary/20'
          )}
        >
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-0"
        onInteractOutside={() => setOpen(false)}
      >
        <div className="space-y-2 p-4">
          <h4 className="text-sm font-medium">Quick Insert Sources</h4>
          <p className="text-xs text-muted-foreground">
            Click a source to insert it into your message
          </p>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {sources.map((source) => (
            <button
              key={source.id}
              className="flex w-full items-start space-x-2 p-4 text-left hover:bg-muted/50"
              onClick={() => {
                onSourceClick(source)
                setOpen(false)
              }}
            >
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {source.title || source.url}
                </p>
                {source.snippet && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {source.snippet}
                  </p>
                )}
              </div>
              {source.relevance && (
                <div className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {Math.round(source.relevance * 100)}%
                </div>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
} 