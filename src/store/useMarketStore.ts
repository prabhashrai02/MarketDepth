import { create } from 'zustand';
import { SimplifiedWebSocketService } from '@/services/SimplifiedWebSocketService';
import kalshiWs from '@/services/kalshiWs';
import { OrderBookAggregator } from '@/utils/orderBookAggregator';
import type { OrderBook } from '@/types/market';
import type { ConnectionStatus } from '@/constants';

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

export interface MarketStore {
  orderBook: OrderBook;
  polymarketOrderBook: OrderBook;
  kalshiOrderBook: OrderBook;
  connectionStatus: { polymarket: ConnectionStatus; kalshi: ConnectionStatus };
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
  isLoading: true,
  error: null,

  setConnectionStatus: (venue, status) =>
    set((state: MarketStore) => ({
      connectionStatus: { ...state.connectionStatus, [venue]: status },
    })),

  updateOrderBook: (venue, book) => {
    aggregator.updateOrderBook(venue, book);
    const combined = aggregator.getCombinedOrderBook();

    const nextState: Partial<MarketStore> = {
      orderBook: combined,
    };

    if (venue === 'polymarket') {
      nextState.polymarketOrderBook = book;
    }

    if (venue === 'kalshi') {
      nextState.kalshiOrderBook = book;
    }

    set(nextState as MarketStore);
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  initialize: () => {
    const store = get();
    store.setLoading(true);

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
              ? data.bids.map((b: { price: number | string; size: number | string }) => ({
                  price: Number(b.price),
                  size: Number(b.size),
                  venue: 'polymarket',
                }))
              : [],
            asks: Array.isArray(data.asks)
              ? data.asks.map((a: { price: number | string; size: number | string }) => ({
                  price: Number(a.price),
                  size: Number(a.size),
                  venue: 'polymarket',
                }))
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
      const payload = data as {
        type?: string;
        msg?: {
          yes_dollars_fp?: Array<[string, string]>;
          no_dollars_fp?: Array<[string, string]>;
          side?: 'yes' | 'no';
          price_dollars?: string | number;
          delta_fp?: string | number;
        };
        yes_dollars_fp?: Array<[string, string]>;
        no_dollars_fp?: Array<[string, string]>;
      };

      // 🟢 SNAPSHOT
      if (payload.type === 'orderbook_snapshot') {
        kalshiOrderBookState.yes.clear();
        kalshiOrderBookState.no.clear();

        payload.msg?.yes_dollars_fp?.forEach(([p, s]) => {
          kalshiOrderBookState.yes.set(Number(p), Number(s));
        });

        payload.msg?.no_dollars_fp?.forEach(([p, s]) => {
          kalshiOrderBookState.no.set(Number(p), Number(s));
        });
      }

      // 🟡 DELTA
      if (payload.type === 'orderbook_delta') {
        const side = payload.msg?.side;
        const price = Number(payload.msg?.price_dollars ?? 0);
        const delta = Number(payload.msg?.delta_fp ?? 0);

        const bookSide =
          side === 'yes' ? kalshiOrderBookState.yes : kalshiOrderBookState.no;

        const current = bookSide.get(price) || 0;
        const next = current + delta;

        if (next <= 0) {
          bookSide.delete(price);
        } else {
          bookSide.set(price, next);
        }
      }

      // 🔄 CONVERT → YOUR OrderBook FORMAT
      const bids = Array.from(kalshiOrderBookState.yes.entries())
        .map(([price, size]) => ({
          price,
          size,
          venue: 'kalshi' as const,
        }))
        .sort((a, b) => b.price - a.price);

      const asks = Array.from(kalshiOrderBookState.no.entries())
        .map(([price, size]) => ({
          price,
          size,
          venue: 'kalshi' as const,
        }))
        .sort((a, b) => a.price - b.price);

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
  },
}));
