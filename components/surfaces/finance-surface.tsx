/**
 * Finance Surface - Comprehensive Financial Analysis Dashboard
 * 
 * Features:
 * - Executive summary with sentiment
 * - Fundamental analysis panel
 * - Technical analysis with indicators
 * - Market cycle position
 * - Research insights (risks, catalysts)
 * - News headlines
 * - Generic dashboard fallback
 */

"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { FinanceMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  Target,
  AlertTriangle,
  Newspaper,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Zap,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { StockChart } from "@/components/charts/stock-chart";

interface FinanceSurfaceProps {
  metadata: FinanceMetadata;
  surfaceState: SurfaceState;
  className?: string;
}

// Sentiment badge component
function SentimentBadge({ sentiment }: { sentiment: 'bullish' | 'neutral' | 'bearish' }) {
  const config = {
    bullish: { icon: TrendingUp, color: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'Bullish' },
    neutral: { icon: Minus, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400', label: 'Neutral' },
    bearish: { icon: TrendingDown, color: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Bearish' },
  }
  const { icon: Icon, color, label } = config[sentiment]
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium", color)}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  )
}

// Signal indicator
function SignalIndicator({ signal }: { signal: 'positive' | 'neutral' | 'negative' | 'buy' | 'sell' }) {
  const colors = {
    positive: 'bg-green-500',
    buy: 'bg-green-500',
    neutral: 'bg-gray-400',
    negative: 'bg-red-500',
    sell: 'bg-red-500',
  }
  return <span className={cn("w-2 h-2 rounded-full", colors[signal])} />
}

// Collapsible section
function Section({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// Price header component
function PriceHeader({ asset, liveData }: { asset: FinanceMetadata['asset']; liveData: FinanceMetadata['liveData'] }) {
  const isPositive = liveData.changePercent24h >= 0
  
  return (
    <div className="bg-gradient-to-br from-card to-muted/30 border border-border/40 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary uppercase">
              {asset.type}
            </span>
            {asset.sector && (
              <span className="text-xs text-muted-foreground">
                {asset.sector} • {asset.industry}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            {asset.name}
          </h1>
          <p className="text-muted-foreground">{asset.symbol}</p>
        </div>
        
        <div className="text-right">
          <div className="text-3xl md:text-4xl font-bold mb-1">
            ${liveData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={cn(
            "flex items-center gap-2 justify-end text-lg font-medium",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            <span>{isPositive ? '+' : ''}{liveData.change24h.toFixed(2)}</span>
            <span>({isPositive ? '+' : ''}{liveData.changePercent24h.toFixed(2)}%)</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            <span>H: ${liveData.high24h.toFixed(2)}</span>
            <span className="mx-2">•</span>
            <span>L: ${liveData.low24h.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Market stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/30">
        <div>
          <div className="text-sm text-muted-foreground">Market Cap</div>
          <div className="font-semibold">${(liveData.marketCap / 1e9).toFixed(2)}B</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Volume</div>
          <div className="font-semibold">{(liveData.volume / 1e6).toFixed(2)}M</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">24h High</div>
          <div className="font-semibold">${liveData.high24h.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">24h Low</div>
          <div className="font-semibold">${liveData.low24h.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}

// Fundamentals panel
function FundamentalsPanel({ fundamentals }: { fundamentals: FinanceMetadata['fundamentals'] }) {
  if (!fundamentals.available) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Fundamental data not available</p>
      </div>
    )
  }
  
  const verdictColors = {
    'undervalued': 'text-green-600 bg-green-500/10',
    'fairly-valued': 'text-gray-600 bg-gray-500/10',
    'overvalued': 'text-red-600 bg-red-500/10',
  }
  
  return (
    <div className="space-y-4">
      {/* Verdict */}
      <div className="flex items-center gap-3">
        <span className={cn("px-3 py-1 rounded-full text-sm font-medium capitalize", verdictColors[fundamentals.verdict])}>
          {fundamentals.verdict.replace('-', ' ')}
        </span>
      </div>
      
      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fundamentals.metrics.map((metric, idx) => (
          <div key={idx} className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{metric.name}</span>
              <SignalIndicator signal={metric.signal} />
            </div>
            <div className="font-semibold">{metric.value}</div>
            {metric.benchmark && (
              <div className="text-xs text-muted-foreground mt-1">{metric.benchmark}</div>
            )}
          </div>
        ))}
      </div>
      
      {/* Analysis */}
      {fundamentals.analysis && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{fundamentals.analysis}</Markdown>
        </div>
      )}
    </div>
  )
}

// Technicals panel
function TechnicalsPanel({ technicals }: { technicals: FinanceMetadata['technicals'] }) {
  const trendColors = {
    'strong-uptrend': 'text-green-600 bg-green-500/10',
    'uptrend': 'text-green-500 bg-green-500/10',
    'sideways': 'text-gray-600 bg-gray-500/10',
    'downtrend': 'text-red-500 bg-red-500/10',
    'strong-downtrend': 'text-red-600 bg-red-500/10',
  }
  
  return (
    <div className="space-y-4">
      {/* Trend */}
      <div className="flex items-center gap-3">
        <span className={cn("px-3 py-1 rounded-full text-sm font-medium capitalize", trendColors[technicals.trend])}>
          {technicals.trend.replace('-', ' ')}
        </span>
      </div>
      
      {/* Support/Resistance */}
      {(technicals.support.length > 0 || technicals.resistance.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Support Levels</h4>
            <div className="space-y-1">
              {technicals.support.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-green-600">${s.level.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground capitalize">{s.strength}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Resistance Levels</h4>
            <div className="space-y-1">
              {technicals.resistance.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-red-600">${r.level.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground capitalize">{r.strength}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Indicators */}
      {technicals.indicators.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Indicators</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {technicals.indicators.map((ind, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{ind.name}</span>
                  <SignalIndicator signal={ind.signal} />
                </div>
                <div className="text-sm text-muted-foreground">{ind.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Patterns */}
      {technicals.patterns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Patterns</h4>
          <div className="flex flex-wrap gap-2">
            {technicals.patterns.map((pattern, idx) => (
              <span key={idx} className="px-3 py-1 bg-muted/50 rounded-full text-sm">
                {pattern.name}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Analysis */}
      {technicals.analysis && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{technicals.analysis}</Markdown>
        </div>
      )}
    </div>
  )
}

// Cycles panel
function CyclesPanel({ cycles }: { cycles: FinanceMetadata['cycles'] }) {
  const phaseColors = {
    'accumulation': 'from-blue-500 to-blue-600',
    'markup': 'from-green-500 to-green-600',
    'distribution': 'from-yellow-500 to-yellow-600',
    'decline': 'from-red-500 to-red-600',
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Phase */}
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r",
          phaseColors[cycles.phase]
        )}>
          <Activity className="h-4 w-4" />
          <span className="capitalize">{cycles.phase} Phase</span>
        </div>
        
        {/* Sentiment gauge */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Sentiment:</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/30" 
                style={{ marginLeft: `${cycles.sentiment}%`, width: '4px' }}
              />
            </div>
            <span className="text-sm font-medium">{cycles.sentimentLabel}</span>
          </div>
        </div>
      </div>
      
      {/* Macro context */}
      {cycles.macroContext && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Macro Context</h4>
          <p className="text-sm text-muted-foreground">{cycles.macroContext}</p>
        </div>
      )}
      
      {/* Seasonality */}
      {cycles.seasonality && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Seasonality</h4>
          <p className="text-sm text-muted-foreground">{cycles.seasonality}</p>
        </div>
      )}
    </div>
  )
}

// Research panel
function ResearchPanel({ research }: { research: FinanceMetadata['research'] }) {
  return (
    <div className="space-y-4">
      {/* Bull/Bear thesis */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
          <h4 className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400 mb-3">
            <TrendingUp className="h-4 w-4" />
            Bull Case
          </h4>
          <ul className="space-y-2">
            {research.thesis.bull.map((point, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
          <h4 className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400 mb-3">
            <TrendingDown className="h-4 w-4" />
            Bear Case
          </h4>
          <ul className="space-y-2">
            {research.thesis.bear.map((point, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Risks */}
      {research.risks.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 font-medium mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Key Risks
          </h4>
          <div className="flex flex-wrap gap-2">
            {research.risks.map((risk, idx) => (
              <span 
                key={idx} 
                className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  risk.severity === 'high' && "bg-red-500/10 text-red-600",
                  risk.severity === 'medium' && "bg-amber-500/10 text-amber-600",
                  risk.severity === 'low' && "bg-gray-500/10 text-gray-600"
                )}
              >
                {risk.risk}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Catalysts */}
      {research.catalysts.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 font-medium mb-3">
            <Zap className="h-4 w-4 text-purple-500" />
            Upcoming Catalysts
          </h4>
          <div className="space-y-2">
            {research.catalysts.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="font-medium">{cat.event}</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {cat.date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cat.date}</span>}
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{cat.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Comparables */}
      {research.comparables.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 font-medium mb-3">
            <Shield className="h-4 w-4" />
            Comparable Assets
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {research.comparables.map((comp, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                <div className="font-medium">{comp.symbol}</div>
                <div className="text-sm text-muted-foreground">{comp.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// News panel
function NewsPanel({ news }: { news: FinanceMetadata['news'] }) {
  if (news.headlines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent news available</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {news.headlines.map((headline, idx) => (
        <a 
          key={idx}
          href={headline.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium group-hover:text-primary transition-colors">{headline.title}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {headline.source} • {new Date(headline.date).toLocaleDateString()}
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </a>
      ))}
    </div>
  )
}

// Generic dashboard with enhanced fallback UI
function GenericDashboard({ genericData }: { genericData: FinanceMetadata['genericData'] }) {
  if (!genericData) return null
  
  const hasFailed = !!genericData.failureReason
  const hasPartialMatches = genericData.partialMatches && genericData.partialMatches.length > 0
  
  return (
    <div className="space-y-6">
      {/* Header - contextual based on failure */}
      <div className="text-center py-6">
        {hasFailed ? (
          <>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Could Not Load Asset Data</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {genericData.failureReason}
            </p>
            {genericData.searchedTerms && genericData.searchedTerms.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Searched for: <span className="font-medium">{genericData.searchedTerms.join(', ')}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Financial Market Overview</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Ask about a specific stock or cryptocurrency for detailed analysis
            </p>
          </>
        )}
      </div>
      
      {/* Partial Matches - If we found some results but couldn't pick one */}
      {hasPartialMatches && (
        <div className="bg-card border border-border/40 rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Did you mean one of these?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {genericData.partialMatches!.map((match, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-muted/30 rounded-lg border border-border/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{match.symbol}</div>
                    <div className="text-sm text-muted-foreground">{match.name}</div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full capitalize",
                    match.type === 'crypto' ? "bg-purple-500/10 text-purple-600" :
                    match.type === 'etf' ? "bg-blue-500/10 text-blue-600" :
                    "bg-green-500/10 text-green-600"
                  )}>
                    {match.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Try asking specifically: &quot;Analyze {genericData.partialMatches![0]?.symbol}&quot;
          </p>
        </div>
      )}
      
      {/* Quick examples */}
      <div className="bg-card border border-border/40 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Try These Examples</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { query: 'AAPL', label: 'Apple Inc.', type: 'Stock' },
            { query: 'bitcoin', label: 'Bitcoin', type: 'Crypto' },
            { query: 'RELIANCE.NS', label: 'Reliance (India)', type: 'Stock' },
            { query: 'TSLA', label: 'Tesla', type: 'Stock' },
          ].map((example, idx) => (
            <div key={idx} className="p-3 bg-muted/30 rounded-lg text-center">
              <div className="font-mono text-sm font-semibold text-primary">{example.query}</div>
              <div className="text-xs text-muted-foreground">{example.label}</div>
              <div className="text-xs text-muted-foreground/60">{example.type}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Cryptos - only show if available and no failure */}
      {!hasFailed && genericData.topCryptos && genericData.topCryptos.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Top Cryptocurrencies</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {genericData.topCryptos.map((crypto, idx) => (
              <div key={idx} className="p-4 bg-card border border-border/40 rounded-xl">
                <div className="font-semibold">{crypto.symbol}</div>
                <div className="text-lg font-bold">${crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className={cn(
                  "text-sm",
                  crypto.change >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Supported Markets Info */}
      <div className="bg-muted/30 rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Supported Markets:</span> US Stocks (NYSE, NASDAQ) • International Stocks (LSE, TSX, NSE, etc.) • ETFs • Cryptocurrencies
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          For international stocks, use the exchange suffix (e.g., RELIANCE.NS for NSE India, BP.L for London)
        </p>
      </div>
    </div>
  )
}


// Main component
export const FinanceSurface = memo(function FinanceSurface({
  metadata,
  surfaceState,
  className,
}: FinanceSurfaceProps) {
  // Generic dashboard
  if (metadata.isGeneric) {
    return (
      <div className={cn("max-w-6xl mx-auto", className)}>
        <GenericDashboard genericData={metadata.genericData} />
      </div>
    )
  }
  
  return (
    <div className={cn("max-w-6xl mx-auto space-y-6", className)}>
      {/* Price Header */}
      <PriceHeader asset={metadata.asset} liveData={metadata.liveData} />
      
      {/* Price Chart */}
      <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
        <StockChart 
          symbol={metadata.asset.symbol}
          type={metadata.asset.type === 'crypto' ? 'crypto' : 'stock'}
          height={350}
        />
      </div>
      
      {/* Summary */}
      <div className="bg-card border border-border/40 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Executive Summary</h2>
          <SentimentBadge sentiment={metadata.summary.sentiment} />
        </div>
        <p className="text-xl font-medium mb-4">{metadata.summary.headline}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{metadata.summary.analysis}</Markdown>
        </div>
      </div>
      
      {/* Analysis sections in 2-column grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Fundamentals" icon={BarChart3}>
          <FundamentalsPanel fundamentals={metadata.fundamentals} />
        </Section>
        
        <Section title="Technical Analysis" icon={Activity}>
          <TechnicalsPanel technicals={metadata.technicals} />
        </Section>
      </div>
      
      {/* Market Cycles */}
      <Section title="Market Cycles" icon={Target}>
        <CyclesPanel cycles={metadata.cycles} />
      </Section>
      
      {/* Research */}
      <Section title="Research Insights" icon={Shield}>
        <ResearchPanel research={metadata.research} />
      </Section>
      
      {/* News */}
      <Section title="Latest News" icon={Newspaper} defaultOpen={false}>
        <NewsPanel news={metadata.news} />
      </Section>
    </div>
  )
})

export default FinanceSurface
