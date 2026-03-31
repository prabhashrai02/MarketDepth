import React from 'react';
import { useMarketStore } from '@/store/useMarketStore';
import type { MarketStore } from '@/store/useMarketStore';
import type { ConnectionStatus } from '@/constants';
import {
  calculateMarketMetrics,
  formatPrice,
  formatTime,
} from '@/utils/formatters';
import { OrderBookSide } from './OrderBookSide';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

interface OrderBookDisplayProps {
  maxLevels?: number;
  className?: string;
  showMidpoint?: boolean;
}

const renderStatusHeader = (
  polymarketStatus: ConnectionStatus,
  kalshiStatus: ConnectionStatus,
  polymarketLastUpdate?: Date | null,
  kalshiLastUpdate?: Date | null,
) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-cyan-100">
        Order Book Overview
      </h2>
      <p className="text-sm text-cyan-300/90">
        Live aggregated bids & asks from both venues
      </p>
    </div>
    <ConnectionStatusBanner
      polymarketStatus={polymarketStatus}
      kalshiStatus={kalshiStatus}
      polymarketLastUpdate={polymarketLastUpdate}
      kalshiLastUpdate={kalshiLastUpdate}
    />
  </div>
);

const renderMarketSummary = (
  bestBid: number,
  bestAsk: number,
  spread: number,
  midpoint: number,
) => {
  const spreadPercentage = midpoint > 0 ? (spread / midpoint) * 100 : 0;

  return (
    <div className="mb-4 space-y-3">
      <div className="bg-[#101d35] border border-[#2a3b5d] rounded-lg p-4">
        <div className="text-center mb-2">
          <h3 className="text-lg font-bold text-cyan-200">Market Spread</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-sm text-slate-300/80 mb-1">Best Bid</div>
            <div className="font-mono text-xl font-bold text-cyan-300">
              {formatPrice(bestBid)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">
              ${spread.toFixed(3)}
            </div>
            <div className="text-sm text-cyan-200">
              {spreadPercentage.toFixed(2)}%
            </div>
            <div className="text-sm text-slate-300/80 mt-1">Spread</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-300/80 mb-1">Best Ask</div>
            <div className="font-mono text-xl font-bold text-rose-300">
              {formatPrice(bestAsk)}
            </div>
          </div>
        </div>
        <div className="text-center mt-3 pt-3 border-t border-slate-700">
          <div className="text-sm text-slate-300/80">Midpoint</div>
          <div className="font-mono text-lg font-semibold text-slate-100">
            {formatPrice(midpoint)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-800/80 border border-cyan-400/30 rounded p-2 text-center">
          <div className="text-cyan-200">Bid</div>
          <div className="font-mono font-bold text-cyan-300">
            {formatPrice(bestBid)}
          </div>
        </div>
        <div className="bg-slate-800/80 border border-fuchsia-400/30 rounded p-2 text-center">
          <div className="text-fuchsia-200">Ask</div>
          <div className="font-mono font-bold text-fuchsia-300">
            {formatPrice(bestAsk)}
          </div>
        </div>
        <div className="bg-slate-800/80 border border-emerald-400/30 rounded p-2 text-center">
          <div className="text-emerald-200">Spread</div>
          <div className="font-mono font-bold text-emerald-300">
            ${spread.toFixed(3)}
          </div>
        </div>
        <div className="bg-slate-800/80 border border-blue-400/30 rounded p-2 text-center">
          <div className="text-blue-200">Mid</div>
          <div className="font-mono font-bold text-blue-300">
            {formatPrice(midpoint)}
          </div>
        </div>
      </div>
    </div>
  );
};

const renderVenueComparison = (
  polymarket: { bestBid: number; bestAsk: number },
  kalshi: { bestBid: number; bestAsk: number },
  combined: { bestBid: number; bestAsk: number },
) => (
  <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
    {[
      { name: 'Combined', data: combined },
      { name: 'Polymarket', data: polymarket },
      { name: 'Kalshi', data: kalshi },
    ].map((entry) => (
      <div
        key={entry.name}
        className="rounded-lg border border-slate-700 p-3 bg-slate-900/70"
      >
        <div className="text-xs text-cyan-200 font-semibold">{entry.name}</div>
        <div className="text-sm text-slate-100 mt-1">
          Bid {formatPrice(entry.data.bestBid)} / Ask{' '}
          {formatPrice(entry.data.bestAsk)}
        </div>
      </div>
    ))}
  </div>
);

const renderFooter = (
  lastUpdate: Date,
  midpoint: number,
  showMidpoint = true,
) => (
  <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
    <span>Last updated: {formatTime(lastUpdate)}</span>
    {showMidpoint && (
      <span className="font-mono">Midpoint: {formatPrice(midpoint)}</span>
    )}
  </div>
);

export const OrderBookDisplay: React.FC<OrderBookDisplayProps> = ({
  maxLevels = 10,
  className = '',
  showMidpoint = true,
}) => {
  const orderBook = useMarketStore((state: MarketStore) => state.orderBook);
  const polymarketBook = useMarketStore(
    (state: MarketStore) => state.polymarketOrderBook,
  );
  const kalshiBook = useMarketStore(
    (state: MarketStore) => state.kalshiOrderBook,
  );
  const connectionStatus = useMarketStore(
    (state: MarketStore) => state.connectionStatus,
  );
  const lastVenueUpdate = useMarketStore(
    (state: MarketStore) => state.lastVenueUpdate,
  );
  const { bestBid, bestAsk, spread, midpoint } = calculateMarketMetrics(
    orderBook.bids,
    orderBook.asks,
  );

  const polymarketMetrics = calculateMarketMetrics(
    polymarketBook.bids,
    polymarketBook.asks,
  );
  const kalshiMetrics = calculateMarketMetrics(
    kalshiBook.bids,
    kalshiBook.asks,
  );

  return (
    <div
      className={`bg-[#0e162a] border border-[#1f2a45] rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.35)] p-4 ${className}`}
    >
      {renderStatusHeader(
        connectionStatus.polymarket,
        connectionStatus.kalshi,
        lastVenueUpdate.polymarket,
        lastVenueUpdate.kalshi,
      )}
      {renderMarketSummary(bestBid, bestAsk, spread, midpoint)}
      {orderBook.crossed && (
        <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-300">
          ⚠️ Crossed market detected: best bid is above best ask. The order book
          levels are inconsistent across venues and may include out-of-sync
          snapshots.
        </div>
      )}
      {renderVenueComparison(polymarketMetrics, kalshiMetrics, {
        bestBid,
        bestAsk,
      })}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        <OrderBookSide
          levels={orderBook.bids}
          type="bid"
          maxLevels={maxLevels}
          title="Bids"
          className="bg-slate-900/80 border border-slate-700"
        />
        <OrderBookSide
          levels={orderBook.asks}
          type="ask"
          maxLevels={maxLevels}
          title="Asks"
          className="bg-slate-900/80 border border-slate-700"
        />
      </div>
      {renderFooter(orderBook.lastUpdate, midpoint, showMidpoint)}
    </div>
  );
};
