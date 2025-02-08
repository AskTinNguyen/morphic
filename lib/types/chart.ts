export type ChartType = 'line' | 'bar'

export interface ChartDataPoint {
  x: number | string | Date
  y: number
  label?: string
}

export interface ChartDataset {
  label: string
  data: number[]
  borderColor?: string
  backgroundColor?: string
  borderWidth?: number
  tension?: number
}

export interface ChartJSData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartData {
  type: ChartType
  title?: string
  chartData: ChartJSData
}

export interface ChartMessage {
  type: 'chart'
  data: ChartData
} 