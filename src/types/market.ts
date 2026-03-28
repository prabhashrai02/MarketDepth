import type { Venue, ConnectionStatus, Side, MessageType } from '../constants';

export interface OrderBookLevel {
  price: number;
  size: number;
  venue: Venue | 'combined';
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdate: Date;
  venueStatus: {
    polymarket: ConnectionStatus;
    kalshi: ConnectionStatus;
  };
}

export interface Market {
  id: string;
  title: string;
  description: string;
  outcomes: Outcome[];
  expirationDate: Date;
}

export interface Outcome {
  id: string;
  title: string;
  currentPrice: number;
  orderBook: OrderBook;
}

export interface QuoteRequest {
  amount: number;
  outcomeId: string;
  side: Side;
}

export interface QuoteResult {
  totalShares: number;
  averagePrice: number;
  totalCost: number;
  venueBreakdown: {
    polymarket: VenueFill;
    kalshi: VenueFill;
  };
  slippage: number;
}

export interface VenueFill {
  shares: number;
  price: number;
  cost: number;
  available: boolean;
}

export interface WebSocketMessage {
  type: MessageType;
  venue: Venue;
  data?: any;
  timestamp: Date;
}

export interface MarketData {
  market: Market;
  selectedOutcome: Outcome;
  quoteRequest?: QuoteRequest;
  quoteResult?: QuoteResult;
}