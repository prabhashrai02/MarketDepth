import { useEffect } from 'react';
import { useMarketStore } from '@/store/useMarketStore';
import type { MarketStore } from '@/store/useMarketStore';
import { OrderBookDisplay } from '@/components/OrderBookDisplay';
import { ConnectionStatusBanner } from '@/components/ConnectionStatusBanner';
import { QuoteEngine } from '@/components/QuoteEngine';
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
          <p className="text-xs uppercase tracking-widest text-cyan-300/80 mb-1">
            Technology · AI & Policy
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 text-slate-100">
            Will JD Vance win the 2028 US Presidential Election?
          </h1>
          <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-slate-300 mb-3">
            <span className="text-cyan-300">Yes</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-300">No</span>
          </div>
          <p className="text-sm sm:text-base text-cyan-200/80 max-w-3xl">
            Single binary prediction market on whether JD Vance will win the
            2028 US Presidential Election. Simulated execution pricing via
            aggregated order books from Polymarkarket and Kalshi.
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
