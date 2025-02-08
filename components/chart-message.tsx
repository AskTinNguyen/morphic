'use client'

import type { ChartMessage as ChartMessageType } from '@/lib/types/chart'
import dynamic from 'next/dynamic'
import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

// Dynamically import Chart component with no SSR
const Chart = dynamic(() => import('./ui/chart'), { ssr: false })

interface ChartMessageProps {
  message: ChartMessageType
}

const ChartMessageComponent = ({ message }: ChartMessageProps) => {
  console.log('ChartMessage received:', message)

  if (!message?.data?.chartData) {
    console.warn('No chart data available:', message)
    return null
  }

  // Ensure we only use supported chart types
  const chartType = message.data.type === 'bar' ? 'bar' : 'line'

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {message.data.title && (
        <CardHeader>
          <CardTitle>{message.data.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Chart 
          type={chartType}
          data={message.data.chartData}
          className="w-full h-[300px]"
        />
      </CardContent>
    </Card>
  )
}

export const ChartMessage = memo(ChartMessageComponent) 