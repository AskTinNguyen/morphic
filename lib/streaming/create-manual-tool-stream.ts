import {
  AssistantContent,
  convertToCoreMessages,
  createDataStreamResponse,
  DataStreamWriter,
  streamText,
  TextPart,
  ToolContent
} from 'ai'
import { manualResearcher } from '../agents/manual-researcher'
import { ExtendedCoreMessage } from '../types'
import { getMaxAllowedTokens, truncateMessages } from '../utils/context-window'
import { handleStreamFinish } from './handle-stream-finish'
import { BaseStreamConfig } from './types'

// Add chart data processing function
function processChartData(content: AssistantContent | ToolContent): { content: AssistantContent | ToolContent; chartData?: any } {
  try {
    // Convert content to string based on its type
    let contentStr = ''
    if (Array.isArray(content)) {
      contentStr = content
        .map(part => {
          if ('text' in part && typeof part.text === 'string') return part.text
          return ''
        })
        .join('')
    } else if (typeof content === 'string') {
      contentStr = content
    } else {
      console.warn('Unexpected content type in processChartData:', content)
      return { content }
    }

    // Check if the message contains chart data markers
    const chartMatch = contentStr.match(/```chart\n([\s\S]*?)\n```/)
    if (!chartMatch) return { content }

    try {
      // Extract and parse the chart data
      const chartData = JSON.parse(chartMatch[1])
      
      // Remove the chart data from the message
      const newContent = contentStr.replace(/```chart\n[\s\S]*?\n```/, '').trim()

      // Create a text part with the new content
      const textPart: TextPart = { type: 'text', text: newContent }

      return {
        content: Array.isArray(content) ? [textPart] : newContent,
        chartData: {
          type: 'chart',
          data: chartData
        }
      }
    } catch (parseError) {
      console.error('Error parsing chart data:', parseError)
      return { content }
    }
  } catch (error) {
    console.error('Error processing chart data:', error)
    return { content }
  }
}

export function createManualToolStreamResponse(config: BaseStreamConfig) {
  return createDataStreamResponse({
    execute: async (dataStream: DataStreamWriter) => {
      const { messages, model, chatId, searchMode } = config

      try {
        const coreMessages = convertToCoreMessages(messages)
        const truncatedMessages = truncateMessages(
          coreMessages,
          getMaxAllowedTokens(model)
        )

        const researcherConfig = await manualResearcher({
          messages: truncatedMessages,
          model,
          isSearchEnabled: searchMode
        })

        const result = streamText({
          ...researcherConfig,
          onFinish: async result => {
            // Process chart data in the response
            const { content, chartData } = processChartData(result.response.messages[0].content)
            result.response.messages[0].content = content

            const annotations: ExtendedCoreMessage[] = chartData ? [chartData] : []

            await handleStreamFinish({
              responseMessages: result.response.messages,
              originalMessages: messages,
              model,
              chatId,
              dataStream,
              annotations
            })
          }
        })

        result.mergeIntoDataStream(dataStream)
      } catch (error) {
        console.error('Stream execution error:', error)
        throw error
      }
    },
    onError: error => {
      console.error('Stream error:', error)
      return error instanceof Error ? error.message : String(error)
    }
  })
}
