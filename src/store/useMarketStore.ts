import { create } from 'zustand';
import { SimplifiedWebSocketService } from '@/services/SimplifiedWebSocketService';
import kalshiWs from '@/services/kalshiWs';
import { OrderBookAggregator } from '@/utils/orderBookAggregator';
import type { OrderBook } from '@/types/market';
import type { ConnectionStatus } from '@/constants';

type RawKalshiPayload = {
  type?: string;
  msg?: {
    yes_dollars_fp?: Array<[string | number, string | number]>;
    no_dollars_fp?: Array<[string | number, string | number]>;
    side?: 'yes' | 'no';
    price_dollars?: string | number;
    delta_fp?: string | number;
  };
  yes_dollars_fp?: Array<[string | number, string | number]>;
  no_dollars_fp?: Array<[string | number, string | number]>;
  yes?: Array<[string | number, string | number]>;
  no?: Array<[string | number, string | number]>;
  side?: 'yes' | 'no';
  price_dollars?: string | number;
  delta_fp?: string | number;
};

const aggregator = new OrderBookAggregator();
let wsService: SimplifiedWebSocketService | null = null;
let kalshiWsOff: (() => void) | null = null;

const initialOrderBook: OrderBook = {
  bids: [],
  asks: [],
  lastUpdate: new Date(),
  venueStatus: {
    polymarket: 'disconnected',
    kalshi: 'disconnected',
  },
};

const MAX_ORDERBOOK_LEVELS = 200;

const trimLevels = (levels: Array<{ price: number; size: number; venue: string }>, side: 'bids' | 'asks') => {
  const sorted = [...levels].sort((a, b) => (side === 'bids' ? b.price - a.price : a.price - b.price));
  return sorted.slice(0, MAX_ORDERBOOK_LEVELS);
};

const prunePriceMap = (bookSide: Map<number, number>, side: 'bids' | 'asks') => {
  if (bookSide.size <= MAX_ORDERBOOK_LEVELS) return;

  const sortedEntries = Array.from(bookSide.entries()).sort((a, b) =>
    side === 'bids' ? b[0] - a[0] : a[0] - b[0],
  );

  bookSide.clear();

  sortedEntries.slice(0, MAX_ORDERBOOK_LEVELS).forEach(([price, size]) => {
    if (size > 0) bookSide.set(price, size);
  });
};

const sanitizeLevels = (levels: Array<{ price: number; size: number; venue: string }>) =>
  levels
    .map((lvl) => ({
      price: Number(lvl.price),
      size: Number(lvl.size),
      venue: lvl.venue as 'polymarket' | 'kalshi' | 'combined',
    }))
    .filter((lvl) => Number.isFinite(lvl.price) && Number.isFinite(lvl.size) && lvl.price > 0 && lvl.size > 0);
export interface MarketStore {
  orderBook: OrderBook;
  polymarketOrderBook: OrderBook;
  kalshiOrderBook: OrderBook;
  connectionStatus: { polymarket: ConnectionStatus; kalshi: ConnectionStatus };
  lastVenueUpdate: { polymarket: Date | null; kalshi: Date | null };
  isLoading: boolean;
  error: string | null;
  setConnectionStatus: (
    venue: 'polymarket' | 'kalshi',
    status: ConnectionStatus,
  ) => void;
  updateOrderBook: (venue: 'polymarket' | 'kalshi', book: OrderBook) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => void;
  cleanup: () => void;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  orderBook: initialOrderBook,
  polymarketOrderBook: initialOrderBook,
  kalshiOrderBook: initialOrderBook,
  connectionStatus: { polymarket: 'disconnected', kalshi: 'disconnected' },
  lastVenueUpdate: { polymarket: null, kalshi: null },
  isLoading: true,
  error: null,

  setConnectionStatus: (venue, status) =>
    set((state: MarketStore) => ({
      connectionStatus: { ...state.connectionStatus, [venue]: status },
    })),

