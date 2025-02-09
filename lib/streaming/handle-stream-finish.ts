import { getChat, saveChat } from '@/lib/actions/chat'
import { generateRelatedQuestions } from '@/lib/agents/generate-related-questions'
import { ExtendedCoreMessage } from '@/lib/types'
import { CoreMessage, DataStreamWriter, JSONValue, Message } from 'ai'

interface HandleStreamFinishParams {
  responseMessages: CoreMessage[]
  originalMessages: Message[]
  model: string
  chatId: string
  dataStream: DataStreamWriter
  skipRelatedQuestions?: boolean
  annotations?: ExtendedCoreMessage[]
}

export async function handleStreamFinish({
  responseMessages,
  originalMessages,
  model,
  chatId,
  dataStream,
  skipRelatedQuestions = false,
  annotations = []
}: HandleStreamFinishParams) {
  try {
    // Don't convert messages that are already in the correct format
    const extendedCoreMessages = originalMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.toolInvocations && { toolInvocations: msg.toolInvocations })
    })) as ExtendedCoreMessage[]
    
    let allAnnotations = [...annotations]

    if (!skipRelatedQuestions) {
      // Notify related questions loading
      const relatedQuestionsAnnotation: JSONValue = {
        type: 'related-questions',
        data: { items: [] }
      }
      dataStream.writeMessageAnnotation(relatedQuestionsAnnotation)

      // Generate related questions
      const relatedQuestions = await generateRelatedQuestions(
        responseMessages,
        model
      )

      // Create and add related questions annotation
      const updatedRelatedQuestionsAnnotation: ExtendedCoreMessage = {
        role: 'data',
        content: {
          type: 'related-questions',
          data: relatedQuestions.object
        } as JSONValue
      }

      dataStream.writeMessageAnnotation(
        updatedRelatedQuestionsAnnotation.content as JSONValue
      )
      allAnnotations.push(updatedRelatedQuestionsAnnotation)
    }

    // Separate chart messages from other annotations
    const chartMessages = allAnnotations.filter(a => 
      'type' in a && a.type === 'chart'
    ) as ExtendedCoreMessage[]
    const otherAnnotations = allAnnotations.filter(a => 
      a.role === 'data' && 
      a.content !== null &&
      typeof a.content === 'object' && 
      'type' in a.content && 
      a.content.type !== 'tool_call'
    )

    // Create the message to save
    const generatedMessages = [
      ...extendedCoreMessages,
      ...responseMessages.slice(0, -1),
      ...otherAnnotations,
      // For the last message, if we have a chart, use it instead of the text message
      ...(chartMessages.length > 0 ? chartMessages : responseMessages.slice(-1))
    ] as ExtendedCoreMessage[]

    // Get the chat from the database if it exists, otherwise create a new one
    const savedChat = (await getChat(chatId)) ?? {
      messages: [],
      createdAt: new Date(),
      userId: 'anonymous',
      path: `/search/${chatId}`,
      title: originalMessages[0].content,
      id: chatId
    }

    // Save chat with complete response and related questions
    await saveChat({
      ...savedChat,
      messages: generatedMessages
    }).catch(error => {
      console.error('Failed to save chat:', error)
      throw new Error('Failed to save chat history')
    })
  } catch (error) {
    console.error('Error in handleStreamFinish:', error)
    throw error
  }
}
