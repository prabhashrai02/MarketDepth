import React from 'react';
import { useMarketStore } from '@/store/useMarketStore';
import type { MarketStore } from '@/store/useMarketStore';
import type { ConnectionStatus } from '@/constants';
import { calculateMarketMetrics, formatPrice, formatTime } from '@/utils/formatters';
import { OrderBookSide } from './OrderBookSide';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

interface OrderBookDisplayProps {
  maxLevels?: number;
  className?: string;
  showMidpoint?: boolean;
}

const renderStatusHeader = (polymarketStatus: ConnectionStatus, kalshiStatus: ConnectionStatus) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Order Book</h2>
      <p className="text-xs text-gray-500">Live aggregated bids & asks</p>
    </div>
    <ConnectionStatusBanner polymarketStatus={polymarketStatus} kalshiStatus={kalshiStatus} />
  </div>
);

const renderMarketSummary = (bestBid: number, bestAsk: number, spread: number, midpoint: number) => {
  const spreadPercentage = midpoint > 0 ? (spread / midpoint) * 100 : 0;

  return (
    <div className="mb-4 space-y-3">
      <div className="bg-gradient-to-r from-green-50 to-red-50 rounded-lg p-4 border border-gray-200">
        <div className="text-center mb-2">
          <h3 className="text-lg font-bold text-gray-900">Market Spread</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Best Bid</div>
            <div className="font-mono text-xl font-bold text-green-600">{formatPrice(bestBid)}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">${spread.toFixed(3)}</div>
            <div className="text-sm text-gray-600">{spreadPercentage.toFixed(2)}%</div>
            <div className="text-xs text-gray-500 mt-1">Spread</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Best Ask</div>
            <div className="font-mono text-xl font-bold text-red-600">{formatPrice(bestAsk)}</div>
          </div>
        </div>
        <div className="text-center mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">Midpoint</div>
          <div className="font-mono text-lg font-semibold text-gray-700">{formatPrice(midpoint)}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="text-gray-600">Bid</div>
          <div className="font-mono font-semibold text-green-600">{formatPrice(bestBid)}</div>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="text-gray-600">Ask</div>
          <div className="font-mono font-semibold text-red-600">{formatPrice(bestAsk)}</div>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="text-gray-600">Spread</div>
          <div className="font-mono font-semibold text-gray-700">${spread.toFixed(3)}</div>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="text-gray-600">Mid</div>
          <div className="font-mono font-semibold text-gray-700">{formatPrice(midpoint)}</div>
        </div>
      </div>
    </div>
  );
};

const renderVenueComparison = (
  polymarket: { bestBid: number; bestAsk: number },
  kalshi: { bestBid: number; bestAsk: number },
  combined: { bestBid: number; bestAsk: number }
) => (
  <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
    {[{ name: 'Combined', data: combined }, { name: 'Polymarket', data: polymarket }, { name: 'Kalshi', data: kalshi }].map((entry) => (
      <div key={entry.name} className="rounded-md border border-gray-200 p-2 bg-gray-50">
        <div className="text-xs text-gray-500 font-medium">{entry.name}</div>
        <div className="text-sm text-gray-700">
          Bid {formatPrice(entry.data.bestBid)} / Ask {formatPrice(entry.data.bestAsk)}
        </div>
      </div>
    ))}
  </div>
);

const renderFooter = (lastUpdate: Date, midpoint: number, showMidpoint = true) => (
  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
    <span>Last updated: {formatTime(lastUpdate)}</span>
    {showMidpoint && <span className="font-mono">Midpoint: {formatPrice(midpoint)}</span>}
  </div>
);

export const OrderBookDisplay: React.FC<OrderBookDisplayProps> = ({
  maxLevels = 10,
  className = '',
  showMidpoint = true,
}) => {
  const orderBook = useMarketStore((state: MarketStore) => state.orderBook);
  const polymarketBook = useMarketStore((state: MarketStore) => state.polymarketOrderBook);
  const kalshiBook = useMarketStore((state: MarketStore) => state.kalshiOrderBook);
  const connectionStatus = useMarketStore((state: MarketStore) => state.connectionStatus);
  const { bestBid, bestAsk, spread, midpoint } = calculateMarketMetrics(orderBook.bids, orderBook.asks);

  const polymarketMetrics = calculateMarketMetrics(polymarketBook.bids, polymarketBook.asks);
  const kalshiMetrics = calculateMarketMetrics(kalshiBook.bids, kalshiBook.asks);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 hover-lift transition-all ${className}`}>
      {renderStatusHeader(connectionStatus.polymarket, connectionStatus.kalshi)}
      {renderMarketSummary(bestBid, bestAsk, spread, midpoint)}
      {renderVenueComparison(polymarketMetrics, kalshiMetrics, { bestBid, bestAsk })}
      <div className="grid grid-cols-2 gap-4">
        <OrderBookSide levels={orderBook.bids} type="bid" maxLevels={maxLevels} title="Bids" />
        <OrderBookSide levels={orderBook.asks} type="ask" maxLevels={maxLevels} title="Asks" />
      </div>
      {renderFooter(orderBook.lastUpdate, midpoint, showMidpoint)}
    </div>
  );
};