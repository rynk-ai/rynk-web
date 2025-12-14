import { NextRequest, NextResponse } from 'next/server'
import { financialOrchestrator } from '@/lib/services/agentic/financial-orchestrator'

/**
 * Financial Data API
 * 
 * Uses Yahoo Finance for stocks (free, no API key) and CoinGecko for crypto.
 * 
 * GET /api/finance?type=stock&symbol=AAPL
 * GET /api/finance?type=crypto&symbol=bitcoin
 * GET /api/finance?type=stock&symbol=AAPL&history=1mo
 * GET /api/finance?type=search&q=apple
 * GET /api/finance?type=top-crypto&limit=10
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const symbol = searchParams.get('symbol')
  const query = searchParams.get('q')
  const history = searchParams.get('history')
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    // Stock quote
    if (type === 'stock' && symbol && !history) {
      const data = await financialOrchestrator.getStockQuote(symbol)
      if (!data) {
        return NextResponse.json(
          { error: `No data found for symbol: ${symbol}` },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data })
    }

    // Stock history
    if (type === 'stock' && symbol && history) {
      // Map user-friendly ranges to Yahoo Finance ranges
      const rangeMap: Record<string, '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'> = {
        '1d': '1d',
        '5d': '5d',
        '1w': '5d',
        '1mo': '1mo',
        '1m': '1mo',
        '3mo': '3mo',
        '3m': '3mo',
        '6mo': '6mo',
        '1y': '1y',
        '5y': '5y'
      }
      const range = rangeMap[history] || '1mo'
      
      const data = await financialOrchestrator.getStockHistory(symbol, range)
      return NextResponse.json({ 
        success: true, 
        data: { symbol, range, data } 
      })
    }

    // Crypto price
    if (type === 'crypto' && symbol && !history) {
      const data = await financialOrchestrator.getCryptoPrice(symbol.toLowerCase())
      if (!data) {
        return NextResponse.json(
          { error: `No data found for coin: ${symbol}` },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data })
    }

    // Crypto history
    if (type === 'crypto' && symbol && history) {
      const days = parseInt(history) || 30
      const data = await financialOrchestrator.getCryptoHistory(symbol.toLowerCase(), days)
      return NextResponse.json({ 
        success: true, 
        data: { symbol, days, data } 
      })
    }

    // Search symbols
    if (type === 'search' && query) {
      const data = await financialOrchestrator.search(query)
      return NextResponse.json({ 
        success: true, 
        data
      })
    }

    // Top cryptocurrencies
    if (type === 'top-crypto') {
      const data = await financialOrchestrator.getTopCryptos(Math.min(limit, 50))
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json(
      { 
        error: 'Invalid request. Required params: type=(stock|crypto|search|top-crypto)',
        examples: [
          '/api/finance?type=stock&symbol=AAPL',
          '/api/finance?type=stock&symbol=AAPL&history=1mo',
          '/api/finance?type=crypto&symbol=bitcoin',
          '/api/finance?type=crypto&symbol=bitcoin&history=30',
          '/api/finance?type=search&q=apple',
          '/api/finance?type=top-crypto&limit=10'
        ]
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('[/api/finance] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
