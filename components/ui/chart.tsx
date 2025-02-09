'use client'

import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { memo } from 'react'

// Unified Chart.js registration
const registerChart = async () => {
  console.log('🔄 Starting Chart.js registration...')
  const { Chart } = await import('chart.js')
  const { 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement,
    BarElement, 
    Title, 
    Tooltip, 
    Legend 
  } = await import('chart.js')

  // Register once for all chart types
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
  )
  console.log('✅ Chart.js registration complete')
}

// Dynamically import Line chart with proper registration
const Line = dynamic(
  async () => {
    console.log('📈 Loading Line chart component...')
    await registerChart()
    const { Line } = await import('react-chartjs-2')
    console.log('✅ Line chart component loaded')
    return Line
  },
  { 
    ssr: false,
    loading: () => {
      console.log('⌛ Line chart loading state active')
      return (
        <div className="w-full h-[300px] flex items-center justify-center">
          Loading chart...
        </div>
      )
    }
  }
)

// Dynamically import Bar chart with proper registration
const Bar = dynamic(
  async () => {
    console.log('📊 Loading Bar chart component...')
    await registerChart()
    const { Bar } = await import('react-chartjs-2')
    console.log('✅ Bar chart component loaded')
    return Bar
  },
  { 
    ssr: false,
    loading: () => {
      console.log('⌛ Bar chart loading state active')
      return (
        <div className="w-full h-[300px] flex items-center justify-center">
          Loading chart...
        </div>
      )
    }
  }
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
  console.log('🎨 Chart render attempt:', { type, data })
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