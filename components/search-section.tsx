'use client'

import type { ExtendedMessage, SearchResultItem, SearchResults as TypeSearchResults } from '@/lib/types'
import { extractSearchSources } from '@/lib/utils/search'
import { ToolInvocation } from 'ai'
import React from 'react'
import { CollapsibleMessage } from './collapsible-message'
import { useDeepResearch, useDeepResearchProgress } from './deep-research-provider'
import { SearchSkeleton } from './default-skeleton'
import { SearchResults } from './search-results'
import { SearchResultsImageSection } from './search-results-image'
import { Section, ToolArgsSection } from './section'

interface SearchSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  messages: ExtendedMessage[]
  setMessages: (messages: ExtendedMessage[]) => void
  chatId: string
}

export function SearchSection({
  tool,
  isOpen,
  onOpenChange,
  messages,
  setMessages,
  chatId
}: SearchSectionProps) {
  const { state, addActivity, addSource, setDepth } = useDeepResearch()
  const { currentDepth } = state
  const { shouldContinueResearch, nextDepth, maxDepth } = useDeepResearchProgress(currentDepth, 7, chatId)
  const activityAddedRef = React.useRef<{[key: string]: boolean}>({})
  const sourcesProcessedRef = React.useRef<{[key: string]: boolean}>({})

  // Tool and search state
  const isToolLoading = tool.state === 'call'
  const searchResults: TypeSearchResults | undefined = 
    tool.state === 'result' ? tool.result : undefined
  const query = tool.args?.query as string | undefined
  const includeDomains = tool.args?.includeDomains as string[] | undefined
  const includeDomainsString = includeDomains
    ? ` [${includeDomains.join(', ')}]`
    : ''

  // Helper function to calculate relevance score
  const calculateRelevance = React.useCallback((result: { title: string; content?: string }, query: string | undefined): number => {
    if (!query) return 0.5
    
    const queryTerms = query.toLowerCase().split(' ')
    const titleMatch = queryTerms.filter(term => 
      result.title.toLowerCase().includes(term)
    ).length / queryTerms.length
    
    const contentMatch = result.content 
      ? queryTerms.filter(term => 
          result.content?.toLowerCase().includes(term)
        ).length / queryTerms.length
      : 0
    
    return (titleMatch * 0.6 + contentMatch * 0.4)
  }, [])

  // Process search results (sources and messages)
  const processSearchResults = React.useCallback(async () => {
    if (!query || tool.state !== 'result' || !searchResults?.results) return
    
    const resultsKey = `${tool.toolCallId}-results`
    if (sourcesProcessedRef.current[resultsKey]) return
    
    try {
      // Consolidate all search results including direct URLs
      const allResults: SearchResultItem[] = [
        ...searchResults.results,
        ...(searchResults.directUrls || []).map((url: string) => ({
          url,
          title: 'Direct Source',
          snippet: 'Direct source reference',
          content: undefined
        }))
      ]

      // Add sources to Deep Research context
      const sourcesToAdd = allResults.map(result => ({
        url: result.url,
        title: result.title,
        relevance: calculateRelevance({
          title: result.title,
          content: result.content
        }, query)
      }))

      // Add all sources in one batch operation
      await Promise.all(sourcesToAdd.map(source => addSource(source)))

      // Update message with search sources
      const message = messages.find(msg => 
        msg.toolInvocations?.some(t => t.toolCallId === tool.toolCallId)
      )

      if (message) {
        const searchSources = extractSearchSources(
          allResults,
          message.id,
          query
        )
        
        // Create new messages array with updated message
        const updatedMessages: ExtendedMessage[] = messages.map(msg => {
          if (msg.id === message.id) {
            // Create updated message with search sources
            const updatedMessage: ExtendedMessage = {
              ...msg,
              searchSources
            }
            return updatedMessage
          }
          return msg
        })
        
        // Update messages state
        setMessages(updatedMessages)
      }

      // Mark as processed
      sourcesProcessedRef.current[resultsKey] = true

      // Handle research continuation
      if (shouldContinueResearch) {
        const analysisKey = `${tool.toolCallId}-analysis`
        if (!activityAddedRef.current[analysisKey]) {
          addActivity({
            type: 'analyze',
            status: 'pending',
            message: 'Analyzing results to determine next research direction...',
            timestamp: new Date().toISOString(),
            depth: currentDepth
          })
          activityAddedRef.current[analysisKey] = true
          setDepth(nextDepth, maxDepth)
        }
      }
    } catch (error) {
      console.error('Error processing search results:', error)
    }
  }, [
    query,
    tool.state,
    tool.toolCallId,
    searchResults,
    addSource,
    calculateRelevance,
    messages,
    setMessages,
    shouldContinueResearch,
    addActivity,
    currentDepth,
    nextDepth,
    maxDepth,
    setDepth
  ])

  // Track search activities
  React.useEffect(() => {
    if (!query) return

    const activityKey = `${tool.toolCallId}-${tool.state}`
    if (activityAddedRef.current[activityKey]) return

    if (tool.state === 'call') {
      addActivity({
        type: 'search',
        status: 'pending',
        message: `Depth ${currentDepth}: Searching for: ${query}`,
        timestamp: new Date().toISOString(),
        depth: currentDepth
      })
      activityAddedRef.current[activityKey] = true
    } else if (tool.state === 'result') {
      addActivity({
        type: 'search',
        status: 'complete',
        message: `Depth ${currentDepth}: Found ${searchResults?.results?.length ?? 0} results for: ${query}`,
        timestamp: new Date().toISOString(),
        depth: currentDepth
      })
      activityAddedRef.current[activityKey] = true
    }
  }, [tool.state, tool.toolCallId, query, currentDepth, addActivity, searchResults?.results?.length])

  // Process results when available
  React.useEffect(() => {
    processSearchResults()
  }, [processSearchResults])

  const header = (
    <ToolArgsSection
      tool="search"
      number={searchResults?.results?.length}
    >{`${query}${includeDomainsString}`}</ToolArgsSection>
  )

  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={true}
      header={header}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      {searchResults?.images && searchResults.images.length > 0 && (
        <Section>
          <SearchResultsImageSection
            images={searchResults.images}
            query={query ?? ''}
          />
        </Section>
      )}
      {isToolLoading ? (
        <SearchSkeleton />
      ) : searchResults && searchResults.results ? (
        <Section title="Sources">
          <SearchResults results={searchResults.results} />
        </Section>
      ) : null}
    </CollapsibleMessage>
  )
}
