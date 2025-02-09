import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { ChartMessage, isChartData, RawChartData } from '@/lib/types/chart'
import { isProviderEnabled, isToolCallSupported } from '@/lib/utils/registry'
import { cookies } from 'next/headers'

export const maxDuration = 30

const DEFAULT_MODEL = 'openai:gpt-4o-mini'

interface StreamData {
  type: string
  value?: string
  annotations?: any[]
  [key: string]: any
}

// Add this function to handle chart data in the message
function processChartData(message: string | { content: string }): { content: string; chartData?: ChartMessage } {
  try {
    // Handle both string and object with content property
    const messageStr = typeof message === 'string' ? message : message.content

    if (!messageStr) {
      console.warn('Empty message in processChartData')
      return { content: '' }
    }

    // Check if the message contains chart data markers
    const chartMatch = messageStr.match(/```chart\n([\s\S]*?)\n```/)
    if (!chartMatch) {
      return { content: messageStr }
    }

    // Extract and parse the chart data
    const rawData = JSON.parse(chartMatch[1]) as RawChartData
    
    // Transform the data into Chart.js format
    const chartData: ChartMessage = {
      type: 'chart',
      data: {
        type: rawData.type || 'line',
        title: rawData.title,
        chartData: {
          // Ensure we have valid labels from the data array
          labels: Array.isArray(rawData.data) 
            ? rawData.data.map(item => item.month || '').filter(Boolean)
            : [],
          // Transform and validate datasets
          datasets: Array.isArray(rawData.datasets) 
            ? rawData.datasets.map(dataset => ({
                label: dataset.label || 'Dataset',
                data: Array.isArray(dataset.data) 
                  ? dataset.data.filter(value => typeof value === 'number')
                  : [],
            borderColor: dataset.borderColor || '#4CAF50',
            backgroundColor: dataset.backgroundColor || 'rgba(76, 175, 80, 0.1)',
                borderWidth: dataset.borderWidth || 1,
                tension: dataset.tension || 0.1
          }))
            : []
        }
      }
    }

    // Validate the transformed data
    if (!isChartData(chartData.data)) {
      console.error('Invalid chart data structure:', chartData)
      return { content: messageStr }
    }

    // Remove the chart data from the message
    const content = messageStr.replace(/```chart\n[\s\S]*?\n```/, '').trim()

    return { content, chartData }
  } catch (error) {
    console.error('Error processing chart data:', error)
    return { content: typeof message === 'string' ? message : message?.content || '' }
  }
}

export async function POST(req: Request) {
  try {
    const { messages, id: chatId } = await req.json()
    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const cookieStore = await cookies()
    const modelFromCookie = cookieStore.get('selected-model')?.value
    const searchMode = cookieStore.get('search-mode')?.value === 'true'
    const model = modelFromCookie || DEFAULT_MODEL
    const provider = model.split(':')[0]
    if (!isProviderEnabled(provider)) {
      return new Response(`Selected provider is not enabled ${provider}`, {
        status: 404,
        statusText: 'Not Found'
      })
    }

    const supportsToolCalling = isToolCallSupported(model)

    const streamResponse = supportsToolCalling
      ? await createToolCallingStreamResponse({
          messages,
          model,
          chatId,
          searchMode
        })
      : await createManualToolStreamResponse({
          messages,
          model,
          chatId,
          searchMode
        })

    // Create a TextDecoder for handling chunks
    const decoder = new TextDecoder()
    let buffer = ''
    let completeMessage = ''
    let lastData: StreamData | null = null

    // Create a TransformStream to process the response
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        try {
          // Decode the chunk and add it to the buffer
          buffer += decoder.decode(chunk, { stream: true })
          
          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep the last incomplete line in the buffer
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                // Handle SSE format - lines should start with "data: "
                const dataMatch = line.match(/^data: (.+)$/)
                if (!dataMatch) {
                  // Not a data line, pass through
                  controller.enqueue(new TextEncoder().encode(line + '\n'))
                  continue
                }

                const data = JSON.parse(dataMatch[1])
                if (data.type === 'text' && data.value) {
                  // Accumulate the complete message
                  completeMessage = data.value
                  lastData = data
                }
                // Pass through all messages during streaming
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
              } catch (parseError) {
                console.error('Error parsing line:', parseError, 'Line:', line)
                controller.enqueue(new TextEncoder().encode(line + '\n'))
              }
            }
          }
        } catch (error) {
          console.error('Error transforming chunk:', error)
          controller.enqueue(chunk)
        }
      },
      flush(controller) {
        // Process any remaining data in the buffer
        if (buffer.trim()) {
          try {
            const dataMatch = buffer.match(/^data: (.+)$/)
            if (dataMatch) {
              const data = JSON.parse(dataMatch[1])
              if (data.type === 'text' && data.value) {
                completeMessage = data.value
                lastData = data
              }
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
            } else {
              controller.enqueue(new TextEncoder().encode(buffer))
            }
          } catch (error) {
            console.error('Error processing remaining buffer:', error)
            controller.enqueue(new TextEncoder().encode(buffer))
          }
        }

        // Process chart data only after the entire message is complete
        if (completeMessage) {
          const { content, chartData } = processChartData({ content: completeMessage })
          if (chartData) {
            // Preserve existing annotations and add chart data
            const finalData = {
              ...lastData,
              value: content,
              annotations: [...(lastData?.annotations || []), chartData]
            }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finalData)}\n\n`))
          }
        }
      }
    })

    // Get the response body as a ReadableStream
    const responseBody = streamResponse.body
    if (!responseBody) {
      throw new Error('Response body is null')
    }

    // Create a new response with the transformed stream
    return new Response(responseBody.pipeThrough(transformStream), {
      headers: {
        ...streamResponse.headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('API route error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 500
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
