export interface SimplifiedWebSocketConfig {
  url: string;
  venue: 'polymarket' | 'kalshi';
  marketId?: string;
  assetIds?: string[];
  onMessage: (data: unknown) => void;
  onError: (error: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export class SimplifiedWebSocketService {
  private ws: WebSocket | null = null;
  private config: SimplifiedWebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingInterval: number | null = null;

  constructor(config: SimplifiedWebSocketConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      console.log(`Connecting to ${this.config.venue}...`);
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log(`Connected to ${this.config.venue}`);
        this.reconnectAttempts = 0;
        this.config.onConnect();

        this.subscribe();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        const raw = event.data;

        // ✅ HANDLE HEARTBEAT FIRST
        if (raw === 'PONG') {
          console.log('💓 PONG received');
          return;
        }

        let parsed;

        try {
          parsed = JSON.parse(raw);
        } catch {
          console.warn('⚠️ Skipping non-JSON message:', raw);
          return; // ✅ prevent crash
        }

        const messages = Array.isArray(parsed) ? parsed : [parsed];

        messages.forEach((msg) => {
          if (!msg || typeof msg !== 'object') return;

          // 🟢 SNAPSHOT
          if (msg.type === 'book') {
            const bids = (msg.bids || []).map(
              ([price, size]: [string, string]) => ({
                price: Number(price),
                size: Number(size),
                venue: 'polymarket',
              }),
            );

            const asks = (msg.asks || []).map(
              ([price, size]: [string, string]) => ({
                price: Number(price),
                size: Number(size),
                venue: 'polymarket',
              }),
            );

            this.config.onMessage?.({ bids, asks });
          }

          // 🟡 DELTA (optional later)
          if (msg.type === 'price_change') {
            // ignore for now
          }
        });
      };

      this.ws.onclose = (event) => {
        console.log(`${this.config.venue} closed:`, event.code, event.reason);

        this.stopHeartbeat(); // cleanup

        this.config.onDisconnect();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error(`${this.config.venue} error:`, error);
        this.config.onError('WebSocket connection error');
      };
    } catch (error) {
      console.error(`Connection failed:`, error);
      this.config.onError(`Connection failed: ${error}`);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ✅ HEARTBEAT (CRITICAL)
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
        console.log('PING sent');
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (this.config.venue === 'polymarket') {
      this.subscribePolymarket();
    } else if (this.config.venue === 'kalshi') {
      this.subscribeKalshi();
    }
  }

  private subscribePolymarket(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const assetIds = this.config.assetIds || [];
    if (assetIds.length === 0) {
      console.warn('Polymarket subscribe skipped: no assetIds provided');
      return;
    }

    const subscription = {
      type: 'market',
      assets_ids: assetIds,
      custom_feature_enabled: true,
    };

    console.log('SUBSCRIBING:', subscription);

    this.ws.send(JSON.stringify(subscription));
  }

  private subscribeKalshi(): void {
    console.log('Kalshi not implemented');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms`);
    setTimeout(() => this.connect(), delay);
  }

  send(message: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.warn('Could not send WS message', error);
      }
    }
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
  }
}
