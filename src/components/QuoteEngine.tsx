import React, { useMemo, useState } from 'react';
import { useMarketStore } from '@/store/useMarketStore';
import { calculateQuote } from '@/utils/quoteCalculator';
import { formatPrice, formatSize, formatPercentage } from '@/utils/formatters';
import type { QuoteSide } from '@/types/market';

export const QuoteEngine: React.FC = () => {
  const [amount, setAmount] = useState<number>(100);
  const [side, setSide] = useState<QuoteSide>('buy');
  const [outcome, setOutcome] = useState<'Yes' | 'No'>('Yes');

  const orderBook = useMarketStore((state) => state.orderBook);
  const polymarketOrderBook = useMarketStore((state) => state.polymarketOrderBook);
  const kalshiOrderBook = useMarketStore((state) => state.kalshiOrderBook);

  const quote = useMemo(() => {
    if (!amount || amount <= 0) {
      return null;
    }

    const combinedLevels = side === 'buy' ? orderBook.asks : orderBook.bids;
    const polLevels = side === 'buy' ? polymarketOrderBook.asks : polymarketOrderBook.bids;
    const kalLevels = side === 'buy' ? kalshiOrderBook.asks : kalshiOrderBook.bids;

    return calculateQuote(amount, side, polLevels, kalLevels, combinedLevels);
  }, [amount, side, orderBook, polymarketOrderBook, kalshiOrderBook]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 hover-lift transition-all">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Quote Simulator</h2>
      <p className="text-sm text-gray-500 mb-4">
        Enter an amount and choose direction. Orders are routed across venues by best price.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Outcome</label>
          <select
            aria-label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as 'Yes' | 'No')}
            className="mt-1 w-full rounded border-gray-300 p-2"
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Side</label>
          <select
            aria-label="Side"
            value={side}
            onChange={(e) => setSide(e.target.value as QuoteSide)}
            className="mt-1 w-full rounded border-gray-300 p-2"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700">Amount (USD)</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded border-gray-300 p-2"
            placeholder="100"
          />
        </div>
      </div>

      {!quote ? (
        <p className="text-sm text-gray-500">Enter a valid amount to preview a quote.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs text-gray-500">Total shares (combined)</div>
              <div className="text-2xl font-semibold text-indigo-600">{formatSize(quote.totalShares)}</div>
            </div>
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs text-gray-500">Average price</div>
              <div className="text-2xl font-semibold text-indigo-600">{formatPrice(quote.averagePrice)}</div>
            </div>
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs text-gray-500">Total cost</div>
              <div className="text-2xl font-semibold text-indigo-600">{formatPrice(quote.totalCost)}</div>
            </div>
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs text-gray-500">Slippage vs best</div>
              <div className="text-2xl font-semibold text-indigo-600">{formatPercentage(quote.slippage)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['polymarket', 'kalshi'] as const).map((venue) => {
              const venueQuote = quote.venueBreakdown[venue];
              return (
                <div key={venue} className="rounded border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-700 capitalize">{venue}</h3>
                  <div className="mt-2 text-xs text-gray-500">Fillable shares (single venue)</div>
                  <div className="text-xl font-bold text-blue-600">{formatSize(venueQuote.shares)}</div>
                  <div className="text-xs text-gray-500">Cost: {formatPrice(venueQuote.cost)}</div>
                  <div className="text-xs text-gray-500">Avg: {formatPrice(venueQuote.avgPrice)}</div>
                  <div className="text-xs text-red-500">Unfilled USD: {formatPrice(venueQuote.unfilledAmount)}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded border border-gray-200 bg-white p-3">
            <div className="text-sm font-semibold text-gray-700">Routing summary</div>
            {quote.routing.length === 0 ? (
              <small className="text-gray-500">No available liquidity for this amount/side.</small>
            ) : (
              <table className="w-full text-xs mt-2 border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-1 text-left">Venue</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Size</th>
                    <th className="py-1 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.routing.map((row, index) => (
                    <tr key={`${row.venue}-${index}`} className="border-b border-gray-100">
                      <td className="py-1 text-left capitalize">{row.venue}</td>
                      <td className="py-1 text-right">{formatPrice(row.price)}</td>
                      <td className="py-1 text-right">{formatSize(row.size)}</td>
                      <td className="py-1 text-right">{formatPrice(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {quote.unfilledAmount > 0 && (
              <p className="mt-2 text-xs text-red-600">Unfilled amount: {formatPrice(quote.unfilledAmount)} (insufficient depth)</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
