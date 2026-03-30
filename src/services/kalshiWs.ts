type KalshiCommand = 'subscribe';

type KalshiChannel = 'orderbook_delta' | 'ticker';

interface SubscribeMessage {
  id: number;
  cmd: KalshiCommand;
  params: {
    channels: KalshiChannel[];
    market_tickers: string[];
    send_initial_snapshot: boolean;
  };
}

/** Incoming messages (minimal but useful structure) */
interface BaseMessage {
  type: string;
  market_ticker?: string;
}

interface OrderbookDeltaMessage extends BaseMessage {
  type: 'orderbook_delta';
  yes?: Array<[number, number]>; // [price, size]
  no?: Array<[number, number]>;
}

interface TickerMessage extends BaseMessage {
  type: 'ticker';
  last_price?: number;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
}

type KalshiMessage = OrderbookDeltaMessage | TickerMessage | BaseMessage;

class KalshiWebSocketService {
  private url = 'ws://localhost:3001';
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private reconnectTimer: number | null = null;

  private subscribedMarkets: Set<string> = new Set();
  private messageCallbacks: Set<(data: KalshiMessage) => void> = new Set();
  private requestId = 1;

  private isExplicitClose = false;

  connect(): void {
    if (
      this.ws &&
      [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)
    ) {
      return;
    }

    this.isExplicitClose = false;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('✅ WS connected');
      this.reconnectAttempts = 0;
      this.flushSubscriptions();
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as KalshiMessage;

        console.log('📡 FROM KALSHI:', payload);

        this.messageCallbacks.forEach((cb) => cb(payload));
      } catch (e) {
        console.warn('Invalid WS message', e);
      }
    };

    this.ws.onclose = () => {
      console.log('❌ WS closed');

      this.ws = null;

      if (this.isExplicitClose) return;

      this.scheduleReconnect();
    };

    this.ws.onerror = (err: Event) => {
      console.error('WS error', err);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(
      this.baseReconnectDelay * 2 ** this.reconnectAttempts,
      20000,
    );

    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  disconnect(): void {
    this.isExplicitClose = true;
    this.ws?.close();
    this.ws = null;
  }

  subscribe(markets: string[] = []): void {
    const valid = markets
      .filter((m) => typeof m === 'string' && m.trim())
      .map((m) => m.trim().toUpperCase());

    if (!valid.length) return;

    const newMarkets = valid.filter((m) => !this.subscribedMarkets.has(m));

    if (!newMarkets.length) return;

    newMarkets.forEach((m) => this.subscribedMarkets.add(m));

    this.sendSubscribe(newMarkets);
  }

  private sendSubscribe(markets: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: SubscribeMessage = {
      id: this.requestId++,
      cmd: 'subscribe',
      params: {
        channels: ['orderbook_delta', 'ticker'],
        market_tickers: markets,
        send_initial_snapshot: true,
      },
    };

    console.log('📤 SUBSCRIBE:', message);

    this.ws.send(JSON.stringify(message));
  }

  private flushSubscriptions(): void {
    if (!this.subscribedMarkets.size) return;

    this.sendSubscribe(Array.from(this.subscribedMarkets));
  }

  onMessage(cb: (data: KalshiMessage) => void): () => void {
    this.messageCallbacks.add(cb);

    return () => this.messageCallbacks.delete(cb);
  }
}

const kalshiWs = new KalshiWebSocketService();
export default kalshiWs;