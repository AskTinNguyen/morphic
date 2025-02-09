import { researcher } from '@/lib/agents/researcher'
import { ChatChartMessage, createChartMessage } from '@/lib/types/chart'
import {
  AssistantContent,
  convertToCoreMessages,
  createDataStreamResponse,
  DataStreamWriter,
  streamText,
  TextPart,
  ToolContent
} from 'ai'
import { getMaxAllowedTokens, truncateMessages } from '../utils/context-window'
import { isReasoningModel } from '../utils/registry'
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

    try {
      // Parse and create chart message
      const rawChartData = JSON.parse(chartMatch[1].trim())
      const chartData = createChartMessage(rawChartData)
      
      if (!chartData) {
        return { content }
      }

      // Update the content of the chart message
      chartData.content = contentStr

      // Remove the chart data from the message
      const newContent = contentStr.replace(/<chart_data>[\s\S]*?<\/chart_data>/, '').trim()
      const textPart: TextPart = { type: 'text', text: newContent }

      return {
        content: Array.isArray(content) ? [textPart] : newContent,
        chartData
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

export function createToolCallingStreamResponse(config: BaseStreamConfig) {
  return createDataStreamResponse({
    execute: async (dataStream: DataStreamWriter) => {
      const { messages, model, chatId, searchMode } = config

      try {
        const coreMessages = convertToCoreMessages(messages)
        const truncatedMessages = truncateMessages(
          coreMessages,
          getMaxAllowedTokens(model)
        )

        let researcherConfig = await researcher({
          messages: truncatedMessages,
          model,
          searchMode
        })

        const result = streamText({
          ...researcherConfig,
          onFinish: async result => {
            // Process chart data in the complete response
            const { content, chartData } = processChartData(result.response.messages[0].content)
            
            // Update the message content without the chart XML
            result.response.messages[0].content = content

            // Create annotations array with chart data if present
            const annotations: ChatChartMessage[] = chartData ? [chartData] : []

            // Handle stream finish will take care of sending the annotations
            await handleStreamFinish({
              responseMessages: result.response.messages,
              originalMessages: messages,
              model,
              chatId,
              dataStream,
              skipRelatedQuestions: isReasoningModel(model),
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
