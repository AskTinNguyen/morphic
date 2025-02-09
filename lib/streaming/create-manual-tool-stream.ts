import { ChatChartMessage } from '@/lib/types/chart'
import {
  AssistantContent,
  convertToCoreMessages,
  createDataStreamResponse,
  DataStreamWriter,
  StepResult,
  streamText,
  TextPart,
  ToolContent,
  ToolSet
} from 'ai'
import { manualResearcher } from '../agents/manual-researcher'
import { getMaxAllowedTokens, truncateMessages } from '../utils/context-window'
import { handleStreamFinish } from './handle-stream-finish'
import { StreamProtocolManager } from './stream-protocol-manager'
import { BaseStreamConfig } from './types'

type StreamFinishEvent = Omit<StepResult<ToolSet>, 'stepType' | 'isContinued'> & {
  readonly steps: StepResult<ToolSet>[]
}

const handleError = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return String(error)
}

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
      const streamManager = new StreamProtocolManager(dataStream)

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
          onFinish: async (event: StreamFinishEvent) => {
            try {
              const lastStep = event.steps[event.steps.length - 1]
              if (!lastStep?.response?.messages?.length) return

              // Process chart data in the complete response
              const { content, chartData } = processChartData(lastStep.response.messages[0].content)
              
              // Update the message content without the chart XML
              lastStep.response.messages[0].content = content

              // Create annotations array with chart data if present
              const annotations: ChatChartMessage[] = chartData ? [chartData] : []

              // Handle stream finish will take care of sending the annotations
              await handleStreamFinish({
                responseMessages: lastStep.response.messages,
                originalMessages: messages,
                model,
                chatId,
                dataStream,
                skipRelatedQuestions: true,
                annotations
              }).catch(error => {
                console.error('Error in handleStreamFinish:', error)
                streamManager.streamError(handleError(error))
              })
            } catch (error) {
              console.error('Error in onFinish:', error)
              streamManager.streamError(handleError(error))
            }
          }
        })

        result.mergeIntoDataStream(dataStream)
      } catch (error) {
        console.error('Stream execution error:', error)
        streamManager.streamError(handleError(error))
      }
    },
    onError: error => {
      console.error('Stream error:', error)
      return handleError(error)
    }
  })
}
