'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Loader2 } from 'lucide-react'

type TimeRange = '1d' | '1w' | '1m' | '3m' | '1y'

interface StockChartProps {
  symbol: string
  type: 'stock' | 'crypto'
  initialRange?: TimeRange | number
  height?: number
}

interface DataPoint {
  date: string
  close?: number
  price?: number
  open?: number
  high?: number
  low?: number
  volume?: number
}

export function StockChart({ 
  symbol, 
  type,
  initialRange = type === 'crypto' ? 30 : '1m',
  height = 300
}: StockChartProps) {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<TimeRange | number>(initialRange)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const historyParam = typeof range === 'number' ? range.toString() : range
      const response = await fetch(
        `/api/finance?type=${type}&symbol=${encodeURIComponent(symbol)}&history=${historyParam}`
      )
      const result = await response.json() as { success: boolean; data?: { data: DataPoint[] }; error?: string }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }
      
      setData(result.data?.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [symbol, type, range])

  const stockRanges: TimeRange[] = ['1d', '1w', '1m', '3m', '1y']
  const cryptoRanges = [1, 7, 30, 90, 365]

  const displayRanges = type === 'stock' ? stockRanges : cryptoRanges
  const rangeLabels: Record<string | number, string> = {
    '1d': '1D', '1w': '1W', '1m': '1M', '3m': '3M', '1y': '1Y',
    1: '24H', 7: '7D', 30: '30D', 90: '90D', 365: '1Y'
  }

  if (loading) {
    return (
      <div 
        className="bg-card border rounded-lg p-4 flex items-center justify-center"
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className="bg-card border border-destructive/50 rounded-lg p-4 flex flex-col items-center justify-center"
        style={{ height }}
      >
        <div className="text-destructive text-sm mb-2">{error}</div>
        <button 
          onClick={fetchData}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div 
        className="bg-card border rounded-lg p-4 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-muted-foreground text-sm">No data available</div>
      </div>
    )
  }

  // Calculate chart metrics
  const prices = data.map(d => d.close ?? d.price ?? 0)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1
  
  const firstPrice = prices[0]
  const lastPrice = prices[prices.length - 1]
  const priceChange = lastPrice - firstPrice
  const percentChange = (priceChange / firstPrice) * 100
  const isPositive = priceChange >= 0

  const hoveredData = hoverIndex !== null ? data[hoverIndex] : null
  const hoveredPrice = hoveredData 
    ? (hoveredData.close ?? hoveredData.price ?? 0)
    : lastPrice

  return (
    <div className="bg-card border rounded-lg p-4" style={{ minHeight: height }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-lg font-bold text-foreground">{symbol.toUpperCase()}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              ${hoveredPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
              </span>
            </div>
          </div>
          {hoveredData && (
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(hoveredData.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: type === 'stock' && range === '1d' ? 'numeric' : undefined,
                minute: type === 'stock' && range === '1d' ? 'numeric' : undefined
              })}
            </div>
          )}
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-1">
          {displayRanges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as TimeRange | number)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                range === r 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div 
        className="relative"
        style={{ height: height - 120 }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <ChartArea 
          data={prices}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          isPositive={isPositive}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
        />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-xs border-t pt-3">
        <div>
          <div className="text-muted-foreground">Open</div>
          <div className="font-medium">${prices[0].toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-muted-foreground">High</div>
          <div className="font-medium">${maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Low</div>
          <div className="font-medium">${minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Close</div>
          <div className="font-medium">${lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>
  )
}

// SVG Chart Component
function ChartArea({
  data,
  minPrice,
  maxPrice,
  priceRange,
  isPositive,
  hoverIndex,
  onHover
}: {
  data: number[]
  minPrice: number
  maxPrice: number
  priceRange: number
  isPositive: boolean
  hoverIndex: number | null
  onHover: (index: number | null) => void
}) {
  const width = 100
  const height = 100
  const padding = { top: 5, right: 2, bottom: 5, left: 2 }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Generate path points
  const points = data.map((price, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth
    const y = padding.top + (1 - (price - minPrice) / priceRange) * chartHeight
    return { x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  
  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`

  const strokeColor = isPositive ? '#22c55e' : '#ef4444'
  const fillColor = isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * width
    const index = Math.round(((x - padding.left) / chartWidth) * (data.length - 1))
    onHover(Math.max(0, Math.min(data.length - 1, index)))
  }

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-full"
      preserveAspectRatio="none"
      onMouseMove={handleMouseMove}
    >
      {/* Grid lines */}
      <defs>
        <pattern id="grid" width="10" height="20" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Area fill */}
      <path d={areaD} fill={fillColor} />
      
      {/* Line */}
      <path 
        d={pathD} 
        fill="none" 
        stroke={strokeColor}
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Hover indicator */}
      {hoverIndex !== null && points[hoverIndex] && (
        <>
          <line
            x1={points[hoverIndex].x}
            y1={padding.top}
            x2={points[hoverIndex].x}
            y2={height - padding.bottom}
            stroke={strokeColor}
            strokeWidth="0.3"
            strokeDasharray="2,2"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={points[hoverIndex].x}
            cy={points[hoverIndex].y}
            r="1.5"
            fill={strokeColor}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  )
}

export default StockChart
