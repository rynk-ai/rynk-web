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
  PiTrendUp,
  PiTrendDown,
  PiMinus,
  PiChartBar,
  PiPulse,
  PiWarning,
  PiNewspaper,
  PiArrowSquareOut,
  PiInfo,
  PiLightning,
  PiArrowUpRight,
  PiArrowDownRight,
  PiCircleFill,
  PiTarget,
  PiShield,
} from "react-icons/pi";
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
    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8 bg-card border border-border/40 rounded-2xl p-6 shadow-sm">
      {/* Left: Price info */}
      <div className="flex-1">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">{asset.name}</h1>
          <span className="text-sm font-medium px-2 py-0.5 rounded-md bg-muted border border-border/50 text-muted-foreground font-mono">
            {asset.symbol}
          </span>
          {asset.type !== 'stock' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide border border-primary/20">
              {asset.type}
            </span>
          )}
        </div>
        
        {asset.sector && (
          <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wide flex items-center gap-1.5">
            {asset.sector} <span className="text-border">•</span> {asset.industry}
          </p>
        )}
        
        <div className="flex items-baseline gap-4">
          <span className="text-4xl font-bold tracking-tight text-foreground font-display">
            ${liveData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={cn(
            "flex items-center gap-1 text-lg font-bold p-1 rounded-lg",
            isPositive ? "text-green-600 dark:text-green-500 bg-green-500/10" : "text-red-600 dark:text-red-500 bg-red-500/10"
          )}>
            {isPositive ? <PiArrowUpRight className="h-5 w-5" /> : <PiArrowDownRight className="h-5 w-5" />}
            <span>{isPositive ? '+' : ''}{liveData.change24h.toFixed(2)}</span>
            <span className="text-sm font-medium opacity-90">({isPositive ? '+' : ''}{liveData.changePercent24h.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
      
      {/* Right: Key stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-4 lg:gap-x-10 p-4 bg-muted/20 rounded-xl border border-border/30">
        <StatItem label="Market Cap" value={formatNumber(liveData.marketCap)} />
        <StatItem label="Volume" value={formatNumber(liveData.volume)} />
        <StatItem label="Day High" value={`$${liveData.high24h.toFixed(2)}`} valueClass="text-green-600 dark:text-green-500" />
        <StatItem label="Day Low" value={`$${liveData.low24h.toFixed(2)}`} valueClass="text-red-600 dark:text-red-500" />
      </div>
    </div>
  );
}

function StatItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="text-left">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-70">{label}</div>
      <div className={cn("text-sm font-bold font-mono", valueClass)}>{value}</div>
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
      icon: metadata.summary.sentiment === 'bullish' ? PiTrendUp : 
            metadata.summary.sentiment === 'bearish' ? PiTrendDown : PiMinus,
    },
    {
      label: 'Valuation',
      value: metadata.fundamentals.verdict.replace('-', ' '),
      color: metadata.fundamentals.verdict === 'undervalued' ? 'green' : 
             metadata.fundamentals.verdict === 'overvalued' ? 'red' : 'gray',
      icon: PiChartBar,
    },
    {
      label: 'Trend',
      value: metadata.technicals.trend.replace('-', ' '),
      color: metadata.technicals.trend.includes('uptrend') ? 'green' : 
             metadata.technicals.trend.includes('downtrend') ? 'red' : 'gray',
      icon: PiPulse,
    },
    {
      label: 'Phase',
      value: metadata.cycles.phase,
      color: metadata.cycles.phase === 'markup' ? 'green' : 
             metadata.cycles.phase === 'decline' ? 'red' : 
             metadata.cycles.phase === 'distribution' ? 'amber' : 'blue',
      icon: PiTarget,
    },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {signals.map((signal, idx) => {
        const Icon = signal.icon;
        const colorClasses = {
          green: 'bg-green-500/5 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/10',
          red: 'bg-red-500/5 text-red-700 dark:text-red-400 border-red-500/20 hover:bg-red-500/10',
          amber: 'bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10',
          blue: 'bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10',
          gray: 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/60',
        };
        
        return (
          <div 
            key={idx} 
            className={cn(
              "flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors",
              colorClasses[signal.color as keyof typeof colorClasses]
            )}
          >
            <div className={cn(
              "p-2 rounded-lg bg-background/50 backdrop-blur-sm shadow-sm",
              signal.color === 'green' ? "text-green-600" :
              signal.color === 'red' ? "text-red-600" :
              signal.color === 'amber' ? "text-amber-600" :
              signal.color === 'blue' ? "text-blue-600" : "text-muted-foreground"
            )}>
              <Icon className="h-5 w-5 flex-shrink-0" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{signal.label}</div>
              <div className="font-bold capitalize text-sm">{signal.value}</div>
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
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 font-display">
        <PiNewspaper className="h-5 w-5 text-primary" />
        Latest News
      </h2>
      <div className="grid gap-3 flex-1">
        {news.headlines.slice(0, 4).map((headline, idx) => (
          <a 
            key={idx}
            href={headline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-4 bg-card border border-border/50 rounded-xl hover:bg-muted/30 hover:border-primary/30 transition-all group hover:shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {headline.title}
              </h3>
              <div className="flex items-center gap-2 mt-2.5 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                <span className="text-foreground/80">{headline.source}</span>
                <PiCircleFill className="h-1 w-1 fill-current opacity-30" />
                <span>{new Date(headline.date).toLocaleDateString()}</span>
              </div>
            </div>
            <PiArrowSquareOut className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
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
    <div className="space-y-5">
      <h2 className="text-lg font-bold font-display">Analysis Summary</h2>
      
      {/* Headline */}
      <p className="text-base font-medium leading-relaxed bg-muted/10 p-4 rounded-xl border border-border/30">{summary.headline}</p>
      
      {/* Bull/Bear Points in 2 columns */}
      {(research.thesis.bull.length > 0 || research.thesis.bear.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {research.thesis.bull.length > 0 && (
            <div className="space-y-3 p-4 bg-green-500/5 rounded-xl border border-green-500/10">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <PiTrendUp className="h-5 w-5" />
                <span className="font-bold text-sm uppercase tracking-wide">Bull Case</span>
              </div>
              <ul className="space-y-2">
                {research.thesis.bull.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-sm text-foreground/80 flex gap-2.5 items-start leading-snug">
                    <span className="text-green-500 mt-1 text-[10px]">●</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {research.thesis.bear.length > 0 && (
            <div className="space-y-3 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <PiTrendDown className="h-5 w-5" />
                <span className="font-bold text-sm uppercase tracking-wide">Bear Case</span>
              </div>
              <ul className="space-y-2">
                {research.thesis.bear.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-sm text-foreground/80 flex gap-2.5 items-start leading-snug">
                    <span className="text-red-500 mt-1 text-[10px]">●</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Risks & Catalysts inline */}
      <div className="flex flex-wrap gap-2 pt-2">
        {research.risks.slice(0, 3).map((risk, idx) => (
          <span 
            key={`risk-${idx}`}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 border",
              risk.severity === 'high' ? "bg-red-500/10 text-red-600 border-red-500/20" :
              risk.severity === 'medium' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
              "bg-gray-500/10 text-gray-600 border-border/50"
            )}
          >
            <PiWarning className="h-3.5 w-3.5" /> {risk.risk}
          </span>
        ))}
        {research.catalysts.slice(0, 2).map((cat, idx) => (
          <span 
            key={`cat-${idx}`}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1.5"
          >
            <PiLightning className="h-3.5 w-3.5" /> {cat.event}
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
      <h2 className="text-lg font-bold mb-4 font-display">Key Metrics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allMetrics.slice(0, 10).map((metric, idx) => (
          <div key={idx} className="p-3.5 bg-card border border-border/50 rounded-xl hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-80">{metric.name}</span>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full ring-2 ring-background",
                metric.signal === 'positive' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' :
                metric.signal === 'negative' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-gray-400'
              )} />
            </div>
            <div className="font-bold text-sm font-mono tracking-tight">{metric.value}</div>
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
      <h2 className="text-lg font-bold mb-4 font-display">Price Levels</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 bg-green-500/5 p-4 rounded-xl border border-green-500/10">
          <div className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Support
          </div>
          {technicals.support.slice(0, 3).map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2.5 bg-background/60 rounded-lg shadow-sm">
              <span className="font-mono font-bold">${s.level.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">{s.strength}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
          <div className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> Resistance
          </div>
          {technicals.resistance.slice(0, 3).map((r, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2.5 bg-background/60 rounded-lg shadow-sm">
              <span className="font-mono font-bold">${r.level.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">{r.strength}</span>
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
    <div className="space-y-8">
      <div className="text-center py-12 bg-card border border-border/40 rounded-2xl">
        {hasFailed ? (
          <>
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-amber-500/10 mb-5 animate-pulse">
              <PiWarning className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3 font-display">Could Not Load Asset Data</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{genericData.failureReason}</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-5 shadow-sm">
              <PiChartBar className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 font-display">Financial Market Overview</h2>
            <p className="text-muted-foreground">Ask about a specific stock or cryptocurrency</p>
          </>
        )}
      </div>
      
      {hasPartialMatches && (
        <div className="bg-card border border-border/40 rounded-xl p-8 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-lg">
            <PiInfo className="h-5 w-5 text-blue-500" />
            Did you mean one of these?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {genericData.partialMatches!.map((match, idx) => (
              <div key={idx} className="p-4 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/40 transition-colors">
                <div className="font-bold text-primary mb-1">{match.symbol}</div>
                <div className="text-sm text-foreground/80">{match.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {genericData.topCryptos && genericData.topCryptos.length > 0 && !hasFailed && (
        <div className="bg-card border border-border/40 rounded-xl p-8 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-lg">
            <PiPulse className="h-5 w-5 text-green-500" />
            Top Cryptocurrencies
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {genericData.topCryptos.map((crypto, idx) => (
              <div key={idx} className="p-5 bg-card border border-border/40 rounded-xl shadow-sm hover:border-primary/20 transition-all">
                <div className="font-bold text-xs uppercase text-muted-foreground mb-2 tracking-wider">{crypto.symbol}</div>
                <div className="text-xl font-bold font-mono tracking-tight mb-1">${crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className={cn("text-xs font-bold", crypto.change >= 0 ? "text-green-600" : "text-red-600")}>
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
      <div className={cn("max-w-6xl mx-auto", className)}>
        <GenericDashboard genericData={metadata.genericData} />
      </div>
    );
  }
  
  return (
    <div className={cn("max-w-6xl mx-auto space-y-8 pb-10", className)}>
      {/* Compact Header */}
      <CompactHeader 
        asset={metadata.asset} 
        liveData={metadata.liveData} 
        summary={metadata.summary}
      />
      
      {/* Key Signals Row */}
      <SignalsRow metadata={metadata} />
      
      {/* Two Column Layout: Chart + News */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Chart - Takes 3 columns */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm h-full">
            <div className="p-4 border-b border-border/40 bg-muted/10">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <PiChartBar className="h-4 w-4" /> Price Performance
              </h3>
            </div>
            <StockChart 
              symbol={metadata.asset.symbol}
              type={metadata.asset.type === 'crypto' ? 'crypto' : 'stock'}
              height={400}
            />
          </div>
        </div>
        
        {/* News - Takes 2 columns */}
        <div className="lg:col-span-2">
          <NewsSection news={metadata.news} />
        </div>
      </div>
      
      {/* Analysis Summary */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
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
