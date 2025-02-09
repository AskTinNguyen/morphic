'use client'

import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'

// Types
interface ActivityItem {
  type: 'search' | 'extract' | 'analyze' | 'reasoning' | 'synthesis' | 'thought'
  status: 'pending' | 'complete' | 'error'
  message: string
  timestamp: string
  depth?: number
}

interface SourceItem {
  url: string
  title: string
  relevance: number
}

interface DeepResearchState {
  isActive: boolean
  activity: ActivityItem[]
  sources: SourceItem[]
  currentDepth: number
  maxDepth: number
  completedSteps: number
  totalExpectedSteps: number
}

type DeepResearchAction =
  | { type: 'TOGGLE_ACTIVE' }
  | { type: 'SET_ACTIVE'; payload: boolean }
  | { type: 'ADD_ACTIVITY'; payload: ActivityItem & { completedSteps?: number; totalSteps?: number } }
  | { type: 'ADD_SOURCE'; payload: SourceItem }
  | { type: 'SET_DEPTH'; payload: { current: number; max: number } }
  | { type: 'INIT_PROGRESS'; payload: { maxDepth: number; totalSteps: number } }
  | { type: 'UPDATE_PROGRESS'; payload: { completed: number; total: number } }
  | { type: 'CLEAR_STATE' }

interface DeepResearchContextType {
  state: DeepResearchState
  toggleActive: () => void
  setActive: (active: boolean) => void
  addActivity: (activity: ActivityItem & { completedSteps?: number; totalSteps?: number }) => void
  addSource: (source: SourceItem) => void
  setDepth: (current: number, max: number) => void
  initProgress: (maxDepth: number, totalSteps: number) => void
  updateProgress: (completed: number, total: number) => void
  clearState: () => void
}

// Initial state and reducer
const initialState: DeepResearchState = {
  isActive: true,
  activity: [],
  sources: [],
  currentDepth: 0,
  maxDepth: 7,
  completedSteps: 0,
  totalExpectedSteps: 0
}

function deepResearchReducer(state: DeepResearchState, action: DeepResearchAction): DeepResearchState {
  switch (action.type) {
    case 'TOGGLE_ACTIVE':
      return {
        ...state,
        isActive: !state.isActive,
        ...(state.isActive && {
          activity: [],
          sources: [],
          currentDepth: 0,
          completedSteps: 0,
          totalExpectedSteps: 0
        })
      }
    case 'SET_ACTIVE':
      return {
        ...state,
        isActive: action.payload,
        ...(action.payload === false && {
          activity: [],
          sources: [],
          currentDepth: 0,
          completedSteps: 0,
          totalExpectedSteps: 0
        })
      }
    case 'ADD_ACTIVITY':
      return {
        ...state,
        activity: [...state.activity, action.payload],
        completedSteps:
          action.payload.completedSteps ??
          (action.payload.status === 'complete' ? state.completedSteps + 1 : state.completedSteps),
        totalExpectedSteps: action.payload.totalSteps ?? state.totalExpectedSteps
      }
    case 'ADD_SOURCE':
      return {
        ...state,
        sources: [...state.sources, action.payload]
      }
    case 'SET_DEPTH':
      return {
        ...state,
        currentDepth: action.payload.current,
        maxDepth: action.payload.max
      }
    case 'INIT_PROGRESS':
      return {
        ...state,
        maxDepth: action.payload.maxDepth,
        totalExpectedSteps: action.payload.totalSteps,
        completedSteps: 0,
        currentDepth: 0
      }
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        completedSteps: action.payload.completed,
        totalExpectedSteps: action.payload.total
      }
    case 'CLEAR_STATE':
      return initialState
    default:
      return state
  }
}

// Context
const DeepResearchContext = createContext<DeepResearchContextType | undefined>(undefined)

// Provider Component
function DeepResearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(deepResearchReducer, initialState)

  const toggleActive = useCallback(() => {
    dispatch({ type: 'TOGGLE_ACTIVE' })
  }, [])

  const setActive = useCallback((active: boolean) => {
    dispatch({ type: 'SET_ACTIVE', payload: active })
  }, [])

  const addActivity = useCallback(
    (activity: ActivityItem & { completedSteps?: number; totalSteps?: number }) => {
      dispatch({ type: 'ADD_ACTIVITY', payload: activity })
    },
    []
  )

  const addSource = useCallback((source: SourceItem) => {
    dispatch({ type: 'ADD_SOURCE', payload: source })
  }, [])

  const setDepth = useCallback((current: number, max: number) => {
    dispatch({ type: 'SET_DEPTH', payload: { current, max } })
  }, [])

  const initProgress = useCallback((maxDepth: number, totalSteps: number) => {
    dispatch({ type: 'INIT_PROGRESS', payload: { maxDepth, totalSteps } })
  }, [])

  const updateProgress = useCallback((completed: number, total: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { completed, total } })
  }, [])

  const clearState = useCallback(() => {
    dispatch({ type: 'CLEAR_STATE' })
  }, [])

  return (
    <DeepResearchContext.Provider
      value={{
        state,
        toggleActive,
        setActive,
        addActivity,
        addSource,
        setDepth,
        initProgress,
        updateProgress,
        clearState
      }}
    >
      {children}
    </DeepResearchContext.Provider>
  )
}

