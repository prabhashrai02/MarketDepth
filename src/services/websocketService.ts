import { CONNECTED, DISCONNECTED, ERROR, CONNECTING, POLYMARKET, KALSHI, type ConnectionStatus, BUY, SELL } from '../constants';
import type { OrderBook } from '../types/market';

export interface WebSocketConfig {
 url: string;
 venue: typeof POLYMARKET | typeof KALSHI;
 reconnectInterval?: number;
 maxReconnectAttempts?: number;
 maxReconnectDelay?: number;
 minReconnectDelay?: number;
 connectionTimeout?: number;
 heartbeatInterval?: number;
}

export class WebSocketService {
 private ws: WebSocket | null = null;
 private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
 private reconnectAttempts = 0;
 private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
 private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
 private lastMessageTime = 0;
 private readonly config: WebSocketConfig;
 private listeners: ((data: { venue: typeof POLYMARKET | typeof KALSHI; orderBook: OrderBook }) => void)[] = [];
 private errorListeners: ((error: { type: string; message: string }) => void)[] = [];
 private connectionStatus: ConnectionStatus = DISCONNECTED;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      maxReconnectDelay: 60000,
      minReconnectDelay: 1000,
      connectionTimeout: 10000,
      heartbeatInterval: 30000,
      ...config
    };
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.updateConnectionStatus(CONNECTING);
      this.ws = new WebSocket(this.config.url);

      // Connection timeout
      this.connectionTimeoutTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn(`Connection timeout for ${this.config.venue}`);
          this.ws.close();
          this.updateConnectionStatus(ERROR);
          this.notifyError('connection_timeout', `Connection to ${this.config.venue} timed out`);
        }
      }, this.config.connectionTimeout || 10000);

      this.ws.onopen = () => {
        console.log(`Connected to ${this.config.venue} WebSocket`);
        this.updateConnectionStatus(CONNECTED);
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
        this.clearConnectionTimeout();
        this.startHeartbeat();
        this.lastMessageTime = Date.now();
      };

      this.ws.onmessage = (event) => {
        try {
          this.lastMessageTime = Date.now();
          const data = JSON.parse(event.data);
          const orderBook = this.parseOrderBookData(data);
          this.notifyListeners(orderBook);
        } catch (error) {
          console.error(`Error parsing ${this.config.venue} message:`, error);
          this.notifyError('parse_error', `Failed to parse ${this.config.venue} message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`${this.config.venue} WebSocket closed:`, event.code, event.reason);
        this.updateConnectionStatus('disconnected');
        this.clearConnectionTimeout();
        this.clearHeartbeat();
        
        // Handle different close codes
        if (event.code === 1000 || event.code === 1001) {
          // Normal closure
          this.notifyError('connection_closed', `Connection to ${this.config.venue} closed normally`);
        } else if (event.code >= 4000 && event.code < 5000) {
          // Application-level errors
          this.notifyError('application_error', `Application error: ${event.reason}`);
        } else {
          // Network or protocol errors
          this.notifyError('network_error', `Network error: ${event.reason || 'Connection lost'}`);
        }
        
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error(`${this.config.venue} WebSocket error:`, error);
        this.updateConnectionStatus(ERROR);
        this.clearConnectionTimeout();
        this.notifyError('websocket_error', `WebSocket error for ${this.config.venue}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      };
    } catch (error) {
      console.error(`Failed to connect to ${this.config.venue}:`, error);
      this.updateConnectionStatus(ERROR);
      this.clearConnectionTimeout();
      this.notifyError('connection_failed', `Failed to connect to ${this.config.venue}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.clearConnectionTimeout();
    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateConnectionStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatInterval) {
      this.heartbeatTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const timeSinceLastMessage = Date.now() - this.lastMessageTime;
          if (timeSinceLastMessage > (this.config.heartbeatInterval || 30000) * 2) {
            console.warn(`No message from ${this.config.venue} for ${timeSinceLastMessage}ms, reconnecting...`);
            this.ws.close();
            this.notifyError('heartbeat_timeout', `No message received from ${this.config.venue} for ${timeSinceLastMessage}ms`);
          }
        }
      }, this.config.heartbeatInterval || 30000);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.error(`Max reconnect attempts reached for ${this.config.venue}`);
      this.updateConnectionStatus(ERROR);
      this.notifyError('max_reconnect_attempts', `Failed to connect to ${this.config.venue} after ${this.reconnectAttempts} attempts`);
      return;
    }

    this.reconnectAttempts++;
    const baseDelay = this.config.reconnectInterval || 5000;
    const maxDelay = this.config.maxReconnectDelay || 60000;
    const minDelay = this.config.minReconnectDelay || 1000;
    
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, this.reconnectAttempts - 1), maxDelay);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    const delay = Math.max(minDelay, exponentialDelay + jitter);

    console.warn(`Reconnecting to ${this.config.venue} in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private parseOrderBookData(data: any): OrderBook {
    // Parse WebSocket message format based on venue
    if (this.config.venue === 'polymarket') {
      return this.parsePolymarketData(data);
    } else {
      return this.parseKalshiData(data);
    }
  }

  private parsePolymarketData(data: any): OrderBook {
    try {
      // Handle different Polymarket WebSocket formats
      let bids: any[] = [];
      let asks: any[] = [];

      if (data.type === 'order_book' && data.data) {
        bids = data.data.bids || [];
        asks = data.data.asks || [];
      } else if (data.bids && data.asks) {
        bids = data.bids;
        asks = data.asks;
      } else if (Array.isArray(data)) {
        // Handle array format
        bids = data.filter((item: any) => item.side === BUY);
        asks = data.filter((item: any) => item.side === SELL);
      } else if (data.message && typeof data.message === 'string') {
        // Handle error messages
        console.warn('Polymarket WebSocket message:', data.message);
        return {
          bids: [],
          asks: [],
          lastUpdate: new Date(),
          venueStatus: {
            polymarket: ERROR,
            kalshi: this.config.venue === KALSHI ? CONNECTED : DISCONNECTED
          }
        };
      }

      // Validate and sanitize data
      const validBids = bids.filter((level: any) => 
        level && (level.price || level.rate) && (level.size || level.quantity)
      ).map((level: any) => ({
        price: Math.max(0, parseFloat(level.price || level.rate || 0)),
        size: Math.max(0, parseFloat(level.size || level.quantity || 0)),
        venue: POLYMARKET
      })).sort((a, b) => b.price - a.price);

      const validAsks = asks.filter((level: any) => 
        level && (level.price || level.rate) && (level.size || level.quantity)
      ).map((level: any) => ({
        price: Math.max(0, parseFloat(level.price || level.rate || 0)),
        size: Math.max(0, parseFloat(level.size || level.quantity || 0)),
        venue: POLYMARKET
      })).sort((a, b) => a.price - b.price);

      return {
        bids: validBids,
        asks: validAsks,
        lastUpdate: new Date(),
        venueStatus: {
          polymarket: CONNECTED,
          kalshi: this.config.venue === KALSHI ? CONNECTED : DISCONNECTED
        }
      };
    } catch (error) {
      console.error('Error parsing Polymarket data:', error);
      this.notifyError('parse_error', `Failed to parse Polymarket data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        bids: [],
        asks: [],
        lastUpdate: new Date(),
        venueStatus: {
          polymarket: ERROR,
          kalshi: this.config.venue === KALSHI ? CONNECTED : DISCONNECTED
        }
      };
    }
  }

  private parseKalshiData(data: any): OrderBook {
    // Handle different Kalshi WebSocket formats
    let bids: any[] = [];
    let asks: any[] = [];

    if (data.type === 'order_book' && data.data) {
      bids = data.data.bids || [];
      asks = data.data.asks || [];
    } else if (data.bids && data.asks) {
      bids = data.bids;
      asks = data.asks;
    } else if (Array.isArray(data)) {
      // Handle array format
      bids = data.filter((item: any) => item.side === BUY);
      asks = data.filter((item: any) => item.side === SELL);
    }

    return {
      bids: bids.map((level: any) => ({
        price: parseFloat(level.price || level.rate || 0),
        size: parseFloat(level.size || level.quantity || 0),
        venue: KALSHI
      })).sort((a, b) => b.price - a.price),
      asks: asks.map((level: any) => ({
        price: parseFloat(level.price || level.rate || 0),
        size: parseFloat(level.size || level.quantity || 0),
        venue: KALSHI
      })).sort((a, b) => a.price - b.price),
      lastUpdate: new Date(),
      venueStatus: {
        polymarket: this.config.venue === POLYMARKET ? CONNECTED : DISCONNECTED,
        kalshi: CONNECTED
      }
    };
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
  }

  private notifyListeners(orderBook: OrderBook): void {
    this.listeners.forEach(listener => {
      listener({ venue: this.config.venue, orderBook });
    });
  }

  onOrderBookUpdate(callback: (data: { venue: typeof POLYMARKET | typeof KALSHI; orderBook: OrderBook }) => void): void {
    this.listeners.push(callback);
  }

  onError(callback: (error: { type: string; message: string }) => void): void {
    this.errorListeners.push(callback);
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  private notifyError(type: string, message: string): void {
    const userFriendlyMessage = this.getUserFriendlyErrorMessage(type, message);
    this.errorListeners.forEach(listener => {
      listener({ type, message: userFriendlyMessage });
    });
  }

  private getUserFriendlyErrorMessage(type: string, technicalMessage: string): string {
    const errorMessages: Record<string, string> = {
      'connection_timeout': 'Connection timeout - please check your internet connection',
      'connection_failed': 'Failed to connect - the service may be temporarily unavailable',
      'max_reconnect_attempts': 'Unable to connect after multiple attempts - please try again later',
      'parse_error': 'Received invalid data from the exchange',
      'websocket_error': 'WebSocket connection error occurred',
      'heartbeat_timeout': 'Connection appears to be inactive - reconnecting',
      'network_error': 'Network connection lost - attempting to reconnect',
      'application_error': 'Exchange service error - please contact support if this persists'
    };
    
    return errorMessages[type] || technicalMessage;
  }

  // For testing purposes
  simulateConnectionIssue(): void {
    this.updateConnectionStatus(ERROR);
    if (this.ws) {
      this.ws.close();
    }
  }

  simulateReconnection(): void {
    this.reconnectAttempts = 0;
    this.connect();
  }
}