import { kv } from '@vercel/kv'
import { nanoid } from 'nanoid'
import { REDIS_KEYS, type ChatResearchActivity, type ChatResearchSource, type ChatResearchState } from '../types/research'

export async function updateChatResearchState(
  chatId: string,
  isCleared: boolean
): Promise<void> {
  const stateKey = REDIS_KEYS.researchState(chatId)
  const activitiesKey = REDIS_KEYS.researchActivities(chatId)
  const sourcesKey = REDIS_KEYS.researchSources(chatId)

  if (isCleared) {
    await Promise.all([
      // Update state
      kv.hset(stateKey, {
        isCleared: true,
        clearedAt: new Date().toISOString()
      }),
      // Clear activities and sources
      kv.del(activitiesKey),
      kv.del(sourcesKey)
    ])
  } else {
    await kv.hset(stateKey, {
      isCleared: false,
      clearedAt: null
    })
  }
}

export async function getChatResearchState(chatId: string): Promise<ChatResearchState> {
  const stateKey = REDIS_KEYS.researchState(chatId)
  const activitiesKey = REDIS_KEYS.researchActivities(chatId)
  const sourcesKey = REDIS_KEYS.researchSources(chatId)

  const [state, activities, sources] = await Promise.all([
    kv.hgetall<{ isCleared: boolean; clearedAt?: string }>(stateKey),
    kv.lrange<ChatResearchActivity>(activitiesKey, 0, -1),
    kv.lrange<ChatResearchSource>(sourcesKey, 0, -1)
  ])

  if (state?.isCleared) {
    return {
      isCleared: true,
      clearedAt: state.clearedAt,
      activities: [],
      sources: []
    }
  }

  return {
    isCleared: false,
    activities: activities || [],
    sources: sources || []
  }
}

export async function addResearchActivity(
  chatId: string,
  activity: Omit<ChatResearchActivity, 'id' | 'chatId' | 'createdAt'>
): Promise<void> {
  const activitiesKey = REDIS_KEYS.researchActivities(chatId)
  const state = await getChatResearchState(chatId)

  if (state.isCleared) {
    return
  }

  const newActivity: ChatResearchActivity = {
    ...activity,
    id: nanoid(),
    chatId,
    createdAt: new Date().toISOString()
  }

  await kv.lpush(activitiesKey, JSON.stringify(newActivity))
}

export async function addResearchSource(
  chatId: string,
  source: Omit<ChatResearchSource, 'id' | 'chatId' | 'createdAt'>
): Promise<void> {
  const sourcesKey = REDIS_KEYS.researchSources(chatId)
  const state = await getChatResearchState(chatId)

  if (state.isCleared) {
    return
  }

  const newSource: ChatResearchSource = {
    ...source,
    id: nanoid(),
    chatId,
    createdAt: new Date().toISOString()
  }

  await kv.lpush(sourcesKey, JSON.stringify(newSource))
}

export async function updateActivityStatus(
  chatId: string,
  activityId: string,
  status: ChatResearchActivity['status']
): Promise<void> {
  const activitiesKey = REDIS_KEYS.researchActivities(chatId)
  const activities = await kv.lrange<ChatResearchActivity>(activitiesKey, 0, -1)

  if (!activities) return

  const updatedActivities = activities.map(activity => 
    activity.id === activityId 
      ? { ...activity, status }
      : activity
  )

  await kv.del(activitiesKey)
  await Promise.all(
    updatedActivities.map(activity => 
      kv.lpush(activitiesKey, JSON.stringify(activity))
    )
  )
} 