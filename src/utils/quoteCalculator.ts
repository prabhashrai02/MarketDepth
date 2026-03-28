import type { OrderBook, QuoteRequest, QuoteResult, VenueFill } from '../types/market';

export class QuoteCalculator {
  static calculateQuote(orderBook: OrderBook, request: QuoteRequest): QuoteResult {
    const { amount, side } = request;
    const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
    
    let remainingAmount = amount;
    let totalShares = 0;
    let totalCost = 0;
    const venueBreakdown = {
      polymarket: { shares: 0, price: 0, cost: 0, available: false },
      kalshi: { shares: 0, price: 0, cost: 0, available: false }
    };

    const venueLevels = {
      polymarket: levels.filter(level => level.venue === 'polymarket' || level.venue === 'combined'),
      kalshi: levels.filter(level => level.venue === 'kalshi' || level.venue === 'combined')
    };

    for (const level of levels) {
      if (remainingAmount <= 0) break;

      const maxCost = Math.min(remainingAmount, level.size * level.price);
      const shares = maxCost / level.price;
      
      totalShares += shares;
      totalCost += maxCost;
      remainingAmount -= maxCost;

      if (level.venue === 'polymarket' || level.venue === 'combined') {
        venueBreakdown.polymarket.shares += shares;
        venueBreakdown.polymarket.cost += maxCost;
        venueBreakdown.polymarket.available = true;
      }
      
      if (level.venue === 'kalshi' || level.venue === 'combined') {
        venueBreakdown.kalshi.shares += shares;
        venueBreakdown.kalshi.cost += maxCost;
        venueBreakdown.kalshi.available = true;
      }
    }

    const averagePrice = totalShares > 0 ? totalCost / totalShares : 0;
    const slippage = this.calculateSlippage(levels, averagePrice);

    venueBreakdown.polymarket.price = venueBreakdown.polymarket.shares > 0 ? 
      venueBreakdown.polymarket.cost / venueBreakdown.polymarket.shares : 0;
    
    venueBreakdown.kalshi.price = venueBreakdown.kalshi.shares > 0 ? 
      venueBreakdown.kalshi.cost / venueBreakdown.kalshi.shares : 0;

    return {
      totalShares: Math.round(totalShares * 100) / 100,
      averagePrice: Math.round(averagePrice * 10000) / 10000,
      totalCost: Math.round(totalCost * 100) / 100,
      venueBreakdown,
      slippage: Math.round(slippage * 10000) / 10000
    };
  }

  private static calculateSlippage(levels: OrderBookLevel[], averagePrice: number): number {
    if (levels.length === 0) return 0;
    
    const bestPrice = levels[0].price;
    return Math.abs((averagePrice - bestPrice) / bestPrice);
  }
}