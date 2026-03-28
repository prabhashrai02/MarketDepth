import type { OrderBook, OrderBookLevel, ConnectionStatus } from '../types/market';

export class MockDataService {
  private polymarketInterval: ReturnType<typeof setInterval> | null = null;
  private kalshiInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: ((data: { venue: 'polymarket' | 'kalshi'; orderBook: OrderBook }) => void)[] = [];

  private generateMockOrderBook(venue: 'polymarket' | 'kalshi'): OrderBook {
    const basePrice = 0.65;
    const spread = venue === 'polymarket' ? 0.02 : 0.03;
    
    const generateLevels = (side: 'bids' | 'asks', count: number): OrderBookLevel[] => {
      const levels: OrderBookLevel[] = [];
      for (let i = 0; i < count; i++) {
        const priceOffset = side === 'bids' ? -i * 0.01 : i * 0.01;
        const price = basePrice + priceOffset + (side === 'asks' ? spread : 0);
        const size = Math.random() * 1000 + 100;
        
        levels.push({
          price: Math.max(0.01, Math.min(0.99, price)),
          size: Math.round(size * 100) / 100,
          venue
        });
      }
      return levels.sort((a, b) => side === 'bids' ? b.price - a.price : a.price - b.price);
    };

    return {
      bids: generateLevels('bids', 10),
      asks: generateLevels('asks', 10),
      lastUpdate: new Date(),
      venueStatus: {
        polymarket: 'connected',
        kalshi: 'connected'
      }
    };
  }

  private simulatePriceMovement(orderBook: OrderBook): OrderBook {
    const volatility = 0.001;
    
    const updateLevels = (levels: OrderBookLevel[]): OrderBookLevel[] => {
      return levels.map(level => ({
        ...level,
        price: Math.max(0.01, Math.min(0.99, level.price + (Math.random() - 0.5) * volatility)),
        size: Math.max(10, level.size + (Math.random() - 0.5) * 50)
      }));
    };

    return {
      ...orderBook,
      bids: updateLevels(orderBook.bids),
      asks: updateLevels(orderBook.asks),
      lastUpdate: new Date()
    };
  }

  start(): void {
    let polymarketBook = this.generateMockOrderBook('polymarket');
    let kalshiBook = this.generateMockOrderBook('kalshi');

    this.polymarketInterval = setInterval(() => {
      polymarketBook = this.simulatePriceMovement(polymarketBook);
      this.listeners.forEach(listener => listener({ venue: 'polymarket', orderBook: polymarketBook }));
    }, 1000 + Math.random() * 2000);

    this.kalshiInterval = setInterval(() => {
      kalshiBook = this.simulatePriceMovement(kalshiBook);
      this.listeners.forEach(listener => listener({ venue: 'kalshi', orderBook: kalshiBook }));
    }, 1500 + Math.random() * 2500);
  }

  stop(): void {
    if (this.polymarketInterval) {
      clearInterval(this.polymarketInterval);
      this.polymarketInterval = null;
    }
    if (this.kalshiInterval) {
      clearInterval(this.kalshiInterval);
      this.kalshiInterval = null;
    }
  }

  onOrderBookUpdate(callback: (data: { venue: 'polymarket' | 'kalshi'; orderBook: OrderBook }) => void): void {
    this.listeners.push(callback);
  }

  simulateConnectionIssue(venue: 'polymarket' | 'kalshi'): void {
    const errorBook: OrderBook = {
      bids: [],
      asks: [],
      lastUpdate: new Date(),
      venueStatus: {
        polymarket: venue === 'polymarket' ? 'error' : 'connected',
        kalshi: venue === 'kalshi' ? 'error' : 'connected'
      }
    };

    this.listeners.forEach(listener => listener({ venue, orderBook: errorBook }));
  }

  simulateReconnection(venue: 'polymarket' | 'kalshi'): void {
    const newBook = this.generateMockOrderBook(venue);
    this.listeners.forEach(listener => listener({ venue, orderBook: newBook }));
  }
}