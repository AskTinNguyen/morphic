'use client'

import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { memo } from 'react'

// Dynamically import Line chart
const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => {
    import('chart.js').then(({ Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend }) => {
      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)
    })
    return mod.Line
  }),
  { ssr: false }
)

// Dynamically import Bar chart
const Bar = dynamic(
  () => import('react-chartjs-2').then((mod) => {
    import('chart.js').then(({ Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend }) => {
      Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
    })
    return mod.Bar
  }),
  { ssr: false }
)

// Default options as per Chart.js docs
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: ''
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true
      }
    },
    y: {
      display: true,
      beginAtZero: true
    }
  }
}

interface ChartProps {
  type?: 'line' | 'bar'
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      borderColor?: string
      backgroundColor?: string
      borderWidth?: number
    }>
  }
  className?: string
}

function ChartComponent({ type = 'line', data, className }: ChartProps) {
  const Component = type === 'line' ? Line : Bar
  
  return (
    <div className={cn('w-full h-[300px]', className)}>
      <Component 
        data={data}
        options={{
          ...defaultOptions,
          animation: {
            duration: 0 // Disable animations for better performance
          }
        }}
      />
    </div>
  )
}

// Memoize the chart component to prevent unnecessary re-renders
export default memo(ChartComponent) 