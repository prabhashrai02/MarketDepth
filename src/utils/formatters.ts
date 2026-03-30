/**
 * Formatting utilities for market data display
 */

export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') {
    return '—';
  }

  const num = Number(price);

  if (Number.isNaN(num)) return '—';

  return num.toFixed(3);
}

export const formatSize = (size: number | undefined | null): string => {
  if (size === undefined || size === null || isNaN(size)) {
    return '—';
  }
  return size.toFixed(0);
};

export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '—%';
  }
  return `${value.toFixed(1)}%`;
};

export const formatTime = (date: Date): string => date.toLocaleTimeString();

/**
 * Calculate spread and midpoint from best bid and ask
 */
export const calculateMarketMetrics = (bids: Array<{ price: number }>, asks: Array<{ price: number }>) => {
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const midpoint = (bestAsk + bestBid) / 2;
  
  return {
    bestBid,
    bestAsk,
    spread,
    midpoint,
  };
};

/**
 * Calculate percentage of a level's size relative to total
 */
export const calculateLevelPercentage = (levelSize: number, totalSize: number): number => {
  if (totalSize === 0) return 0;
  return (levelSize / totalSize) * 100;
};