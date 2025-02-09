# Chat Components Documentation

## Overview

The chat interface consists of several components that work together to provide a rich, multimodal chat experience. The system supports text messages, file attachments, research sources, and AI-powered suggestions.

## Core Components

### ChatPanel (`components/chat-panel.tsx`)

The main chat interface component that integrates all chat functionality.

```typescript
interface ChatPanelProps {
  input: string                    // Current input value
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean              // Loading state for message sending
  messages: Message[]             // Chat message history
  setMessages: (messages: Message[]) => void
  stop: () => void               // Stop message generation
  query?: string                 // Initial query (if any)
  append: (message: Message) => void // Add new message
  suggestions?: AutocompleteSuggestion[] // AI suggestions
  sources?: ResearchSource[]     // Research sources
  onSearchModeChange?: (enabled: boolean) => void // Search mode toggle handler
}
```

Features:
- Text input with autosize
- File attachments with drag & drop
- Image previews with reordering
- Source quick insertion
- AI-powered suggestions
- Model selection
- Search mode toggle

### FileDropzone (`components/chat/FileDropzone.tsx`)

Handles file uploads with drag & drop support.

```typescript
interface FileDropzoneProps {
  onFileAccepted: (files: File[]) => void
  supportedTypes: string[]        // Allowed file types
  maxSize: number                // Max file size in bytes
  isActive: boolean              // Dropzone active state
  onActiveChange: (active: boolean) => void
}
```

Features:
- Drag & drop file upload
- File type validation
- Size limit enforcement
- Visual feedback during drag
- Accessibility support

### ImagePreview (`components/chat/ImagePreview.tsx`)

Displays uploaded images and documents with management capabilities.

```typescript
interface PreviewProps {
  attachments: AttachmentFile[]
  onRemove: (id: string) => void
  onReorder: (dragIndex: number, dropIndex: number) => void
  expanded: boolean
  onExpandChange: (expanded: boolean) => void
}
```

Features:
- Image thumbnails
- Document previews
- Drag to reorder
- Remove attachments
- Expand/collapse view
- Upload progress indication

### SourceQuickInsert (`components/chat/SourceQuickInsert.tsx`)

Manages research sources and citations.

```typescript
interface SourceQuickInsertProps {
  sources: ResearchSource[]
  onSourceClick: (source: ResearchSource) => void
  searchMode: boolean
}
```

Features:
- Source list with relevance scores
- Quick insertion
- Search mode integration
- Source previews
- Citation formatting

### AutoComplete (`components/chat/AutoComplete.tsx`)

Provides AI-powered text suggestions.

```typescript
interface AutoCompleteProps {
  suggestions: AutocompleteSuggestion[]
  onSelect: (suggestion: AutocompleteSuggestion) => void
  onDismiss: () => void
  inputValue: string
  position: { top: number; left: number }
}
```

Features:
- Context-aware suggestions
- Confidence scores
- Keyboard navigation
- Position tracking
- Dismissible interface

## Types

### Message Types

```typescript
interface MultimodalMessage extends Message {
  attachments?: AttachmentFile[]
  sources?: ResearchSource[]
}

interface AttachmentFile {
  id: string
  file: File
  type: 'image' | 'document' | 'other'
  previewUrl?: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  progress?: number
  error?: string
}

interface ResearchSource {
  id: string
  url: string
  title?: string
  relevance?: number
  snippet?: string
}

interface AutocompleteSuggestion {
  id: string
  text: string
  confidence: number
  source?: ResearchSource
}
```

## Usage Example

```typescript
import { ChatPanel } from '@/components/chat-panel'

function Chat() {
  // ... state and handlers

  return (
    <ChatPanel
      input={input}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      isLoading={isLoading}
      messages={messages}
      setMessages={setMessages}
      stop={stop}
      append={append}
      suggestions={suggestions}
      sources={sources}
      onSearchModeChange={handleSearchModeChange}
    />
  )
}
```

## File Upload Flow

1. User drags or selects files
2. FileDropzone validates files
3. Files are uploaded via API
4. Progress is tracked and displayed
5. Previews are generated for images
6. Attachments are added to message

## Error Handling

- File type validation
- Size limit enforcement
- Upload error handling
- Network error recovery
- Invalid source handling
- Message send retry

## Accessibility

- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Loading states
- Error announcements

## Best Practices

1. **State Management**
   - Use controlled components
   - Maintain single source of truth
   - Handle loading states
   - Manage error states

2. **Performance**
   - Lazy load components
   - Optimize file uploads
   - Debounce input handlers
   - Cache previews

3. **Error Handling**
   - Validate early
   - Provide feedback
   - Allow retries
   - Maintain consistency

4. **Accessibility**
   - Follow WAI-ARIA
   - Support keyboard
   - Provide labels
   - Announce changes 