import { ChatChartMessage } from '@/lib/types/chart'
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

// Simple chart data processing function
function processChartData(content: AssistantContent | ToolContent): { content: AssistantContent | ToolContent; chartData?: ChatChartMessage } {
  try {
    // Convert content to string
    const contentStr = typeof content === 'string' 
      ? content 
      : Array.isArray(content)
        ? content.map(part => 'text' in part ? part.text : '').join('')
        : ''

    // Look for chart data between XML tags
    const chartMatch = contentStr.match(/<chart_data>([\s\S]*?)<\/chart_data>/)
    if (!chartMatch) return { content }

    // Parse the chart data
    const chartJson = JSON.parse(chartMatch[1].trim())
    const chartData: ChatChartMessage = {
      type: 'chart',
      role: 'assistant',
      content: contentStr,
      data: chartJson
    }

    // Remove the chart data from the message
    const newContent = contentStr.replace(/<chart_data>[\s\S]*?<\/chart_data>/, '').trim()
    const textPart: TextPart = { type: 'text', text: newContent }

    return {
      content: Array.isArray(content) ? [textPart] : newContent,
      chartData
    }
  } catch (error) {
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
