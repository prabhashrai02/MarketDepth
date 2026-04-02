import {
  POLYMARKET,
  KALSHI,
  BIDS,
  ASKS,
  CONNECTED,
  DISCONNECTED,
  type OrderBookSide,
  COMBINED,
  type ConnectionStatus,
} from '@/constants';
import type { OrderBook, OrderBookLevel } from '@/types/market';

export class OrderBookAggregator {
  private polymarketBook: OrderBook | null = null;
  private kalshiBook: OrderBook | null = null;
  private static readonly MAX_LEVELS = 200;

  // Normalize price to avoid float precision issues
  private normalizePrice(price: number): number {
    return Number(price.toFixed(6)); // adjust precision if needed
  }

  reset(): void {
    this.polymarketBook = null;
    this.kalshiBook = null;
  }

  private normalizeBook(book?: OrderBook | null): OrderBook {
    if (!book) {
      return {
        bids: [],
        asks: [],
        lastUpdate: new Date(0),
        venueStatus: {
          polymarket: DISCONNECTED,
          kalshi: DISCONNECTED,
        },
      };
    }

    return {
      bids: this.combineAndSortLevels(book.bids, BIDS),
      asks: this.combineAndSortLevels(book.asks, ASKS),
      lastUpdate: book.lastUpdate || new Date(0),
      venueStatus: book.venueStatus,
    };
  }

  updateOrderBook(
    venue: typeof POLYMARKET | typeof KALSHI,
    orderBook: OrderBook,
  ): void {
    // Store reference safely (no mutation happens later)
    if (venue === POLYMARKET) {
      this.polymarketBook = orderBook;
    } else {
      this.kalshiBook = orderBook;
    }
  }

  getCombinedOrderBook(): OrderBook {
    const polymarketBook = this.normalizeBook(this.polymarketBook);
    const kalshiBook = this.normalizeBook(this.kalshiBook);

    const isPolyConnected =
      polymarketBook.venueStatus.polymarket === CONNECTED;
    const isKalshiConnected =
      kalshiBook.venueStatus.kalshi === CONNECTED;

    const polymarketBids = isPolyConnected ? polymarketBook.bids : [];
    const polymarketAsks = isPolyConnected ? polymarketBook.asks : [];
    const kalshiBids = isKalshiConnected ? kalshiBook.bids : [];
    const kalshiAsks = isKalshiConnected ? kalshiBook.asks : [];

    const combinedBids = this.combineAndSortLevels(
      [...polymarketBids, ...kalshiBids],
      BIDS,
    );

    const combinedAsks = this.combineAndSortLevels(
      [...polymarketAsks, ...kalshiAsks],
      ASKS,
    );

    const bestBid = combinedBids[0]?.price;
    const bestAsk = combinedAsks[0]?.price;

    const crossed =
      bestBid !== undefined &&
      bestAsk !== undefined &&
      bestBid > bestAsk;

    // ✅ Correct lastUpdate (take latest from sources)
    const lastUpdate = new Date(
      Math.max(
        polymarketBook.lastUpdate.getTime(),
        kalshiBook.lastUpdate.getTime(),
      ),
    );

    return {
      bids: combinedBids,
      asks: combinedAsks,
      lastUpdate,
      crossed,
      venueStatus: {
        polymarket:
          this.polymarketBook?.venueStatus.polymarket || DISCONNECTED,
        kalshi:
          this.kalshiBook?.venueStatus.kalshi || DISCONNECTED,
      },
    };
  }

  private combineAndSortLevels(
    levels: OrderBookLevel[],
    side: OrderBookSide,
  ): OrderBookLevel[] {
    const grouped = new Map<number, number>(); // price -> size

    for (const level of levels) {
      const rawPrice = Number(level.price);
      const size = Number(level.size);

      if (
        !Number.isFinite(rawPrice) ||
        !Number.isFinite(size) ||
        rawPrice <= 0 ||
        size <= 0
      ) {
        continue;
      }

      const price = this.normalizePrice(rawPrice);

      const prevSize = grouped.get(price) || 0;
      const newSize = prevSize + size;

      grouped.set(price, newSize);
    }

    const sorted: OrderBookLevel[] = Array.from(grouped.entries())
      .map(([price, size]) => ({
        price,
        size,
        venue: COMBINED,
      }))
      .sort((a, b) =>
        side === BIDS ? b.price - a.price : a.price - b.price,
      );

    return sorted.slice(0, OrderBookAggregator.MAX_LEVELS);
  }

  getVenueStatus(): {
    polymarket: ConnectionStatus;
    kalshi: ConnectionStatus;
  } {
    return {
      polymarket:
        this.polymarketBook?.venueStatus.polymarket || DISCONNECTED,
      kalshi:
        this.kalshiBook?.venueStatus.kalshi || DISCONNECTED,
    };
  }
}