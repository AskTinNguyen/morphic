import { ChartData, ChartDataset, ChartType, ChartTypeRegistry } from 'chart.js'
import { ChatChartData } from '../types/chart'

export type ProcessedChartData<TType extends keyof ChartTypeRegistry = ChartType> = ChartData<TType> & {
  lastUpdated: number
}

export interface ChartUpdateOptions {
  appendData?: boolean
  maxDataPoints?: number
}

export class ChartDataProcessor {
  private static instance: ChartDataProcessor
  
  private constructor() {}

  public static getInstance(): ChartDataProcessor {
    if (!ChartDataProcessor.instance) {
      ChartDataProcessor.instance = new ChartDataProcessor()
    }
    return ChartDataProcessor.instance
  }

  /**
   * Preprocesses raw data into chart-ready format
   */
  public preprocessData<TType extends keyof ChartTypeRegistry>(
    data: ChartData<TType> | ChatChartData
  ): ProcessedChartData<TType> {
    const datasets = 'datasets' in data ? data.datasets : []
    const labels = 'labels' in data ? data.labels : []

    const processedData: ProcessedChartData<TType> = {
      labels,
      datasets: datasets.map((dataset, index) => {
        // Temperature dataset (first dataset)
        if (index === 0) {
          return {
            ...dataset,
            borderWidth: 2,
            backgroundColor: 'rgba(255, 159, 64, 0.1)', // Warm orange
            borderColor: 'rgb(255, 159, 64)',
            tension: 0.4,
            label: dataset.label || 'Temperature (°C)',
            yAxisID: 'y' // Left y-axis for temperature
          }
        }
        // AQI dataset (second dataset)
        return {
          ...dataset,
          borderWidth: 2,
          backgroundColor: 'rgba(75, 192, 192, 0.1)', // Cool teal
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.4,
          label: dataset.label || 'AQI',
          yAxisID: 'y1' // Right y-axis for AQI
        }
      }) as unknown as ChartDataset<TType>[],
      lastUpdated: Date.now()
    }

    return processedData
  }

  /**
   * Updates existing chart data with new data points
   */
  public updateChartData<TType extends keyof ChartTypeRegistry>(
    currentData: ProcessedChartData<TType>,
    newData: ChartData<TType> | ChatChartData,
    options: ChartUpdateOptions = {}
  ): ProcessedChartData<TType> {
    const { appendData = false, maxDataPoints = 50 } = options

    if (!appendData) {
      return this.preprocessData(newData)
    }

    const newLabels = 'labels' in newData ? newData.labels : []
    const updatedLabels = [...(currentData.labels || []), ...(newLabels || [])]
    const finalLabels = updatedLabels.slice(-maxDataPoints)

    const processedData: ProcessedChartData<TType> = {
      labels: finalLabels,
      datasets: currentData.datasets.map((dataset, index) => {
        const newDataset = newData.datasets?.[index]
        if (!newDataset) return dataset

        return {
          ...dataset,
          data: [
            ...(dataset.data || []),
            ...(newDataset.data || [])
          ].slice(-maxDataPoints)
        }
      }) as unknown as ChartDataset<TType>[],
      lastUpdated: Date.now()
    }

    return processedData
  }

  /**
   * Formats data for specific chart types
   */
  public formatForChartType<TType extends keyof ChartTypeRegistry>(
    data: ProcessedChartData<TType>,
    type: TType
  ): ProcessedChartData<TType> {
    const formattedData = { ...data }

    const processDatasets = (datasets: ChartDataset<TType>[]): ChartDataset<TType>[] => {
      switch (type) {
        case 'line':
          return datasets.map((dataset, index) => ({
            ...dataset,
            type: 'line',
            fill: false,
            tension: 0.4,
            yAxisID: index === 0 ? 'y' : 'y1' // Ensure y-axis IDs are preserved
          })) as unknown as ChartDataset<TType>[]
        case 'bar':
          return datasets.map((dataset, index) => ({
            ...dataset,
            type: 'bar',
            borderWidth: 1,
            yAxisID: index === 0 ? 'y' : 'y1' // Ensure y-axis IDs are preserved
          })) as unknown as ChartDataset<TType>[]
        default:
          return datasets
      }
    }

    formattedData.datasets = processDatasets(formattedData.datasets)
    return formattedData
  }
} 