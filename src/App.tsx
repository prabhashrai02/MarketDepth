import { useEffect } from 'react';
import { useMarketStore } from '@/store/useMarketStore';
import type { MarketStore } from '@/store/useMarketStore';
import { OrderBookDisplay } from '@/components/OrderBookDisplay';
import { ConnectionStatusBanner } from '@/components/ConnectionStatusBanner';
import { QuoteEngine } from '@/components/QuoteEngine';
import { MarketTicker } from '@/components/MarketTicker';
import './App.css';
import '@/styles/animations.css';

const AppContent = () => {
  const connectionStatus = useMarketStore(
    (state: MarketStore) => state.connectionStatus,
  );
  const lastVenueUpdate = useMarketStore(
    (state: MarketStore) => state.lastVenueUpdate,
  );
  const initialize = useMarketStore((state: MarketStore) => state.initialize);
  const cleanup = useMarketStore((state: MarketStore) => state.cleanup);

  useEffect(() => {
    initialize();
    return () => cleanup();
  }, [initialize, cleanup]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans">
      <div className="mx-auto px-3 py-5 sm:py-8 lg:py-10 w-full max-w-[98vw] sm:max-w-[92vw] lg:max-w-295">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2 text-slate-100">
            Prediction Market Aggregator
          </h1>
          <p className="text-sm sm:text-base text-cyan-200/80 max-w-3xl">
            Real-time order book aggregation from Polymarket and Kalshi with
            unified overlays, spread analytics, and smart routing insights.
          </p>
        </header>

        <div className="space-y-4 sm:space-y-6">
          <ConnectionStatusBanner
            polymarketStatus={connectionStatus.polymarket}
            kalshiStatus={connectionStatus.kalshi}
            polymarketLastUpdate={lastVenueUpdate.polymarket}
            kalshiLastUpdate={lastVenueUpdate.kalshi}
          />

          <div className="lg:grid lg:grid-cols-[2fr_1fr] gap-4">
            <div>
              <OrderBookDisplay maxLevels={15} />
            </div>

            <div className="space-y-4">
              <QuoteEngine />
              <MarketTicker marketTickers={['KXPRESPERSON-28']} />
            </div>
          </div>
        </div>

        <footer className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-slate-400">
          <p>Data aggregated from Polymarket and Kalshi in real-time</p>
        </footer>
      </div>
    </div>
  );
};

function App() {
  return <AppContent />;
}

export default App;
