/**
 * Venue configuration and styling constants
 */

export const VENUE_CONFIG = {
  polymarket: {
    name: 'Polymarket',
    shortName: 'PM',
    color: 'bg-purple-100 text-purple-700',
    indicatorColor: 'text-purple-600',
  },
  kalshi: {
    name: 'Kalshi',
    shortName: 'KL',
    color: 'bg-blue-100 text-blue-700',
    indicatorColor: 'text-blue-600',
  },
  combined: {
    name: 'Both Venues',
    shortName: 'BOTH',
    color: 'bg-gray-100 text-gray-700',
    indicatorColor: 'text-gray-600',
  },
} as const;

export const ORDER_BOOK_STYLES = {
  bid: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    bgOpacityClass: 'bg-green-500 opacity-10',
  },
  ask: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    bgOpacityClass: 'bg-red-500 opacity-10',
  },
} as const;

export const CONNECTION_STATUS_STYLES = {
  connected: {
    color: 'text-green-600',
    symbol: '●',
  },
  disconnected: {
    color: 'text-red-600',
    symbol: '○',
  },
  error: {
    color: 'text-orange-600',
    symbol: '⚠',
  },
  default: {
    color: 'text-gray-600',
    symbol: '?',
  },
} as const;