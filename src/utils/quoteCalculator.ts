import { KALSHI, POLYMARKET } from '@/constants';
import type {
  OrderBookLevel,
  QuoteResult,
  QuoteSide,
  VenueQuoteResult,
} from '@/types/market';

const sortLevels = (
  levels: OrderBookLevel[],
  side: QuoteSide,
): OrderBookLevel[] => {
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
  routing: Array<{
    venue: 'polymarket' | 'kalshi';
    price: number;
    size: number;
    cost: number;
  }>;
} => {
  let remaining = amountUsd;
  let totalShares = 0;
  let totalCost = 0;
  let bestPrice = 0;

  const routing: Array<{
    venue: 'polymarket' | 'kalshi';
    price: number;
    size: number;
    cost: number;
  }> = [];

  if (levels.length === 0) {
    return {
      totalShares,
      totalCost,
      filledUsd: 0,
      unfilledUsd: amountUsd,
      bestPrice: 0,
      routing,
    };
  }

  const firstPrice = Number(levels[0]?.price);
  bestPrice = Number.isFinite(firstPrice) && firstPrice > 0 ? firstPrice : 0;

  for (const level of levels) {
    if (remaining <= 0) break;

    const price = Number(level.price);
    const size = Number(level.size);

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(size) ||
      size <= 0
    ) {
      continue;
    }

    if (level.venue !== POLYMARKET && level.venue !== KALSHI) {
      continue;
    }

    const maxSharesByAmount = remaining / price;
    const fillSize = Math.min(size, maxSharesByAmount);

    if (fillSize <= 0) continue;

    const cost = fillSize * price;

    routing.push({
      venue: level.venue,
      price,
      size: fillSize,
      cost,
    });

    totalShares += fillSize;
    totalCost += cost;

    remaining = Math.max(0, remaining - cost);
  }

  return {
    totalShares,
    totalCost,
    filledUsd: amountUsd - remaining,
    unfilledUsd: remaining,
    bestPrice,
    routing,
  };
};

const normalizeVenueQuote = (
  raw: ReturnType<typeof executeAcrossLevels>,
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
  const normalizedAmount = Number(amountUsd);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    const safeAmount = normalizedAmount > 0 ? normalizedAmount : 0;

    return {
      totalShares: 0,
      totalCost: 0,
      averagePrice: 0,
      slippage: 0,
      unfilledAmount: safeAmount,
      bestPrice: 0,
      venueBreakdown: {
        polymarket: {
          available: false,
          shares: 0,
          cost: 0,
          avgPrice: 0,
          unfilledAmount: safeAmount,
        },
        kalshi: {
          available: false,
          shares: 0,
          cost: 0,
          avgPrice: 0,
          unfilledAmount: safeAmount,
        },
      },
      routing: [],
    };
  }

  const polymarketSorted = sortLevels(polymarketLevels, side);
  const kalshiSorted = sortLevels(kalshiLevels, side);
  const combinedSorted = sortLevels(combinedLevels, side);

  const polyResult = executeAcrossLevels(normalizedAmount, polymarketSorted);
  const kalResult = executeAcrossLevels(normalizedAmount, kalshiSorted);
  const combinedResult = executeAcrossLevels(normalizedAmount, combinedSorted);

  const avgPrice =
    combinedResult.totalShares > 0
      ? combinedResult.totalCost / combinedResult.totalShares
      : 0;

  const bestPrice = combinedResult.bestPrice;

  const slippage =
    bestPrice > 0
      ? side === 'buy'
        ? ((avgPrice - bestPrice) / bestPrice) * 100
        : ((bestPrice - avgPrice) / bestPrice) * 100
      : 0;

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
