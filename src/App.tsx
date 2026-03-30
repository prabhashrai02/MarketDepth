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
  const connectionStatus = useMarketStore((state: MarketStore) => state.connectionStatus);
  const initialize = useMarketStore((state: MarketStore) => state.initialize);
  const cleanup = useMarketStore((state: MarketStore) => state.cleanup);

  useEffect(() => {
    initialize();
    return () => cleanup();
  }, [initialize, cleanup]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-7xl animate-fade-in">
        <header className="mb-6 sm:mb-8 animate-slide-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Prediction Market Aggregator
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Real-time order book aggregation from Polymarket and Kalshi
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <ConnectionStatusBanner polymarketStatus={connectionStatus.polymarket} kalshiStatus={connectionStatus.kalshi} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <OrderBookDisplay maxLevels={15} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <QuoteEngine />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <MarketTicker marketTickers={["KXPRESPERSON-28"]} />
            </div>
          </div>
        </div>

        <footer
          className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-gray-500 animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
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
