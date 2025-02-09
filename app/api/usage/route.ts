import { createUsageTracker } from '@/lib/services/usage-tracker'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { getAuth } from '../../../lib/auth'

export async function GET() {
  const session = await getServerSession()

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Use demo user ID for now, in production this would be the actual user ID
    const usageTracker = createUsageTracker({ userId: 'demo' })
    const usage = await usageTracker.getUserUsage()
    
    return NextResponse.json(usage)
  } catch (error) {
    console.error('Error fetching usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { model, chatId, usage, finishReason } = await req.json()
    if (!model || !chatId || !usage || !finishReason) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const usageTracker = createUsageTracker(userId)
    await usageTracker.trackUsage(model, chatId, usage, finishReason)

    return new NextResponse('OK')
  } catch (error) {
    console.error('Error tracking usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 