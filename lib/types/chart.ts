export type ChartType = 'line' | 'bar'

// Raw data structure that comes from the AI response
export interface RawChartData {
  type?: ChartType
  title?: string
  labels?: string[]
  data?: Array<{
    month: string  // or any other time unit
    [key: string]: any
  }>
  datasets: Array<{
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
    borderWidth?: number
    tension?: number
  }>
}

// Chart.js specific dataset structure
export interface ChartDataset {
  label: string
  data: number[]
  borderColor?: string
  backgroundColor?: string
  borderWidth?: number
  tension?: number
}

// Chart.js compatible data structure
export interface ChartJSData {
  labels: string[]
  datasets: ChartDataset[]
}

// Our application's chart data structure
export interface ChartData {
  type: ChartType
  title?: string
  chartData: ChartJSData
}

// Message structure for chart data
export interface ChartMessage {
  type: 'chart'
  role: 'assistant'
  content: string
  data: ChartData
}

// Validation type guards
export function isChartDataset(data: any): data is ChartDataset {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.label === 'string' &&
    Array.isArray(data.data) &&
    data.data.every((item: any) => typeof item === 'number')
  )
}

export function isChartJSData(data: any): data is ChartJSData {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.labels) &&
    Array.isArray(data.datasets) &&
    data.datasets.every(isChartDataset)
  )
}

export function isChartData(data: any): data is ChartData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data.type === 'line' || data.type === 'bar') &&
    isChartJSData(data.chartData)
  )
} 