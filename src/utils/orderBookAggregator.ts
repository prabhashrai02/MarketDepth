import { POLYMARKET, KALSHI, BIDS, ASKS, DISCONNECTED, type OrderBookSide, COMBINED, type ConnectionStatus } from "@/constants";
import type { OrderBook, OrderBookLevel } from "@/types/market";


export class OrderBookAggregator {
  private polymarketBook: OrderBook | null = null;
  private kalshiBook: OrderBook | null = null;

  updateOrderBook(venue: typeof POLYMARKET | typeof KALSHI, orderBook: OrderBook): void {
    if (venue === POLYMARKET) {
      this.polymarketBook = orderBook;
    } else {
      this.kalshiBook = orderBook;
    }
  }

  getCombinedOrderBook(): OrderBook {
    const polymarketBids = this.polymarketBook?.bids || [];
    const polymarketAsks = this.polymarketBook?.asks || [];
    const kalshiBids = this.kalshiBook?.bids || [];
    const kalshiAsks = this.kalshiBook?.asks || [];

    const combinedBids = this.combineAndSortLevels([...polymarketBids, ...kalshiBids], BIDS);
    const combinedAsks = this.combineAndSortLevels([...polymarketAsks, ...kalshiAsks], ASKS);

    return {
      bids: combinedBids,
      asks: combinedAsks,
      lastUpdate: new Date(),
      venueStatus: {
        polymarket: this.polymarketBook?.venueStatus.polymarket || DISCONNECTED,
        kalshi: this.kalshiBook?.venueStatus.kalshi || DISCONNECTED
      }
    };
  }

  private combineAndSortLevels(levels: OrderBookLevel[], side: OrderBookSide): OrderBookLevel[] {
    const grouped = new Map<number, OrderBookLevel>();

    levels.forEach(level => {
      const existing = grouped.get(level.price);
      if (existing) {
        existing.size += level.size;
      } else {
        grouped.set(level.price, {
          price: level.price,
          size: level.size,
          venue: COMBINED
        });
      }
    });

    const sorted = Array.from(grouped.values());
    return sorted.sort((a, b) =>
      side === BIDS ? b.price - a.price : a.price - b.price
    );
  }

  getVenueStatus(): { polymarket: ConnectionStatus; kalshi: ConnectionStatus } {
    return {
      polymarket: this.polymarketBook?.venueStatus.polymarket || DISCONNECTED,
      kalshi: this.kalshiBook?.venueStatus.kalshi || DISCONNECTED
    };
  }
}