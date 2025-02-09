'use client'

import { AttachmentFile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { uploadFile, validateFile } from '@/lib/utils/upload'
import { Message } from 'ai'
import { ArrowUp, MessageCirclePlus, Square } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'
import { FileDropzone } from './chat/FileDropzone'
import { ImagePreview } from './chat/ImagePreview'
import { EmptyScreen } from './empty-screen'
import { ModelSelector } from './model-selector'
import { SearchModeToggle } from './search-mode-toggle'
import { Button } from './ui/button'
import { IconLogo } from './ui/icons'

interface UploadResponse {
  url: string
}

interface ChatPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  messages: Message[]
  setMessages: (messages: Message[]) => void
  query?: string
  stop: () => void
  append: (message: Message) => void
  //suggestions?: AutocompleteSuggestion[]
  //sources?: ResearchSource[]
  onSearchModeChange?: (enabled: boolean) => void
}

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  setMessages,
  query,
  stop,
  append,
  //suggestions = [],
  //sources = [],
  // onSearchModeChange
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false) // Composition state
  const [enterDisabled, setEnterDisabled] = useState(false) // Disable Enter after composition ends
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [dropzoneActive, setDropzoneActive] = useState(false)

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => {
      setEnterDisabled(false)
    }, 300)
  }

  const handleNewChat = () => {
    setMessages([])
    router.push('/')
  }

  const handleFileAccepted = async (files: File[]) => {
    const newAttachments: AttachmentFile[] = []

    for (const file of files) {
      try {
        validateFile(file)
        const id = nanoid()
        const type = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'document' : 'other'
        
        // Create preview URL for images
        const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined

        const attachment: AttachmentFile = {
          id,
          file,
          type,
          previewUrl,
          status: 'uploading',
          progress: 0
        }

        newAttachments.push(attachment)
        setAttachments(prev => [...prev, attachment])

        // Start upload
        try {
          const response = await uploadFile(file, (progress) => {
            setAttachments(prev =>
              prev.map(a =>
                a.id === id ? { ...a, progress } : a
              )
            )
          }) as UploadResponse

          // Update attachment with upload result
          setAttachments(prev =>
            prev.map(a =>
              a.id === id
                ? {
                    ...a,
                    status: 'ready',
                    progress: 100,
                    url: response.url
                  }
                : a
            )
          )
        } catch (error) {
          setAttachments(prev =>
            prev.map(a =>
              a.id === id
                ? {
                    ...a,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed'
                  }
                : a
            )
          )
        }
      } catch (error) {
        // Handle validation error
        console.error('File validation error:', error)
      }
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id)
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
      return prev.filter(a => a.id !== id)
    })
  }

  useEffect(() => {
    if (isFirstRender.current && query && query.trim().length > 0) {
      append({
        role: 'user',
        content: query,
        id: nanoid()
      })
      isFirstRender.current = false
    }
  }, [query, append])

  return (
    <div
      className={cn(
        'mx-auto w-full',
        messages.length > 0
          ? 'fixed bottom-0 left-0 right-0 bg-background'
          : 'fixed bottom-8 left-0 right-0 top-6 flex flex-col items-center justify-center'
      )}
    >
      {messages.length === 0 && (
        <div className="mb-8">
          <IconLogo className="size-12 text-muted-foreground" />
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'max-w-3xl w-full mx-auto',
          messages.length > 0 ? 'px-2 py-4' : 'px-6'
        )}
      >
        <div className="relative flex flex-col w-full gap-2 bg-muted rounded-3xl border border-input">
          <FileDropzone
            onFilesAccepted={handleFileAccepted}
            isActive={dropzoneActive}
            onActiveChange={setDropzoneActive}
            className="absolute inset-0"
          />
          <Textarea
            ref={inputRef}
            name="input"
            rows={2}
            maxRows={5}
            tabIndex={0}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="Ask a question..."
            spellCheck={false}
            value={input}
            className="resize-none w-full min-h-12 bg-transparent border-0 px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onChange={e => {
              handleInputChange(e)
              setShowEmptyScreen(e.target.value.length === 0)
            }}
            onKeyDown={e => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !isComposing &&
                !enterDisabled
              ) {
                if (input.trim().length === 0) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                const textarea = e.target as HTMLTextAreaElement
                textarea.form?.requestSubmit()
              }
            }}
            onFocus={() => setShowEmptyScreen(true)}
            onBlur={() => setShowEmptyScreen(false)}
          />

          {/* Show image previews if there are attachments */}
          {attachments.length > 0 && (
            <ImagePreview
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          )}

          {/* Bottom menu area */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <ModelSelector />
              <SearchModeToggle
                enabled={searchMode}
                onEnabledChange={(enabled: boolean) => {
                  setSearchMode(enabled)
                  onSearchModeChange?.(enabled)
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNewChat}
                  className="shrink-0 rounded-full group"
                  type="button"
                  disabled={isLoading}
                >
                  <MessageCirclePlus className="size-4 group-hover:rotate-12 transition-all" />
                </Button>
              )}
              <Button
                type={isLoading ? 'button' : 'submit'}
                size={'icon'}
                variant={'outline'}
                className={cn(isLoading && 'animate-pulse', 'rounded-full')}
                disabled={input.length === 0 && !isLoading}
                onClick={isLoading ? stop : undefined}
              >
                {isLoading ? <Square size={20} /> : <ArrowUp size={20} />}
              </Button>
            </div>
          </div>
        </div>

        {messages.length === 0 && (
          <EmptyScreen
            submitMessage={message => {
              handleInputChange({
                target: { value: message }
              } as React.ChangeEvent<HTMLTextAreaElement>)
            }}
            className={cn(showEmptyScreen ? 'visible' : 'invisible')}
          />
        )}
      </form>
    </div>
  )
}
