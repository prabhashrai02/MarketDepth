import useKalshiMarket from '@/hooks/useKalshiMarket';

export function MarketTicker({ marketTickers }: { marketTickers: string[] }) {
  const { data, status, error, markets } = useKalshiMarket(marketTickers);

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Kalshi Market Ticker</h2>

      {error ? (
        <div className="text-sm text-red-700">{error}</div>
      ) : (
        <div className="text-sm text-gray-600 mb-2">Status: {status}</div>
      )}

      <div className="grid gap-3">
        {markets.length === 0 ? (
          <div className="text-sm">No markets provided</div>
        ) : (
          markets.map((ticker) => {
            const item = data[ticker] || {};
            return (
              <div key={ticker} className="p-2 border rounded-md bg-gray-50">
                <div className="font-medium">{ticker}</div>
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
