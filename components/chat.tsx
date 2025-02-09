'use client'

import { CHAT_ID } from '@/lib/constants'
import type { ChatResearchState } from '@/lib/types/research'
import { Message, useChat } from 'ai/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { DeepResearchProvider } from '../importedcode-newfeature-deepresearch/deep-research-context'
import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'
import { DeepResearchVisualization } from './deep-research-visualization'

export function Chat({
  id,
  savedMessages = [],
  query
}: {
  id: string
  savedMessages?: Message[]
  query?: string
}) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    stop,
    append,
    data,
    setData
  } = useChat({
    initialMessages: savedMessages,
    id: CHAT_ID,
    body: {
      id
    },
    onFinish: () => {
      window.history.replaceState({}, '', `/search/${id}`)
    },
    onError: error => {
      toast.error(`Error in chat: ${error.message}`)
    },
    sendExtraMessageFields: true // Enable extra message fields for annotations
  })

  const { data: researchState, mutate: mutateResearch } = useSWR<ChatResearchState>(
    `/api/chats/${id}/research`,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch research state')
      return res.json()
    }
  )

  useEffect(() => {
    setMessages(savedMessages)
  }, [id])

  const onQuerySelect = (query: string) => {
    append({
      role: 'user',
      content: query
    })
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setData(undefined) // reset data to clear tool call
    handleSubmit(e)
  }

  const handleClearResearch = async (chatId: string, isCleared: boolean) => {
    try {
      await fetch(`/api/chats/${chatId}/research`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCleared })
      })
      await mutateResearch()
    } catch (error) {
      console.error('Failed to update research state:', error)
    }
  }

  return (
    <DeepResearchProvider>
      <div className="flex min-h-screen">
        <DeepResearchVisualization
          location="sidebar"
          chatId={id}
          initialClearedState={researchState?.isCleared}
          onClearStateChange={handleClearResearch}
        />
        <div className="flex-1 pl-0 lg:pl-80">
          <div className="flex flex-col w-full max-w-3xl mx-auto pt-14 pb-60">
            <ChatMessages
              messages={messages}
              data={data}
              onQuerySelect={onQuerySelect}
              isLoading={isLoading}
              chatId={id}
            />
            <ChatPanel
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={onSubmit}
              isLoading={isLoading}
              messages={messages}
              setMessages={setMessages}
              stop={stop}
              query={query}
              append={append}
            />
          </div>
        </div>
      </div>
    </DeepResearchProvider>
  )
}
