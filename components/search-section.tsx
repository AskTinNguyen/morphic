'use client'

import { CHAT_ID } from '@/lib/constants'
import type { SearchResults as TypeSearchResults } from '@/lib/types'
import { ToolInvocation } from 'ai'
import { useChat } from 'ai/react'
import React from 'react'
import { useDeepResearch } from '../importedcode-newfeature-deepresearch/deep-research-context'
import { CollapsibleMessage } from './collapsible-message'
import { useDeepResearchProgress } from './deep-research-provider'
import { SearchSkeleton } from './default-skeleton'
import { SearchResults } from './search-results'
import { SearchResultsImageSection } from './search-results-image'
import { Section, ToolArgsSection } from './section'

interface SearchSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchSection({
  tool,
  isOpen,
  onOpenChange
}: SearchSectionProps) {
  // Chat and research hooks
  const { isLoading } = useChat({ id: CHAT_ID })
  const { state, addActivity, addSource, setDepth } = useDeepResearch()
  const { currentDepth } = state
  const { shouldContinueResearch, nextDepth, maxDepth } = useDeepResearchProgress(currentDepth)

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
  const calculateRelevance = (result: { title: string; content?: string }, query: string | undefined): number => {
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
  }

  // Update Deep Research context when search is performed
  React.useEffect(() => {
    if (!query) return

    if (tool.state === 'call') {
      // Start a new research activity
      addActivity({
        type: 'search',
        status: 'pending',
        message: `Depth ${currentDepth}: Searching for: ${query}`,
        timestamp: new Date().toISOString(),
        depth: currentDepth
      })
    } else if (tool.state === 'result' && searchResults) {
      // Complete current research activity
      addActivity({
        type: 'search',
        status: 'complete',
        message: `Depth ${currentDepth}: Found ${searchResults.results.length} results for: ${query}`,
        timestamp: new Date().toISOString(),
        depth: currentDepth
      })

      // Add sources to Deep Research context
      searchResults.results.forEach((result) => {
        addSource({
          url: result.url,
          title: result.title,
          relevance: calculateRelevance(result, query)
        })
      })

      // If we should continue researching, start analysis phase
      if (shouldContinueResearch) {
        addActivity({
          type: 'analyze',
          status: 'pending',
          message: 'Analyzing results to determine next research direction...',
          timestamp: new Date().toISOString(),
          depth: currentDepth
        })

        // Update depth for next iteration
        setDepth(nextDepth, maxDepth)
      }
    }
  }, [
    tool.state,
    searchResults,
    query,
    currentDepth,
    addActivity,
    addSource,
    setDepth,
    shouldContinueResearch,
    nextDepth,
    maxDepth
  ])

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
