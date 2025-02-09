'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Chart from '@/components/ui/chart'
import { useState } from 'react'

const testLineData = {
  labels: ['January', 'February', 'March', 'April', 'May'],
  datasets: [
    {
      label: 'Sample Dataset 1',
      data: [65, 59, 80, 81, 56],
      borderColor: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderWidth: 2
    },
    {
      label: 'Sample Dataset 2',
      data: [28, 48, 40, 19, 86],
      borderColor: '#2196F3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      borderWidth: 2
    }
  ]
}

const testBarData = {
  labels: ['January', 'February', 'March', 'April', 'May'],
  datasets: [
    {
      label: 'Sample Bar Data',
      data: [65, 59, 80, 81, 56],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }
  ]
}

export default function ChartTest() {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-center space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            chartType === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setChartType('line')}
        >
          Line Chart
        </button>
        <button
          className={`px-4 py-2 rounded ${
            chartType === 'bar' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setChartType('bar')}
        >
          Bar Chart
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chart.js Test: {chartType.toUpperCase()} Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart
            type={chartType}
            data={chartType === 'line' ? testLineData : testBarData}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(chartType === 'line' ? testLineData : testBarData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
} 