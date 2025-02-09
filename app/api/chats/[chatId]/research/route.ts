import { getChatResearchState, updateChatResearchState } from '@/lib/redis/research'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const state = await getChatResearchState(params.chatId)
    return NextResponse.json(state)
  } catch (error) {
    console.error('Failed to get research state:', error)
    return NextResponse.json(
      { error: 'Failed to get research state' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { isCleared } = await request.json()
    await updateChatResearchState(params.chatId, isCleared)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update research state:', error)
    return NextResponse.json(
      { error: 'Failed to update research state' },
      { status: 500 }
    )
  }
} 