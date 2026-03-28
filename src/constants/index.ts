// Venue constants
export const POLYMARKET = 'polymarket' as const;
export const KALSHI = 'kalshi' as const;
export const COMBINED = 'combined' as const;

// Connection status constants
export const CONNECTED = 'connected' as const;
export const DISCONNECTED = 'disconnected' as const;
export const ERROR = 'error' as const;
export const CONNECTING = 'connecting' as const;

// Side constants
export const BUY = 'buy' as const;
export const SELL = 'sell' as const;

// Message type constants
export const ORDERBOOK_UPDATE = 'orderbook_update' as const;
export const CONNECTION_STATUS = 'connection_status' as const;

// Venue arrays
export const VENUES = [POLYMARKET, KALSHI] as const;

// Export types for constants
export type Venue = typeof POLYMARKET | typeof KALSHI;
export type ConnectionStatus = typeof CONNECTED | typeof DISCONNECTED | typeof ERROR | typeof CONNECTING;
export type Side = typeof BUY | typeof SELL;
export type MessageType = typeof ORDERBOOK_UPDATE | typeof CONNECTION_STATUS | typeof ERROR;