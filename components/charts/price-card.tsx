'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink } from 'lucide-react'

interface PriceCardProps {
  symbol: string
  type: 'stock' | 'crypto'
  showChart?: boolean
  compact?: boolean
}

interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  previousClose: number
  timestamp: string
}

interface CryptoData {
  id: string
  symbol: string
  name: string
  price: number
  priceChange24h: number
  priceChangePercent24h: number
  marketCap: number
  volume24h: number
  high24h: number
  low24h: number
  lastUpdated: string
}

export function PriceCard({ symbol, type, showChart = false, compact = false }: PriceCardProps) {
  const [data, setData] = useState<StockData | CryptoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<number[]>([])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/finance?type=${type}&symbol=${encodeURIComponent(symbol)}`)
      const result = await response.json() as { success: boolean; data?: StockData | CryptoData; error?: string }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }
      
      setData(result.data ?? null)

      // Fetch sparkline data for chart
      if (showChart) {
        const historyParam = type === 'crypto' ? '7' : '1w'
        const historyRes = await fetch(
          `/api/finance?type=${type}&symbol=${encodeURIComponent(symbol)}&history=${historyParam}`
        )
        const historyResult = await historyRes.json() as { success: boolean; data?: { data: any[] } }
        
        if (historyResult.success && historyResult.data?.data) {
          const prices = type === 'crypto'
            ? historyResult.data.data.map((d: any) => d.price)
            : historyResult.data.data.map((d: any) => d.close)
          setChartData(prices.slice(-20)) // Last 20 points for sparkline
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [symbol, type])

  if (loading) {
    return (
      <div className={`bg-card border rounded-lg ${compact ? 'p-3' : 'p-4'} animate-pulse`}>
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="mt-2 h-6 w-24 bg-muted rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-card border border-destructive/50 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="text-destructive text-sm">{error}</div>
        <button 
          onClick={fetchData}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const isPositive = type === 'crypto' 
    ? (data as CryptoData).priceChangePercent24h >= 0
    : (data as StockData).changePercent >= 0

  const changePercent = type === 'crypto'
    ? (data as CryptoData).priceChangePercent24h
    : (data as StockData).changePercent

  const price = data.price
  const displaySymbol = type === 'crypto' ? (data as CryptoData).symbol : (data as StockData).symbol
  const displayName = type === 'crypto' ? (data as CryptoData).name : displaySymbol

  const externalUrl = type === 'crypto'
    ? `https://www.coingecko.com/en/coins/${(data as CryptoData).id}`
    : `https://finance.yahoo.com/quote/${displaySymbol}`

  return (
    <div className={`bg-card border rounded-lg ${compact ? 'p-3' : 'p-4'} hover:border-primary/50 transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{displaySymbol}</span>
          {!compact && (
            <span className="text-sm text-muted-foreground">{displayName}</span>
          )}
        </div>
        <a 
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Price */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Sparkline Chart */}
      {showChart && chartData.length > 0 && (
        <div className="mt-3 h-12">
          <Sparkline data={chartData} positive={isPositive} />
        </div>
      )}

      {/* Stats (only in non-compact mode) */}
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">High: </span>
            <span className="text-foreground">
              ${(type === 'crypto' ? (data as CryptoData).high24h : (data as StockData).high).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Low: </span>
            <span className="text-foreground">
              ${(type === 'crypto' ? (data as CryptoData).low24h : (data as StockData).low).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Volume: </span>
            <span className="text-foreground">
              {formatVolume(type === 'crypto' ? (data as CryptoData).volume24h : (data as StockData).volume)}
            </span>
          </div>
          {type === 'crypto' && (
            <div>
              <span className="text-muted-foreground">MCap: </span>
              <span className="text-foreground">
                {formatVolume((data as CryptoData).marketCap)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Simple SVG Sparkline component
function Sparkline({ data, positive }: { data: number[], positive: boolean }) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const width = 100
  const height = 40
  const padding = 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding)
    const y = height - padding - ((value - min) / range) * (height - 2 * padding)
    return `${x},${y}`
  }).join(' ')

  const strokeColor = positive ? '#22c55e' : '#ef4444'
  const fillColor = positive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'

  // Create area path
  const firstX = padding
  const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - 2 * padding)
  const areaPath = `M ${firstX},${height} L ${points} L ${lastX},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <path d={areaPath} fill={fillColor} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

// Format large numbers
function formatVolume(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toLocaleString()}`
}

export default PriceCard