// Hook to use the context
function useDeepResearch() {
  const context = useContext(DeepResearchContext)
  if (context === undefined) {
    throw new Error('useDeepResearch must be used within a DeepResearchProvider')
  }
  return context
}

// State Manager Component
function DeepResearchStateManager({ 
  children, 
  chatId,
  onClearStateChange,
  initialClearedState = false
}: { 
  children: ReactNode
  chatId: string
  onClearStateChange?: (chatId: string, isCleared: boolean) => Promise<void>
  initialClearedState?: boolean
}) {
  const { state, clearState, setActive, initProgress } = useDeepResearch()
  const [isCleared, setIsCleared] = useState(false)
  const [hasBeenCleared, setHasBeenCleared] = useState(initialClearedState)

  const getChatClearedKey = useCallback((id: string) => `deepResearchCleared_${id}`, [])
  
  const setChatCleared = useCallback(async (id: string, cleared: boolean) => {
    if (typeof window !== 'undefined') {
      if (cleared) {
        window.sessionStorage.setItem(getChatClearedKey(id), 'true')
      } else {
        window.sessionStorage.removeItem(getChatClearedKey(id))
      }
    }
    
    if (onClearStateChange) {
      try {
        await onClearStateChange(id, cleared)
      } catch (error) {
        console.error('Failed to update research cleared state in database:', error)
      }
    }
  }, [getChatClearedKey, onClearStateChange])
  
  const isChatCleared = useCallback((id: string) => {
    if (typeof window === 'undefined') return initialClearedState
    return window.sessionStorage.getItem(getChatClearedKey(id)) === 'true' || initialClearedState
  }, [getChatClearedKey, initialClearedState])
  
  const clearChatState = useCallback(async (id: string) => {
    await setChatCleared(id, true)
    clearState()
    setActive(false)
    initProgress(7, 0)
  }, [clearState, setActive, initProgress, setChatCleared])

  useEffect(() => {
    if (!state.isActive && isCleared) {
      clearChatState(chatId)
      setIsCleared(false)
      setHasBeenCleared(true)
    }
  }, [state.isActive, isCleared, chatId, clearChatState])

  useEffect(() => {
    const wasCleared = isChatCleared(chatId)
    if (wasCleared) {
      setHasBeenCleared(true)
      clearState()
      setActive(false)
    }
  }, [chatId, clearState, setActive, isChatCleared])

  useEffect(() => {
    if (hasBeenCleared && state.activity.length > 0) {
      clearChatState(chatId)
    }
  }, [hasBeenCleared, state.activity.length, chatId, clearChatState])

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

// Progress Hook
function useDeepResearchProgress(
  currentDepth: number, 
  maxDepth: number = 7, 
  chatId: string,
  initialClearedState?: boolean
) {
  const { setDepth, state, clearState, setActive } = useDeepResearch()
  const [hasBeenCleared, setHasBeenCleared] = useState(() => {
    if (typeof window === 'undefined') return initialClearedState || false
    return initialClearedState || window.sessionStorage.getItem(`deepResearchCleared_${chatId}`) === 'true'
  })
  
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
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`deepResearchCleared_${chatId}`, 'true')
    }
  }, [clearState, setActive, setDepth, maxDepth, chatId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`deepResearchCleared_${chatId}`, hasBeenCleared.toString())
    }
  }, [hasBeenCleared, chatId])

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

// Wrapper Component
interface DeepResearchWrapperProps {
  children: ReactNode
  chatId: string
  onClearStateChange?: (chatId: string, isCleared: boolean) => Promise<void>
  initialClearedState?: boolean
}

function DeepResearchWrapper({ 
  children, 
  chatId, 
  onClearStateChange,
  initialClearedState 
}: DeepResearchWrapperProps) {
  return (
    <DeepResearchProvider>
      <DeepResearchStateManager 
        chatId={chatId}
        onClearStateChange={onClearStateChange}
        initialClearedState={initialClearedState}
      >
        {children}
      </DeepResearchStateManager>
    </DeepResearchProvider>
  )
}

// Exports
export {
  DeepResearchProvider,
  DeepResearchWrapper,
  useDeepResearch,
  useDeepResearchProgress,
  type ActivityItem, type DeepResearchState, type SourceItem
}