  updateOrderBook: (venue, book) => {
    const timestamp = new Date();

    const prunedBook: OrderBook = {
      ...book,
      bids: trimLevels(book.bids, 'bids'),
      asks: trimLevels(book.asks, 'asks'),
    };

    // No-op for stagnant empty updates to avoid unnecessary render churn on long-running sessions.
    // Preserve explicit resets where multi-venue data disappears.
    const existingVenueBook =
      venue === 'polymarket' ? get().polymarketOrderBook : get().kalshiOrderBook;

    if (
      prunedBook.bids.length === 0 &&
      prunedBook.asks.length === 0 &&
      existingVenueBook.bids.length === 0 &&
      existingVenueBook.asks.length === 0
    ) {
      return;
    }

    aggregator.updateOrderBook(venue, prunedBook);
    const combined = aggregator.getCombinedOrderBook();

    const nextState: Partial<MarketStore> = {
      orderBook: combined,
      lastVenueUpdate: {
        ...get().lastVenueUpdate,
        [venue]: timestamp,
      },
    };

    if (venue === 'polymarket') {
      nextState.polymarketOrderBook = prunedBook;
    }

    if (venue === 'kalshi') {
      nextState.kalshiOrderBook = prunedBook;
    }

    set(nextState as MarketStore);
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  initialize: () => {
    const store = get();

    // Reset existing connections to avoid leaks on repeated initialize calls
    if (wsService || kalshiWsOff) {
      store.cleanup();
    }

    store.setLoading(true);
    store.setConnectionStatus('polymarket', 'connecting');
    store.setConnectionStatus('kalshi', 'connecting');

    const kalshiOrderBookState = {
      yes: new Map<number, number>(),
      no: new Map<number, number>(),
    };

    wsService = new SimplifiedWebSocketService({
      url: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
      venue: 'polymarket',
      assetIds: [
        '3039641309958397001906153616677074061284510636204155275446291716739429262374',
        '27828976648682466778776999076215423777766972981338264154049603024771135223200',
      ],
      onMessage: (data) => {
        if (data && typeof data === 'object') {
          const book: OrderBook = {
            bids: Array.isArray(data.bids)
              ? sanitizeLevels(
                  data.bids.map((b: { price: number | string; size: number | string }) => ({
                    price: Number(b.price),
                    size: Number(b.size),
                    venue: 'polymarket',
                  })),
                )
              : [],
            asks: Array.isArray(data.asks)
              ? sanitizeLevels(
                  data.asks.map((a: { price: number | string; size: number | string }) => ({
                    price: Number(a.price),
                    size: Number(a.size),
                    venue: 'polymarket',
                  })),
                )
              : [],
            lastUpdate: new Date(),
            venueStatus: {
              polymarket: 'connected',
              kalshi: get().connectionStatus.kalshi,
            },
          };

          get().updateOrderBook('polymarket', book);
        }
      },
      onConnect: () => {
        get().setConnectionStatus('polymarket', 'connected');
      },
      onDisconnect: () => {
        get().setConnectionStatus('polymarket', 'disconnected');
      },
      onError: (error) => {
        get().setConnectionStatus('polymarket', 'error');
        get().setError(error);
      },
    });

    wsService.connect();

    const handleKalshiMessage = (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const payload = data as RawKalshiPayload;

      const type = String(payload.type ?? '').toLowerCase();
      const msg = payload.msg;

      const yesSnapshot = msg?.yes_dollars_fp ?? payload.yes_dollars_fp ?? payload.yes ?? [];
      const noSnapshot = msg?.no_dollars_fp ?? payload.no_dollars_fp ?? payload.no ?? [];

      const snapshotPairs = (items: Array<unknown>) =>
        items
          .filter((entry) => Array.isArray(entry) && (entry as unknown[]).length >= 2)
          .map((entry) => (entry as unknown[]) as [unknown, unknown]);

      const hasSnapshotData = snapshotPairs(yesSnapshot).length > 0 || snapshotPairs(noSnapshot).length > 0;

      if (type === 'orderbook_snapshot' || (type === 'orderbook_delta' && hasSnapshotData)) {
        kalshiOrderBookState.yes.clear();
        kalshiOrderBookState.no.clear();

        snapshotPairs(yesSnapshot).forEach(([p, s]) => {
          const price = Number(p);
          const size = Number(s);
          if (Number.isFinite(price) && price > 0 && Number.isFinite(size) && size > 0) {
            kalshiOrderBookState.yes.set(price, size);
          }
        });

        snapshotPairs(noSnapshot).forEach(([p, s]) => {
          const price = Number(p);
          const size = Number(s);
          if (Number.isFinite(price) && price > 0 && Number.isFinite(size) && size > 0) {
            kalshiOrderBookState.no.set(price, size);
          }
        });

        prunePriceMap(kalshiOrderBookState.yes, 'bids');
        prunePriceMap(kalshiOrderBookState.no, 'asks');
      }

      if (type === 'orderbook_delta') {
        const deltaSide = String(msg?.side ?? payload.side ?? '').toLowerCase();
        const deltaPrice = Number(msg?.price_dollars ?? payload.price_dollars ?? NaN);
        const deltaSize = Number(msg?.delta_fp ?? payload.delta_fp ?? NaN);

        if ((deltaSide === 'yes' || deltaSide === 'no') && Number.isFinite(deltaPrice) && deltaPrice > 0 && Number.isFinite(deltaSize) && deltaSize !== 0) {
          const bookSide = deltaSide === 'yes' ? kalshiOrderBookState.yes : kalshiOrderBookState.no;
          const current = bookSide.get(deltaPrice) || 0;
          const next = current + deltaSize;

          if (next <= 0) {
            bookSide.delete(deltaPrice);
          } else {
            bookSide.set(deltaPrice, next);
          }

          prunePriceMap(kalshiOrderBookState.yes, 'bids');
          prunePriceMap(kalshiOrderBookState.no, 'asks');
        }
      }

      // 🔄 CONVERT → YOUR OrderBook FORMAT
      const bids = sanitizeLevels(
        Array.from(kalshiOrderBookState.yes.entries()).map(([price, size]) => ({
          price,
          size,
          venue: 'kalshi' as const,
        })),
      ).sort((a, b) => b.price - a.price);

      const asks = sanitizeLevels(
        Array.from(kalshiOrderBookState.no.entries()).map(([price, size]) => ({
          price,
          size,
          venue: 'kalshi' as const,
        })),
      ).sort((a, b) => a.price - b.price);

      const kalshiBook: OrderBook = {
        bids,
        asks,
        lastUpdate: new Date(),
        venueStatus: {
          polymarket: get().connectionStatus.polymarket,
          kalshi: 'connected',
        },
      };

      get().setConnectionStatus('kalshi', 'connected');
      get().updateOrderBook('kalshi', kalshiBook);
    };

    kalshiWsOff = kalshiWs.onMessage(handleKalshiMessage);
    kalshiWs.connect();
    kalshiWs.subscribe(['KXPRESPERSON-28-JVAN']);

    store.setLoading(false);
  },

  cleanup: () => {
    if (wsService) {
      wsService.disconnect();
      wsService = null;
    }

    if (kalshiWsOff) {
      kalshiWsOff();
      kalshiWsOff = null;
    }

    kalshiWs.disconnect();

    aggregator.reset();

    set({
      orderBook: initialOrderBook,
      polymarketOrderBook: initialOrderBook,
      kalshiOrderBook: initialOrderBook,
      connectionStatus: { polymarket: 'disconnected', kalshi: 'disconnected' },
      lastVenueUpdate: { polymarket: null, kalshi: null },
      isLoading: false,
      error: null,
    });
  },
}));
