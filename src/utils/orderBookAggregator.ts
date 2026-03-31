import { POLYMARKET, KALSHI, BIDS, ASKS, DISCONNECTED, type OrderBookSide, COMBINED, type ConnectionStatus } from "@/constants";
import type { OrderBook, OrderBookLevel } from "@/types/market";


export class OrderBookAggregator {
  private polymarketBook: OrderBook | null = null;
  private kalshiBook: OrderBook | null = null;
  private static readonly MAX_LEVELS = 200;

  reset(): void {
    this.polymarketBook = null;
    this.kalshiBook = null;
  }

  private normalizeBook(book?: OrderBook | null): OrderBook {
    if (!book) {
      return { bids: [], asks: [], lastUpdate: new Date(0), venueStatus: { polymarket: DISCONNECTED, kalshi: DISCONNECTED }};
    }

    return {
      bids: this.combineAndSortLevels(book.bids, BIDS),
      asks: this.combineAndSortLevels(book.asks, ASKS),
      lastUpdate: book.lastUpdate || new Date(),
      venueStatus: book.venueStatus,
    };
  }

  updateOrderBook(venue: typeof POLYMARKET | typeof KALSHI, orderBook: OrderBook): void {
    if (venue === POLYMARKET) {
      this.polymarketBook = orderBook;
    } else {
      this.kalshiBook = orderBook;
    }
  }

  getCombinedOrderBook(): OrderBook {
    const polymarketBook = this.normalizeBook(this.polymarketBook);
    const kalshiBook = this.normalizeBook(this.kalshiBook);

    const isPolyConnected = polymarketBook.venueStatus.polymarket === 'connected';
    const isKalshiConnected = kalshiBook.venueStatus.kalshi === 'connected';

    const polymarketBids = isPolyConnected ? polymarketBook.bids : [];
    const polymarketAsks = isPolyConnected ? polymarketBook.asks : [];
    const kalshiBids = isKalshiConnected ? kalshiBook.bids : [];
    const kalshiAsks = isKalshiConnected ? kalshiBook.asks : [];
    const combinedBids = this.combineAndSortLevels([...polymarketBids, ...kalshiBids], BIDS);
    const combinedAsks = this.combineAndSortLevels([...polymarketAsks, ...kalshiAsks], ASKS);

    const bestBid = combinedBids[0]?.price ?? 0;
    const bestAsk = combinedAsks[0]?.price ?? 0;
    const crossed = bestBid > bestAsk;

    return {
      bids: combinedBids,
      asks: combinedAsks,
      lastUpdate: new Date(),
      crossed,
      venueStatus: {
        polymarket: this.polymarketBook?.venueStatus.polymarket || DISCONNECTED,
        kalshi: this.kalshiBook?.venueStatus.kalshi || DISCONNECTED,
      },
    };
  }

  private combineAndSortLevels(levels: OrderBookLevel[], side: OrderBookSide): OrderBookLevel[] {
    const grouped = new Map<number, OrderBookLevel>();

    levels.forEach((level) => {
      const price = Number(level.price);
      const size = Number(level.size);

      // Skip invalid or non-positive values; aggregation should never produce negatives.
      if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) {
        return;
      }

      const existing = grouped.get(price);

      if (existing) {
        existing.size += size;

        if (existing.size <= 0) {
          grouped.delete(price);
        }
      } else {
        grouped.set(price, {
          price,
          size,
          venue: COMBINED,
        });
      }
    });

    const sorted = Array.from(grouped.values()).sort((a, b) =>
      side === BIDS ? b.price - a.price : a.price - b.price
    );

    // Keep the book bounded for long-running sessions and to avoid memory blow-up
    return sorted.slice(0, OrderBookAggregator.MAX_LEVELS);
  }

  getVenueStatus(): { polymarket: ConnectionStatus; kalshi: ConnectionStatus } {
    return {
      polymarket: this.polymarketBook?.venueStatus.polymarket || DISCONNECTED,
      kalshi: this.kalshiBook?.venueStatus.kalshi || DISCONNECTED
    };
  }
}