import { useEffect, useMemo, useState } from 'react';
import kalshiWs from '@/services/kalshiWs';

type MarketInput = string | string[] | null | undefined;

type Status = 'idle' | 'connecting' | 'connected';

interface TickerState {
  market_ticker: string;
  best_bid: number | null;
  best_ask: number | null;
  last_price: number | null;
}

type TickerMap = Record<string, TickerState>;

interface KalshiIncomingMessage {
  market_ticker?: string;
  marketTicker?: string;
  market?: string;

  best_bid?: number;
  bid?: number;

  best_ask?: number;
  ask?: number;

  last_price?: number;
  price?: number;
}

const normalizeMarkets = (markets: MarketInput): string[] => {
  if (!markets) return [];

  const arr = Array.isArray(markets) ? markets : [markets];

  return arr
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    .map((m) => m.trim());
};

export default function useKalshiMarket(markets: MarketInput) {
  const requestedMarkets = useMemo(
    () => normalizeMarkets(markets),
    [markets]
  );

  const [tickerData, setTickerData] = useState<TickerMap>({});
  const [status, setStatus] = useState<Status>('idle');
  const wsError: string | null = null;

  useEffect(() => {
    if (requestedMarkets.length === 0) {
      return;
    }

    kalshiWs.connect();
    kalshiWs.subscribe(requestedMarkets);

    const unsubscribe = kalshiWs.onMessage((message) => {
      if (!message || typeof message !== 'object') return;

      const msg = message as KalshiIncomingMessage;

      const marketTicker =
        msg.market_ticker || msg.marketTicker || msg.market;

      if (!marketTicker || !requestedMarkets.includes(marketTicker)) {
        return;
      }

      setStatus('connected');

      const formatted: TickerState = {
        market_ticker: marketTicker,
        best_bid: msg.best_bid ?? msg.bid ?? null,
        best_ask: msg.best_ask ?? msg.ask ?? null,
        last_price: msg.last_price ?? msg.price ?? null,
      };

      setTickerData((prev) => ({
        ...prev,
        [marketTicker]: {
          ...prev[marketTicker],
          ...formatted,
        },
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [requestedMarkets]);

  if (requestedMarkets.length === 0) {
    return {
      data: {},
      status: 'idle',
      error: 'No market ticker provided',
      markets: [],
    };
  }

  return {
    data: tickerData,
    status,
    error: wsError,
    markets: requestedMarkets,
  };
}