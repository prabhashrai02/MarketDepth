import useKalshiMarket from '@/hooks/useKalshiMarket';

export function MarketTicker({ marketTickers }: { marketTickers: string[] }) {
  const { data, status, error, markets } = useKalshiMarket(marketTickers);

  return (
    <div className="p-4 rounded-lg border border-[#2a3b5e] bg-[#0c1730] shadow-sm">
      <h2 className="text-lg font-semibold mb-2 text-cyan-200">Kalshi Market Ticker</h2>

      {error ? (
        <div className="text-sm text-rose-300">{error}</div>
      ) : (
        <div className="text-sm text-cyan-200 mb-2">Status: {status}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {markets.length === 0 ? (
          <div className="text-sm text-slate-300">No markets provided</div>
        ) : (
          markets.map((ticker) => {
            const item = data[ticker] || {};
            return (
          <div className="p-2 border border-[#2f4064] rounded-md bg-[#0d1c3b] text-slate-200 w-full">
                <div className="font-medium text-cyan-200">{ticker}</div>
                <div>Best Bid: {item.best_bid ?? 'N/A'}</div>
                <div>Best Ask: {item.best_ask ?? 'N/A'}</div>
                <div>Last Price: {item.last_price ?? 'N/A'}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
