-- Finance cache table for storing API responses with TTL
-- Used by financial-orchestrator for Yahoo Finance and CoinGecko data

CREATE TABLE IF NOT EXISTS finance_cache (
  id TEXT PRIMARY KEY,           -- Format: "source:symbol:dataType" e.g. "yahoo:AAPL:quote"
  source TEXT NOT NULL,          -- "yahoo" | "coingecko"
  symbol TEXT NOT NULL,          -- "AAPL", "bitcoin", etc.
  data_type TEXT NOT NULL,       -- "quote" | "history_1d" | "history_1mo" | "fundamentals"
  data TEXT NOT NULL,            -- JSON stringified response
  created_at INTEGER NOT NULL,   -- Unix timestamp
  expires_at INTEGER NOT NULL    -- Unix timestamp for cache invalidation
);

-- Index for efficient cache cleanup and lookup
CREATE INDEX IF NOT EXISTS idx_finance_cache_expires ON finance_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_finance_cache_source_symbol ON finance_cache(source, symbol);
