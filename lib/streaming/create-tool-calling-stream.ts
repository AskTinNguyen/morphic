import { researcher } from '@/lib/agents/researcher'
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
      const rawData = JSON.parse(chartMatch[1])
      
      // Transform the data into Chart.js format
      const chartData = {
        type: rawData.chart?.type || 'line',
        title: rawData.chart?.title,
        data: {
          labels: rawData.chart?.data?.map((item: any) => item.month),
          datasets: [{
            label: rawData.chart?.title || 'Data',
            data: rawData.chart?.data?.map((item: any) => item.sales),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: !!rawData.chart?.title,
              text: rawData.chart?.title || ''
            },
            legend: {
              display: true,
              position: 'top' as const
            }
          },
          scales: {
            x: {
              title: {
                display: !!rawData.chart?.xAxis,
                text: rawData.chart?.xAxis || ''
              }
            },
            y: {
              title: {
                display: !!rawData.chart?.yAxis,
                text: rawData.chart?.yAxis || ''
              },
              beginAtZero: true
            }
          }
        }
      }
      
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
            // Process chart data in the response
            const { content, chartData } = processChartData(result.response.messages[0].content)
            result.response.messages[0].content = content

            const annotations = chartData ? [chartData] : undefined

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
