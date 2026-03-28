import { WebSocketService } from './websocketService';
import { OrderBookAggregator } from '../utils/orderBookAggregator';
import type { OrderBook, ConnectionStatus } from '../types/market';

export interface ConnectionManagerConfig {
  polymarketUrl: string;
  kalshiUrl: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOrderBookUpdate?: (orderBook: OrderBook) => void;
  onConnectionStatusChange?: (status: {
    polymarket: ConnectionStatus;
    kalshi: ConnectionStatus;
  }) => void;
}

export class ConnectionManager {
  private polymarketService: WebSocketService;
  private kalshiService: WebSocketService;
  private aggregator: OrderBookAggregator;
  private config: ConnectionManagerConfig;
  private isConnected = false;

  constructor(config: ConnectionManagerConfig) {
    this.config = config;
    this.aggregator = new OrderBookAggregator();
    
 this.polymarketService = new WebSocketService({
 url: config.polymarketUrl,
 venue: 'polymarket',
 reconnectInterval: config.reconnectInterval || 3000,
 maxReconnectAttempts: config.maxReconnectAttempts || 10,
 maxReconnectDelay: 60000,
 minReconnectDelay: 1000,
 connectionTimeout: 10000,
 heartbeatInterval: 30000
 });

 this.kalshiService = new WebSocketService({
 url: config.kalshiUrl,
 venue: 'kalshi',
 reconnectInterval: config.reconnectInterval || 3000,
 maxReconnectAttempts: config.maxReconnectAttempts || 10,
 maxReconnectDelay: 60000,
 minReconnectDelay: 1000,
 connectionTimeout: 10000,
 heartbeatInterval: 30000
 });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const handleOrderBookUpdate = (data: { venue: 'polymarket' | 'kalshi'; orderBook: OrderBook }) => {
      this.aggregator.updateOrderBook(data.venue, data.orderBook);
      const combinedOrderBook = this.aggregator.getCombinedOrderBook();
      
      if (this.config.onOrderBookUpdate) {
        this.config.onOrderBookUpdate(combinedOrderBook);
      }

      if (this.config.onConnectionStatusChange) {
        const venueStatus = this.aggregator.getVenueStatus();
        this.config.onConnectionStatusChange(venueStatus);
      }
    };

    this.polymarketService.onOrderBookUpdate(handleOrderBookUpdate);
    this.kalshiService.onOrderBookUpdate(handleOrderBookUpdate);
  }

  connect(): void {
    if (this.isConnected) {
      return;
    }

    console.log('Starting connection manager...');
    this.polymarketService.connect();
    this.kalshiService.connect();
    this.isConnected = true;
  }

  disconnect(): void {
    if (!this.isConnected) {
      return;
    }

    console.log('Stopping connection manager...');
    this.polymarketService.disconnect();
    this.kalshiService.disconnect();
    this.isConnected = false;
  }

  getConnectionStatus(): { polymarket: ConnectionStatus; kalshi: ConnectionStatus } {
    return {
      polymarket: this.polymarketService.getConnectionStatus(),
      kalshi: this.kalshiService.getConnectionStatus()
    };
  }

  simulateConnectionIssue(venue: 'polymarket' | 'kalshi'): void {
    if (venue === 'polymarket') {
      this.polymarketService.simulateConnectionIssue();
    } else {
      this.kalshiService.simulateConnectionIssue();
    }
  }

  simulateReconnection(venue: 'polymarket' | 'kalshi'): void {
    if (venue === 'polymarket') {
      this.polymarketService.simulateReconnection();
    } else {
      this.kalshiService.simulateReconnection();
    }
  }

  isHealthy(): boolean {
    const status = this.getConnectionStatus();
    return status.polymarket === 'connected' || status.kalshi === 'connected';
  }

  getConnectionSummary(): string {
    const status = this.getConnectionStatus();
    const polymarket = status.polymarket === 'connected' ? '✅' : 
                      status.polymarket === 'connecting' ? '🔄' : '❌';
    const kalshi = status.kalshi === 'connected' ? '✅' : 
                   status.kalshi === 'connecting' ? '🔄' : '❌';
    
    return `Polymarket: ${polymarket} | Kalshi: ${kalshi}`;
  }
}