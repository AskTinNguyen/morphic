'use client'

import { useCallback, useEffect, useState } from 'react'
import { DeepResearchProvider as BaseProvider, useDeepResearch } from '../importedcode-newfeature-deepresearch/deep-research-context'

interface DeepResearchWrapperProps {
  children: React.ReactNode
  chatId: string
  onClearStateChange?: (chatId: string, isCleared: boolean) => Promise<void>
  initialClearedState?: boolean
}

// Wrapper component to handle state persistence and cleanup
function DeepResearchStateManager({ 
  children, 
  chatId,
  onClearStateChange,
  initialClearedState = false
}: { 
  children: React.ReactNode
  chatId: string
  onClearStateChange?: (chatId: string, isCleared: boolean) => Promise<void>
  initialClearedState?: boolean
}) {
  const { state, clearState, setActive, initProgress } = useDeepResearch()
  const [isCleared, setIsCleared] = useState(false)
  const [hasBeenCleared, setHasBeenCleared] = useState(initialClearedState)

  // Helper to get/set chat-specific cleared state
  const getChatClearedKey = useCallback((id: string) => `deepResearchCleared_${id}`, [])
  
  const setChatCleared = useCallback(async (id: string, cleared: boolean) => {
    // Update session storage
    if (cleared) {
      sessionStorage.setItem(getChatClearedKey(id), 'true')
    } else {
      sessionStorage.removeItem(getChatClearedKey(id))
    }
    
    // Update database if callback provided
    if (onClearStateChange) {
      try {
        await onClearStateChange(id, cleared)
      } catch (error) {
        console.error('Failed to update research cleared state in database:', error)
      }
    }
  }, [getChatClearedKey, onClearStateChange])
  
  const isChatCleared = useCallback((id: string) => {
    return sessionStorage.getItem(getChatClearedKey(id)) === 'true' || initialClearedState
  }, [getChatClearedKey, initialClearedState])
  
  const clearChatState = useCallback(async (id: string) => {
    await setChatCleared(id, true)
    clearState()
    setActive(false)
    initProgress(7, 0)
  }, [clearState, setActive, initProgress, setChatCleared])

  // Effect to handle complete state reset for specific chat
  useEffect(() => {
    if (!state.isActive && isCleared) {
      clearChatState(chatId)
      setIsCleared(false)
      setHasBeenCleared(true)
    }
  }, [state.isActive, isCleared, chatId, clearChatState])

  // Effect to check for cleared state on mount and after navigation
  useEffect(() => {
    const wasCleared = isChatCleared(chatId)
    if (wasCleared) {
      setHasBeenCleared(true)
      clearState()
      setActive(false)
    }
  }, [chatId, clearState, setActive, isChatCleared])

  // Effect to prevent state updates if research has been cleared for this chat
  useEffect(() => {
    if (hasBeenCleared && state.activity.length > 0) {
      clearChatState(chatId)
    }
  }, [hasBeenCleared, state.activity.length, chatId, clearChatState])

  // Effect to cleanup state when component unmounts
  useEffect(() => {
    return () => {
      if (hasBeenCleared) {
        clearState()
        setActive(false)
      }
    }
  }, [clearState, setActive, hasBeenCleared])

  return <>{children}</>
}

// Create a hook to manage deep research progression
export function useDeepResearchProgress(
  currentDepth: number, 
  maxDepth: number = 7, 
  chatId: string,
  initialClearedState?: boolean
) {
  const { setDepth, state, clearState, setActive } = useDeepResearch()
  const [hasBeenCleared, setHasBeenCleared] = useState(() => 
    initialClearedState || sessionStorage.getItem(`deepResearchCleared_${chatId}`) === 'true'
  )
  
  const shouldContinueResearch = currentDepth < maxDepth && !hasBeenCleared
  
  const updateDepth = useCallback(() => {
    if (shouldContinueResearch) {
      setDepth(currentDepth + 1, maxDepth)
    }
  }, [currentDepth, maxDepth, setDepth, shouldContinueResearch])

  const resetProgress = useCallback(() => {
    setActive(false)
    clearState()
    setDepth(0, maxDepth)
    setHasBeenCleared(true)
    sessionStorage.setItem(`deepResearchCleared_${chatId}`, 'true')
  }, [clearState, setActive, setDepth, maxDepth, chatId])

  return {
    shouldContinueResearch,
    nextDepth: currentDepth + 1,
    maxDepth,
    updateDepth,
    resetProgress,
    currentDepth: state.currentDepth,
    hasBeenCleared
  }
}

export function DeepResearchWrapper({ 
  children, 
  chatId, 
  onClearStateChange,
  initialClearedState 
}: DeepResearchWrapperProps) {
  return (
    <BaseProvider>
      <DeepResearchStateManager 
        chatId={chatId}
        onClearStateChange={onClearStateChange}
        initialClearedState={initialClearedState}
      >
        {children}
      </DeepResearchStateManager>
    </BaseProvider>
  )
} 