/**
 * Finance Surface - Yahoo Finance Style Layout
 * 
 * Clean, scannable design with:
 * - Compact header with price + key stats
 * - Prominent news cards (prioritized)
 * - Key insights section with signals
 * - Metrics in clean grids (no collapsibles)
 * - Chart integrated naturally
 */

"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { FinanceMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  AlertTriangle,
  Newspaper,
  ExternalLink,
  Info,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  Target,
  Shield,
} from "lucide-react";
import { Markdown } from "@/components/prompt-kit/markdown";
import { StockChart } from "@/components/charts/stock-chart";

interface FinanceSurfaceProps {
  metadata: FinanceMetadata;
  surfaceState: SurfaceState;
  className?: string;
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

// Compact Price Header (Yahoo Finance style)
function CompactHeader({ asset, liveData, summary }: { 
  asset: FinanceMetadata['asset']; 
  liveData: FinanceMetadata['liveData'];
  summary: FinanceMetadata['summary'];
}) {
  const isPositive = liveData.changePercent24h >= 0;
  
  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
      {/* Left: Price info */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <span className="text-sm font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {asset.symbol}
          </span>
          {asset.type !== 'stock' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              {asset.type}
            </span>
          )}
        </div>
        
        {asset.sector && (
          <p className="text-sm text-muted-foreground mb-3">
            {asset.sector} • {asset.industry}
          </p>
        )}
        
        <div className="flex items-baseline gap-4">
          <span className="text-4xl font-bold">
            ${liveData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={cn(
            "flex items-center gap-1 text-lg font-semibold",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            <span>{isPositive ? '+' : ''}{liveData.change24h.toFixed(2)}</span>
            <span className="text-sm">({isPositive ? '+' : ''}{liveData.changePercent24h.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
      
      {/* Right: Key stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <StatItem label="Market Cap" value={formatNumber(liveData.marketCap)} />
        <StatItem label="Volume" value={formatNumber(liveData.volume)} />
        <StatItem label="Day High" value={`$${liveData.high24h.toFixed(2)}`} valueClass="text-green-600" />
        <StatItem label="Day Low" value={`$${liveData.low24h.toFixed(2)}`} valueClass="text-red-600" />
      </div>
    </div>
  );
}

function StatItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="text-center lg:text-left">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-sm font-semibold", valueClass)}>{value}</div>
    </div>
  );
}

// Key Signals Row (always visible)
function SignalsRow({ metadata }: { metadata: FinanceMetadata }) {
  const signals = [
    {
      label: 'Sentiment',
      value: metadata.summary.sentiment,
      color: metadata.summary.sentiment === 'bullish' ? 'green' : 
             metadata.summary.sentiment === 'bearish' ? 'red' : 'gray',
      icon: metadata.summary.sentiment === 'bullish' ? TrendingUp : 
            metadata.summary.sentiment === 'bearish' ? TrendingDown : Minus,
    },
    {
      label: 'Valuation',
      value: metadata.fundamentals.verdict.replace('-', ' '),
      color: metadata.fundamentals.verdict === 'undervalued' ? 'green' : 
             metadata.fundamentals.verdict === 'overvalued' ? 'red' : 'gray',
      icon: BarChart3,
    },
    {
      label: 'Trend',
      value: metadata.technicals.trend.replace('-', ' '),
      color: metadata.technicals.trend.includes('uptrend') ? 'green' : 
             metadata.technicals.trend.includes('downtrend') ? 'red' : 'gray',
      icon: Activity,
    },
    {
      label: 'Phase',
      value: metadata.cycles.phase,
      color: metadata.cycles.phase === 'markup' ? 'green' : 
             metadata.cycles.phase === 'decline' ? 'red' : 
             metadata.cycles.phase === 'distribution' ? 'amber' : 'blue',
      icon: Target,
    },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {signals.map((signal, idx) => {
        const Icon = signal.icon;
        const colorClasses = {
          green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
          red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
        };
        
        return (
          <div 
            key={idx} 
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border",
              colorClasses[signal.color as keyof typeof colorClasses]
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="text-xs opacity-70">{signal.label}</div>
              <div className="font-semibold capitalize text-sm">{signal.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// News Cards Section (Prominent)
function NewsSection({ news }: { news: FinanceMetadata['news'] }) {
  if (news.headlines.length === 0) {
    return null;
  }
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-primary" />
        Latest News
      </h2>
      <div className="grid gap-3">
        {news.headlines.slice(0, 4).map((headline, idx) => (
          <a 
            key={idx}
            href={headline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-4 bg-card border border-border/50 rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all group"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {headline.title}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="font-medium">{headline.source}</span>
                <Circle className="h-1 w-1 fill-current" />
                <span>{new Date(headline.date).toLocaleDateString()}</span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-1" />
          </a>
        ))}
      </div>
    </div>
  );
}

// Key Insights (Bull/Bear in compact format)
function InsightsSection({ research, summary }: { 
  research: FinanceMetadata['research']; 
  summary: FinanceMetadata['summary'];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Analysis Summary</h2>
      
      {/* Headline */}
      <p className="text-base font-medium">{summary.headline}</p>
      
      {/* Bull/Bear Points in 2 columns */}
      {(research.thesis.bull.length > 0 || research.thesis.bear.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {research.thesis.bull.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium text-sm">Bull Case</span>
              </div>
              <ul className="space-y-1.5">
                {research.thesis.bull.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {research.thesis.bear.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium text-sm">Bear Case</span>
              </div>
              <ul className="space-y-1.5">
                {research.thesis.bear.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Risks & Catalysts inline */}
      <div className="flex flex-wrap gap-2">
        {research.risks.slice(0, 3).map((risk, idx) => (
          <span 
            key={`risk-${idx}`}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full font-medium",
              risk.severity === 'high' ? "bg-red-500/10 text-red-600" :
              risk.severity === 'medium' ? "bg-amber-500/10 text-amber-600" :
              "bg-gray-500/10 text-gray-600"
            )}
          >
            ⚠ {risk.risk}
          </span>
        ))}
        {research.catalysts.slice(0, 2).map((cat, idx) => (
          <span 
            key={`cat-${idx}`}
            className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/10 text-purple-600"
          >
            ⚡ {cat.event}
          </span>
        ))}
      </div>
    </div>
  );
}

// Metrics Grid (clean, no collapsing)
function MetricsGrid({ fundamentals, technicals }: { 
  fundamentals: FinanceMetadata['fundamentals']; 
  technicals: FinanceMetadata['technicals'];
}) {
  const allMetrics = [
    ...fundamentals.metrics.map(m => ({ ...m, category: 'Fundamental' })),
    ...technicals.indicators.map(i => ({ 
      name: i.name, 
      value: i.value, 
      signal: i.signal === 'buy' ? 'positive' : i.signal === 'sell' ? 'negative' : 'neutral',
      category: 'Technical'
    })),
  ];
  
  if (allMetrics.length === 0) return null;
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allMetrics.slice(0, 10).map((metric, idx) => (
          <div key={idx} className="p-3 bg-card border border-border/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{metric.name}</span>
              <span className={cn(
                "w-2 h-2 rounded-full",
                metric.signal === 'positive' ? 'bg-green-500' :
                metric.signal === 'negative' ? 'bg-red-500' : 'bg-gray-400'
              )} />
            </div>
            <div className="font-semibold text-sm">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Support/Resistance Levels
function LevelsSection({ technicals }: { technicals: FinanceMetadata['technicals'] }) {
  if (technicals.support.length === 0 && technicals.resistance.length === 0) return null;
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Price Levels</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-green-600">Support</div>
          {technicals.support.slice(0, 3).map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-green-500/5 rounded">
              <span className="font-mono">${s.level.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground capitalize">{s.strength}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-red-600">Resistance</div>
          {technicals.resistance.slice(0, 3).map((r, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-red-500/5 rounded">
              <span className="font-mono">${r.level.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground capitalize">{r.strength}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Generic Dashboard (fallback)
function GenericDashboard({ genericData }: { genericData: FinanceMetadata['genericData'] }) {
  if (!genericData) return null;
  
  const hasFailed = !!genericData.failureReason;
  const hasPartialMatches = genericData.partialMatches && genericData.partialMatches.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        {hasFailed ? (
          <>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Could Not Load Asset Data</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{genericData.failureReason}</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Financial Market Overview</h2>
            <p className="text-muted-foreground">Ask about a specific stock or cryptocurrency</p>
          </>
        )}
      </div>
      
      {hasPartialMatches && (
        <div className="bg-card border border-border/40 rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Did you mean one of these?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {genericData.partialMatches!.map((match, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                <div className="font-semibold">{match.symbol}</div>
                <div className="text-sm text-muted-foreground">{match.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {genericData.topCryptos && genericData.topCryptos.length > 0 && !hasFailed && (
        <div>
          <h3 className="font-semibold mb-4">Top Cryptocurrencies</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {genericData.topCryptos.map((crypto, idx) => (
              <div key={idx} className="p-4 bg-card border border-border/40 rounded-xl">
                <div className="font-semibold">{crypto.symbol}</div>
                <div className="text-lg font-bold">${crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className={cn("text-sm", crypto.change >= 0 ? "text-green-600" : "text-red-600")}>
                  {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export const FinanceSurface = memo(function FinanceSurface({
  metadata,
  surfaceState,
  className,
}: FinanceSurfaceProps) {
  if (metadata.isGeneric) {
    return (
      <div className={cn("max-w-5xl mx-auto", className)}>
        <GenericDashboard genericData={metadata.genericData} />
      </div>
    );
  }
  
  return (
    <div className={cn("max-w-5xl mx-auto space-y-6", className)}>
      {/* Compact Header */}
      <CompactHeader 
        asset={metadata.asset} 
        liveData={metadata.liveData} 
        summary={metadata.summary}
      />
      
      {/* Key Signals Row */}
      <SignalsRow metadata={metadata} />
      
      {/* Two Column Layout: Chart + News */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chart - Takes 3 columns */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <StockChart 
              symbol={metadata.asset.symbol}
              type={metadata.asset.type === 'crypto' ? 'crypto' : 'stock'}
              height={300}
            />
          </div>
        </div>
        
        {/* News - Takes 2 columns */}
        <div className="lg:col-span-2">
          <NewsSection news={metadata.news} />
        </div>
      </div>
      
      {/* Analysis Summary */}
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <InsightsSection research={metadata.research} summary={metadata.summary} />
      </div>
      
      {/* Metrics */}
      <MetricsGrid fundamentals={metadata.fundamentals} technicals={metadata.technicals} />
      
      {/* Price Levels */}
      <LevelsSection technicals={metadata.technicals} />
    </div>
  );
});

export default FinanceSurface;
