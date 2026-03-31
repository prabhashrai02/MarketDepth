export interface OrderBookLevel {
  price: number;
  size: number;
  venue: 'polymarket' | 'kalshi' | 'combined';
}

export type QuoteSide = 'buy' | 'sell';

export interface VenueQuoteResult {
  available: boolean;
  shares: number;
  cost: number;
  avgPrice: number;
  unfilledAmount: number;
}

export interface QuoteResult {
  totalShares: number;
  totalCost: number;
  averagePrice: number;
  slippage: number;
  unfilledAmount: number;
  bestPrice: number;
  venueBreakdown: {
    polymarket: VenueQuoteResult;
    kalshi: VenueQuoteResult;
  };
  routing: Array<{ venue: 'polymarket' | 'kalshi'; price: number; size: number; cost: number }>;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdate: Date;
  crossed?: boolean;
  venueStatus: {
    polymarket: 'connected' | 'disconnected' | 'error' | 'connecting';
    kalshi: 'connected' | 'disconnected' | 'error' | 'connecting';
  };
}

export type VenueUpdate = {
  timestamp: Date;
  status: 'connected' | 'disconnecting' | 'disconnected' | 'error' | 'connecting';
};