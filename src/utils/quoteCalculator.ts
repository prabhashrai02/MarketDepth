import type { OrderBookLevel, QuoteResult, QuoteSide, VenueQuoteResult } from '@/types/market';

const sortLevels = (levels: OrderBookLevel[], side: QuoteSide): OrderBookLevel[] => {
  if (side === 'buy') {
    return [...levels].sort((a, b) => a.price - b.price);
  }
  return [...levels].sort((a, b) => b.price - a.price);
};

const executeAcrossLevels = (
  amountUsd: number,
  levels: OrderBookLevel[],
): {
  totalShares: number;
  totalCost: number;
  filledUsd: number;
  unfilledUsd: number;
  bestPrice: number;
  routing: Array<{ venue: 'polymarket' | 'kalshi'; price: number; size: number; cost: number }>;
} => {
  let remaining = amountUsd;
  let totalShares = 0;
  let totalCost = 0;
  let bestPrice = 0;
  const routing: Array<{ venue: 'polymarket' | 'kalshi'; price: number; size: number; cost: number }> = [];

  if (levels.length === 0) {
    return { totalShares, totalCost, filledUsd: 0, unfilledUsd: amountUsd, bestPrice: 0, routing };
  }

  bestPrice = levels[0].price;

  for (const level of levels) {
    if (remaining <= 0) break;

    const maxSharesByAmount = remaining / level.price;
    const fillSize = Math.min(level.size, maxSharesByAmount);
    if (fillSize <= 0) break;

    const cost = fillSize * level.price;

    routing.push({
      venue: level.venue as 'polymarket' | 'kalshi',
      price: level.price,
      size: fillSize,
      cost,
    });

    totalShares += fillSize;
    totalCost += cost;
    remaining -= cost;
  }

  return {
    totalShares,
    totalCost,
    filledUsd: amountUsd - Math.max(0, remaining),
    unfilledUsd: Math.max(0, remaining),
    bestPrice,
    routing,
  };
};

const normalizeVenueQuote = (
  raw: ReturnType<typeof executeAcrossLevels>
): VenueQuoteResult => {
  const avgPrice = raw.totalShares > 0 ? raw.totalCost / raw.totalShares : 0;
  return {
    available: raw.totalShares > 0,
    shares: raw.totalShares,
    cost: raw.totalCost,
    avgPrice,
    unfilledAmount: raw.unfilledUsd,
  };
};

export const calculateQuote = (
  amountUsd: number,
  side: QuoteSide,
  polymarketLevels: OrderBookLevel[],
  kalshiLevels: OrderBookLevel[],
  combinedLevels: OrderBookLevel[],
): QuoteResult => {
  const polymarketSorted = sortLevels(polymarketLevels, side);
  const kalshiSorted = sortLevels(kalshiLevels, side);
  const combinedSorted = sortLevels(combinedLevels, side);

  const polyResult = executeAcrossLevels(amountUsd, polymarketSorted);
  const kalResult = executeAcrossLevels(amountUsd, kalshiSorted);
  const combinedResult = executeAcrossLevels(amountUsd, combinedSorted);

  const avgPrice = combinedResult.totalShares > 0 ? combinedResult.totalCost / combinedResult.totalShares : 0;

  const bestPrice = combinedResult.bestPrice;
  const slippage = bestPrice > 0 ? ((avgPrice - bestPrice) / bestPrice) * 100 : 0;

  return {
    totalShares: combinedResult.totalShares,
    totalCost: combinedResult.totalCost,
    averagePrice: avgPrice,
    slippage,
    unfilledAmount: combinedResult.unfilledUsd,
    bestPrice,
    venueBreakdown: {
      polymarket: normalizeVenueQuote(polyResult),
      kalshi: normalizeVenueQuote(kalResult),
    },
    routing: combinedResult.routing,
  };
};


