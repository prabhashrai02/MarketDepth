import React, { useMemo, useState } from 'react';
import { useMarketStore } from '@/store/useMarketStore';
import { calculateQuote } from '@/utils/quoteCalculator';
import { formatPrice, formatSize, formatPercentage } from '@/utils/formatters';
import { BUY, SELL, VENUES } from '@/constants';
import type { QuoteSide } from '@/types/market';
import { SelectDropdown } from './SelectDropdown';

export const QuoteEngine: React.FC = () => {
  const [amount, setAmount] = useState<number>(100);
  const [side, setSide] = useState<QuoteSide>(BUY);
  const [outcome, setOutcome] = useState<'Yes' | 'No'>('Yes');

  const orderBook = useMarketStore((state) => state.orderBook);
  const polymarketOrderBook = useMarketStore(
    (state) => state.polymarketOrderBook,
  );
  const kalshiOrderBook = useMarketStore((state) => state.kalshiOrderBook);

  const quote = useMemo(() => {
    if (!amount || amount <= 0) {
      return null;
    }

    const combinedLevels = side === BUY ? orderBook.asks : orderBook.bids;
    const polLevels =
      side === BUY ? polymarketOrderBook.asks : polymarketOrderBook.bids;
    const kalLevels =
      side === BUY ? kalshiOrderBook.asks : kalshiOrderBook.bids;

    return calculateQuote(amount, side, polLevels, kalLevels, combinedLevels);
  }, [amount, side, orderBook, polymarketOrderBook, kalshiOrderBook]);

  return (
    <div className="bg-[#0d1b34] border border-[#2f4064] rounded-2xl p-5 shadow-inner">
      <h2 className="text-lg md:text-xl font-bold text-cyan-300 mb-2">
        Quote Simulator
      </h2>
      <p className="text-sm md:text-base text-slate-300/90 leading-relaxed mb-4">
        Enter trade amount and side; prices are simulated using aggregated
        liquidity from both venues.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SelectDropdown
          label="Outcome"
          value={outcome}
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          onChange={(nextValue) => setOutcome(nextValue as 'Yes' | 'No')}
        />

        <SelectDropdown
          label="Side"
          value={side}
          options={[
            { value: BUY, label: 'Buy' },
            { value: SELL, label: 'Sell' },
          ]}
          onChange={(nextValue) => setSide(nextValue as QuoteSide)}
        />

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300">
            Amount (USD)
          </label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[#2f4064] bg-[#12203f] text-cyan-100 p-2 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/30"
            placeholder="100"
          />
        </div>
      </div>

      {!quote ? (
        <p className="text-sm text-slate-300">
          Enter a valid amount to preview a quote.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl border border-[#2f4064] p-3 bg-[#12203f]">
              <div className="text-sm text-cyan-300">
                Total shares (combined)
              </div>
              <div className="text-2xl font-bold text-cyan-200">
                {formatSize(quote.totalShares)}
              </div>
            </div>
            <div className="rounded-xl border border-[#2f4064] p-3 bg-[#12203f]">
              <div className="text-sm text-slate-300">Average price</div>
              <div className="text-2xl font-bold text-cyan-200">
                {formatPrice(quote.averagePrice)}
              </div>
            </div>
            <div className="rounded-xl border border-[#2f4064] p-3 bg-[#12203f]">
              <div className="text-sm text-slate-300">Total cost</div>
              <div className="text-2xl font-bold text-cyan-200">
                {formatPrice(quote.totalCost)}
              </div>
            </div>
            <div className="rounded-xl border border-[#2f4064] p-3 bg-[#12203f]">
              <div className="text-sm text-slate-300">Slippage vs best</div>
              <div className="text-2xl font-bold text-cyan-200">
                {formatPercentage(quote.slippage)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VENUES.map((venue) => {
              const venueQuote = quote.venueBreakdown[venue];
              return (
                <div
                  key={venue}
                  className="rounded-lg border border-[#2f4064] p-3 bg-[#0d1c3b]"
                >
                  <h3 className="text-sm font-semibold text-cyan-200 capitalize">
                    {venue}
                  </h3>
                  <div className="mt-2 text-sm text-slate-300">
                    Fillable shares (single venue)
                  </div>
                  <div className="text-xl font-bold text-cyan-200">
                    {formatSize(venueQuote.shares)}
                  </div>
                  <div className="text-sm text-slate-300">
                    Cost: {formatPrice(venueQuote.cost)}
                  </div>
                  <div className="text-sm text-slate-300">
                    Avg: {formatPrice(venueQuote.avgPrice)}
                  </div>
                  <div className="text-sm text-rose-300 break-all">
                    Unfilled USD: {formatPrice(venueQuote.unfilledAmount)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-[#2f4064] bg-[#0d1c3b] p-3">
            <div className="text-sm font-semibold text-cyan-200">
              Routing summary
            </div>
            {quote.routing.length === 0 ? (
              <small className="text-slate-300">
                No available liquidity for this amount/side.
              </small>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2 border-collapse min-w-90">
                  <thead>
                    <tr className="border-b border-[#2a3b5e] text-slate-200">
                      <th className="py-2 text-left text-sm">Venue</th>
                      <th className="py-2 text-right text-sm">Price</th>
                      <th className="py-2 text-right text-sm">Size</th>
                      <th className="py-2 text-right text-sm">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.routing.map((row, index) => (
                      <tr
                        key={`${row.venue}-${index}`}
                        className="border-b border-slate-700 text-slate-200"
                      >
                        <td className="py-1 text-left capitalize">
                          {row.venue}
                        </td>
                        <td className="py-1 text-right">
                          {formatPrice(row.price)}
                        </td>
                        <td className="py-1 text-right">
                          {formatSize(row.size)}
                        </td>
                        <td className="py-1 text-right">
                          {formatPrice(row.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quote.unfilledAmount > 0 && (
              <p className="mt-2 text-xs text-red-600">
                Unfilled amount: {formatPrice(quote.unfilledAmount)}{' '}
                (insufficient depth)
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
